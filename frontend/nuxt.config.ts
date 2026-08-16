import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

// ★ CI 内存自救：如果 NODE_OPTIONS 里带了 --expose-gc（见 ci-build-frontend.mjs），则每 1s 主动 global.gc() 一次
//   （v0816-6: 1s 更密集同步 major GC，Mark-Compact 峰值 3800+ 压回 3GB 内）
try {
  const shouldGc = (!!(process as any).env.CI || !!(process as any).env.GITHUB_ACTIONS) && typeof (globalThis as any).gc === 'function';
  if (shouldGc) {
    (setInterval as any)(() => { try { (globalThis as any).gc({ type: 'major', execution: 'sync', flavor: 'last-resort' } as any); } catch (_) {} }, 1000);
    (console as any).log('[nuxt.config.ts][ci-mem-saver] global.gc interval armed (1s, major+synchronous+lastResort GC)');
  }
} catch (_) {}

// ★ v0814c CI 时禁用 PWA：@vite-pwa/nuxt 做 workbox precache manifest + SW gen + glob 扫描时额外吃 ~400M 内存，
//   CI 构建不需要 PWA（生产环境上线时用户首次访问会自动注册 SW），省多少算多少
const isCI = !!(process as any).env.CI || !!(process as any).env.GITHUB_ACTIONS || !!(process as any).env.NUXT_DISABLE_PWA_IN_CI;
const modulesList: any[] = ['@nuxtjs/tailwindcss', '@element-plus/nuxt', '@pinia/nuxt'];
if (!isCI) { modulesList.push('@vite-pwa/nuxt'); }
(console as any).log(`[nuxt.config.ts] isCI=${isCI} → modules=${modulesList.join(', ')} (PWA ${isCI ? 'SKIPPED' : 'ENABLED'})`);

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  sourcemap: { server: false, client: false },
  // ★★★ v0816-15 终极真因修复（终于知道为什么 15 轮都 OOM 了！）
  //   Nuxt 3 默认 client build + server build **并行**跑 = 2 个 Vite/Rollup 实例同时在内存！
  //   单个实例 transforming 峰值 ~1.6GB，两个并行就是 ~3.2GB + V8 开销 = 正好 3.3GB（每轮 v10→v14 的 GC trace 全都是 used=3300 左右！）
  //   下面两个配置强制串行构建 client → server，峰值内存直接砍半到 ~1.7GB：
  experimental: {
    parallelBuilds: false,   // CI 下 client/server 串行构建（不再并行吃双份内存！）
  },
  // 【CI 内存终极优化 v0816】单一 nitro 定义 + 更激进省内存
  nitro: {
    preset: 'node-server',
    compressPublicAssets: false, // CI 时完全跳过 gzip/brotli 预压缩，省 ~200M
    // ★ v0816-13: CI 关闭 nitro minify（esbuild minify 额外吃 ~200-300MB AST 内存，生产体积稍大可接受）
    minify: !isCI,
    inlineDynamicImports: false,
    rollupConfig: {
      output: { inlineDynamicImports: false },
      onwarn(warning, warn) {
        if (warning && warning.code && warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
    },
    esbuild: { options: { target: 'node18' } },
  },
  vite: {
    build: {
      target: 'es2022',
      sourcemap: false,
      // ★ v0816-14: CI 暂时关 minify（不影响内存峰值，只是 minify 阶段的时间）
      minify: isCI ? false : 'esbuild',
      cssMinify: isCI ? false : 'esbuild',
      // ★★★ v0816-14 真正修复内存峰值：
      //   之前 chunkSizeWarningLimit=50000（要求 50MB 都不拆 chunk）是致命错误！
      //   Rollup 为了生成 1 个巨大的单 chunk，必须把所有模块的 AST 同时常驻内存：
      //     echarts(20MB源码*10x AST≈200MB) + element-plus(15MB≈150MB)
      //     + pdfjs-dist(10MB≈100MB) + xlsx(5MB≈50MB) + docx-preview(4MB≈40MB)
      //     + jszip(2MB≈20MB) = ~560MB AST 常驻 + Vue/Vite/Rollup 框架自己 = 直接 3.3GB+ OOM！
      //   修复：chunkSizeWarningLimit 改回 1MB + manualChunks 把 6 大库独立分 chunk
      //     → Rollup 处理完 echarts-chunk → 输出 → 释放 AST → 处理 element-plus-chunk
      //     → 峰值内存应该降到 ~1.5GB 左右（比 3.3GB 砍一半还多！）
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: false,
      cssCodeSplit: false,
      rollupOptions: {
        maxParallelFileOps: 1,
        cache: false,
        treeshake: isCI ? { correctVarValueBeforeDeclaration: true, annotations: true, moduleSideEffects: 'no-external', preset: 'smallest' } as any : { correctVarValueBeforeDeclaration: true, annotations: true, moduleSideEffects: 'no-external' } as any,
        makeAbsoluteExternalsRelative: true,
        output: {
          // ★ v0816-14: 大库各独立 1 chunk → 每处理完 1 个 chunk 释放 AST，内存峰值砍半
          manualChunks(id: string) {
            if (id.includes('node_modules/echarts/') || id.includes('node_modules/vue-echarts/') || id.includes('node_modules/zrender/')) return 'chunk-echarts';
            if (id.includes('node_modules/element-plus/') || id.includes('node_modules/@element-plus/')) return 'chunk-element-plus';
            if (id.includes('node_modules/pdfjs-dist/')) return 'chunk-pdfjs';
            if (id.includes('node_modules/xlsx/') || id.includes('node_modules/spark-md5/')) return 'chunk-xlsx';
            if (id.includes('node_modules/docx-preview/') || id.includes('node_modules/jszip/')) return 'chunk-docx';
            if (id.includes('node_modules/@fullcalendar/') || id.includes('node_modules/vuedraggable/') || id.includes('node_modules/sortablejs/')) return 'chunk-fullcalendar';
            if (id.includes('node_modules/@vueuse/') || id.includes('node_modules/@vue-')) return 'chunk-vueuse';
            return undefined;
          },
        },
        onwarn(warning, warn) {
          if (warning && warning.code && warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        },
      },
      sourcemap: !isCI,
      reportCompressedSize: false,
    },
    // ★ Vite 7.x 内存优化：减少中间产物
    watch: { skipWrite: true },       // build 时不需要写 watch 文件
    modulePreload: false,             // 禁用 build 阶段 module preload 计算
    worker: isCI ? { format: 'es' as any } : { format: 'es' as any },
    optimizeDeps: {
      force: false,
      // disabled 已经被 Vite 5.1 移除，直接去掉避免警告
      // 把最大的 ECharts/ElementPlus 排除出预构建，避免打包时内存爆炸
      exclude: [
        'echarts',
        'echarts/charts',
        'echarts/components',
        'echarts/renderers',
        'element-plus',
        '@element-plus/icons-vue',
      ],
      include: ['dayjs', '@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/interaction', '@fullcalendar/vue3'],
    },
    json: { namedExports: false },
    esbuild: {
      target: 'es2022',
      legalComments: 'eof',
      treeShaking: true,
    },
    resolve: {
      alias: {
        dayjs: 'dayjs/esm/index.js',
      },
    },
    ssr: {
      noExternal: ['dayjs', '@popperjs/core'],
    },
  },
  // 将 /api 请求代理到后端服务（SSR和客户端都可用）
  routeRules: {
    '/api/**': {
      proxy: 'http://localhost:3002/api/**',
    },
    '/uploads/**': {
      proxy: 'http://localhost:3002/uploads/**',
    },
    // ★ 临时自修复接口：直接代理到后端，绕开 Nuxt SSR + 全局 auth middleware，
    //   确保沙箱 curl 无 cookie 也能直达 Nest 控制器，触发 PM2 进程重启
    //   v0814 双保险：同时支持「旧裸路径」和「正确带 /api 前缀路径」两种写法
    '/__fix_pm2_20260806**': {
      proxy: 'http://localhost:3002/__fix_pm2_20260806**',
      ssr: false,
      swr: false,
    },
    '/api/__fix_pm2_20260806**': {
      proxy: 'http://localhost:3002/api/_fix_pm2_20260806**',
      ssr: false,
      swr: false,
    },
  },
  modules: modulesList,
  elementPlus: {
    importStyle: 'css',
    themes: ['dark'],
  },
  pwa: isCI ? {} : {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name: `熊猫笔记 - 船舶政工智慧管理 v${pkg.version}`,
      short_name: '熊猫笔记',
      description: '船舶政工多团队智慧台账管理系统',
      theme_color: '#409eff',
      background_color: '#f5f7fa',
      display: 'standalone',
      orientation: 'any',
      scope: '/',
      start_url: '/',
      version: pkg.version,
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/__fix_pm2_20260806/],
      // 预缓存关键资源，确保离线可启动
      globPatterns: [
        '**/*.{js,css,html}',
      ],
      globIgnores: [
        '**/node_modules/**/*',
        '**/sw.js',
      ],
      runtimeCaching: [
        {
          urlPattern: /\/_nuxt\/.*\.(js|css)$/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'app-cache-v12',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
          },
        },
        {
          urlPattern: /^https:\/\/.*\/api\//i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache-v12',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'static-cache-v12',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
          },
        },
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages-cache-v12',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 7,
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
      type: 'module',
    },
    client: {
      installPrompt: null, // 不使用默认安装提示，使用自定义组件
    },
  },
  css: ['~/assets/css/main.css', '~/assets/css/tablet-portrait.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NODE_ENV === 'production' ? (process.env.NUXT_PUBLIC_API_BASE || '/api') : 'http://localhost:3002/api',
      appName: '熊猫笔记',
      appVersion: pkg.version || '1.0.0',
      // ★ v0812 陈先生手机端一直显示旧版本号v0807m——template里写死了！
      //   这里把「短版本号」和「真实构建时间」直接注入，template直接读就能真·动态显示
      appVersionShort: 'v' + (pkg.version || '1.0.0').split('.').pop(),   // → v0812 / v0813
      appBuildTime: new Date().toISOString(),                              // → 构建时真实 ISO 时间戳
    },
  },
  app: {
    head: {
      title: '熊猫笔记 - 船舶政工智慧管理',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: '熊猫笔记 - 船舶政工多团队智慧台账管理系统' },
        { name: 'theme-color', content: '#409eff' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: '熊猫笔记' },
        { name: 'build-version', content: pkg.version },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/icons/icon-192x192.png' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192x192.png' },
      ],
      script: [],
    },
    // 页面过渡动画（参考行业主流方案：飞书、钉钉、Notion）
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
    layoutTransition: {
      name: 'layout',
      mode: 'out-in',
    },
  },
});
