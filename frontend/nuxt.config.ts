import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

// // ====== v10-v20 旧版配置（已全部注释掉，运行成功后删除）========================================
// // ★ CI 内存自救：如果 NODE_OPTIONS 里带了 --expose-gc（见 ci-build-frontend.mjs），则每 1s 主动 global.gc() 一次
// //   （v0816-6: 1s 更密集同步 major GC，Mark-Compact 峰值 3800+ 压回 3GB 内）
// try {
//   const shouldGc = (!!(process as any).env.CI || !!(process as any).env.GITHUB_ACTIONS) && typeof (globalThis as any).gc === 'function';
//   if (shouldGc) {
//     (setInterval as any)(() => { try { (globalThis as any).gc({ type: 'major', execution: 'sync', flavor: 'last-resort' } as any); } catch (_) {} }, 1000);
//     (console as any).log('[nuxt.config.ts][ci-mem-saver] global.gc interval armed (1s, major+synchronous+lastResort GC)');
//   }
// } catch (_) {}
// // ====== 以上全部注释掉 =========================================================================

// ★ CI 时禁用 PWA（@vite-pwa/nuxt 做 SW gen 时额外吃内存，CI 构建不需要 PWA）
const isCI = !!(process as any).env.CI || !!(process as any).env.GITHUB_ACTIONS || !!(process as any).env.NUXT_DISABLE_PWA_IN_CI;
const modulesList: any[] = ['@nuxtjs/tailwindcss', '@element-plus/nuxt', '@pinia/nuxt'];
if (!isCI) { modulesList.push('@vite-pwa/nuxt'); }
(console as any).log(`[nuxt.config.ts] isCI=${isCI} → modules=${modulesList.join(', ')} (PWA ${isCI ? 'SKIPPED' : 'ENABLED'})`);

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  sourcemap: { server: false, client: false },

  // // ====== v10-v20 旧版配置（已全部注释掉，运行成功后删除）======================================
  // // ★★★ v0816-15 终极真因修复（parallelBuilds=false）
  // experimental: {
  //   parallelBuilds: false,
  // },
  // nitro: {
  //   preset: 'node-server',
  //   compressPublicAssets: false,
  //   minify: !isCI,
  //   inlineDynamicImports: false,
  //   rollupConfig: {
  //     output: { inlineDynamicImports: false },
  //     onwarn(warning, warn) {
  //       if (warning && warning.code && warning.code === 'CIRCULAR_DEPENDENCY') return;
  //       warn(warning);
  //     },
  //   },
  //   esbuild: { options: { target: 'node18' } },
  // },
  // // ====== 以上全部注释掉 =======================================================================
  // ★ v21 干净版 nitro：只用默认值
  nitro: {
    preset: 'node-server',
  },

  // // ====== v10-v20 旧版配置（已全部注释掉，运行成功后删除）======================================
  // vite: {
  //   build: {
  //     target: 'es2022',
  //     sourcemap: false,
  //     minify: isCI ? false : 'esbuild',
  //     cssMinify: isCI ? false : 'esbuild',
  //     chunkSizeWarningLimit: 1000,
  //     reportCompressedSize: false,
  //     cssCodeSplit: false,
  //     rollupOptions: {
  //       maxParallelFileOps: 1,
  //       cache: false,
  //       treeshake: isCI ? { correctVarValueBeforeDeclaration: true, annotations: true, moduleSideEffects: 'no-external', preset: 'smallest' } as any : { correctVarValueBeforeDeclaration: true, annotations: true, moduleSideEffects: 'no-external' } as any,
  //       makeAbsoluteExternalsRelative: true,
  //       output: {
  //         manualChunks(id: string) {
  //           if (id.includes('node_modules/echarts/') || id.includes('node_modules/vue-echarts/') || id.includes('node_modules/zrender/')) return 'chunk-echarts';
  //           if (id.includes('node_modules/element-plus/') || id.includes('node_modules/@element-plus/')) return 'chunk-element-plus';
  //           if (id.includes('node_modules/pdfjs-dist/')) return 'chunk-pdfjs';
  //           if (id.includes('node_modules/xlsx/') || id.includes('node_modules/spark-md5/')) return 'chunk-xlsx';
  //           if (id.includes('node_modules/docx-preview/') || id.includes('node_modules/jszip/')) return 'chunk-docx';
  //           if (id.includes('node_modules/@fullcalendar/') || id.includes('node_modules/vuedraggable/') || id.includes('node_modules/sortablejs/')) return 'chunk-fullcalendar';
  //           if (id.includes('node_modules/@vueuse/') || id.includes('node_modules/@vue-')) return 'chunk-vueuse';
  //           return undefined;
  //         },
  //       },
  //       onwarn(warning, warn) {
  //         if (warning && warning.code && warning.code === 'CIRCULAR_DEPENDENCY') return;
  //         warn(warning);
  //       },
  //     },
  //     sourcemap: !isCI,
  //     reportCompressedSize: false,
  //   },
  //   watch: { skipWrite: true },
  //   modulePreload: false,
  //   worker: isCI ? { format: 'es' as any } : { format: 'es' as any },
  //   optimizeDeps: {
  //     force: false,
  //     exclude: [
  //       'echarts',
  //       'echarts/charts',
  //       'echarts/components',
  //       'echarts/renderers',
  //       'element-plus',
  //       '@element-plus/icons-vue',
  //     ],
  //     include: ['dayjs', '@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/interaction', '@fullcalendar/vue3'],
  //   },
  //   json: { namedExports: false },
  //   esbuild: {
  //     target: 'es2022',
  //     legalComments: 'eof',
  //     treeShaking: true,
  //   },
  //   resolve: {
  //     alias: {
  //       dayjs: 'dayjs/esm/index.js',
  //     },
  //   },
  //   ssr: {
  //     noExternal: ['dayjs', '@popperjs/core'],
  //   },
  // },
  // // ====== 以上全部注释掉 =======================================================================
  // ★ v21 干净版 vite：只用默认值
  vite: {
    build: {
      sourcemap: false,
    },
  },

  // 代理到后端服务（SSR和客户端都可用）
  routeRules: {
    '/api/**': {
      proxy: 'http://localhost:3002/api/**',
    },
    '/uploads/**': {
      proxy: 'http://localhost:3002/uploads/**',
    },
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
      installPrompt: null,
    },
  },
  css: ['~/assets/css/main.css', '~/assets/css/tablet-portrait.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NODE_ENV === 'production' ? (process.env.NUXT_PUBLIC_API_BASE || '/api') : 'http://localhost:3002/api',
      appName: '熊猫笔记',
      appVersion: pkg.version || '1.0.0',
      appVersionShort: 'v' + (pkg.version || '1.0.0').split('.').pop(),
      appBuildTime: new Date().toISOString(),
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
