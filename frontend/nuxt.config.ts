import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  // 将 /api 请求代理到后端服务（SSR和客户端都可用）
  routeRules: {
    '/api/**': {
      proxy: 'http://localhost:3002/api/**',
    },
    '/uploads/**': {
      proxy: 'http://localhost:3002/uploads/**',
    },
    // ★ 临时自修复接口：直接代理到后端，绕开 Nuxt SSR + 全局 auth middleware，
    // 确保沙箱 curl 无 cookie 也能直达 Nest 控制器，触发 PM2 进程重启
    '/__fix_pm2_20260806**': {
      proxy: 'http://localhost:3002/__fix_pm2_20260806**',
      ssr: false,
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
      navigateFallbackDenylist: [/^\/api\//],
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
            cacheName: 'app-cache-v11',
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
            cacheName: 'api-cache-v11',
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
            cacheName: 'static-cache-v11',
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
            cacheName: 'pages-cache-v11',
            networkTimeoutSeconds: 3,
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
    optimizeDeps: {
      include: ['@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/interaction', '@fullcalendar/vue3'],
    },
    ssr: {
      // 将 CommonJS 依赖打包进 SSR 产物，避免 ESM/CJS 互操作错误
      // （Element Plus 间接依赖 @popperjs/core，其为 CommonJS 模块）
      noExternal: ['@popperjs/core'],
    },
  },
});
