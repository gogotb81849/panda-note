import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

// ★ CI 内存自救：如果 NODE_OPTIONS 里带了 --expose-gc（见 .npmrc），则每 45s 主动 global.gc() 一次，
// 避免 Nuxt/Vite/Rollup 在 ~4.5G 左右 AST 老年代堆积触发 Mark-Compact 扫全堆（Run#141-145 峰值≈4.8G）。
// 只有在 process.env.CI || process.env.GITHUB_ACTIONS 里才开启，本地 dev 不跑。
try {
  const shouldGc = (!!(process as any).env.CI || !!(process as any).env.GITHUB_ACTIONS) && typeof (globalThis as any).gc === 'function';
  if (shouldGc) {
    (setInterval as any)(() => { try { (globalThis as any).gc(); } catch (_) {} }, 45000);
    (console as any).log('[nuxt.config.ts][ci-mem-saver] global.gc interval armed (45s)');
  }
} catch (_) {}

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  sourcemap: { server: false, client: false },
  // 【CI 内存终极优化 v0814b】单一 nitro 定义（之前重复定义两次，后者覆盖前者，造成歧义）
  nitro: {
    preset: 'node-server',
    compressPublicAssets: { gzip: true, brotli: false },
    minify: true,
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
      // 策略：V8 堆限死 4GB（见 .npmrc + ci-build-frontend.mjs），配合 esbuild 单线程压缩，
      //   预期 RSS ≈ 4G + ~500M ≈ 4.5G，7GB runner 绝对安全
      target: 'es2022',
      sourcemap: false,
      minify: 'esbuild',              // ★ 替代 terser：内存 3G→600M
      cssMinify: 'esbuild',
      chunkSizeWarningLimit: 10000,     // 尽量少拆 chunk，减少 Rollup AST 节点数
      reportCompressedSize: false,     // 跳过 gzip 预计算（省 CPU 和内存）
      rollupOptions: {
        maxParallelFileOps: 1,         // ★ v0814b 从 2 → 1：完全串行，避免 OOM
        cache: false,
        onwarn(warning, warn) {
          if (warning && warning.code && warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        },
      },
    },
    worker: { format: 'es' },
    optimizeDeps: {
      force: false,
      disabled: false,
      // 把最大的 ECharts/ElementPlus 排除出预构建，避免打包时内存爆炸
      exclude: [
        'echarts',
        'echarts/charts',
        'echarts/components',
        'echarts/renderers',
        'element-plus',
        '@element-plus/icons-vue',
      ],
    },
    json: { namedExports: false },
    esbuild: {
      target: 'es2022',
      legalComments: 'eof',
      treeShaking: true,
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
  modules: [
    '@nuxtjs/tailwindcss',
    '@element-plus/nuxt',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
  ],
  elementPlus: {
    importStyle: 'css',
    themes: ['dark'],
  },
  pwa: {
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
  vite: {
    resolve: {
      alias: {
        // element-plus Nuxt 模块客户端会 `import "dayjs"`（通过 .nuxt/dist 自动注入），
        // dayjs 包的 main=dayjs.min.js 没有 ESM default 导出，导致浏览器报：
        //   "does not provide an export named 'default'"
        // 这里强制把 dayjs 指向真正的 ESM 入口，确保 SSR 与客户端一致
        dayjs: 'dayjs/esm/index.js',
      },
    },
    optimizeDeps: {
      include: ['dayjs', '@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/interaction', '@fullcalendar/vue3'],
    },
    ssr: {
      // 将 CommonJS / ESM 异常依赖打包进 SSR 产物，避免 ESM/CJS 互操作错误
      noExternal: ['dayjs', '@popperjs/core'],
    },
  },
});
