/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#409eff', light: '#79bbff', dark: '#337ecc' },
        success: { DEFAULT: '#67c23a', light: '#95d475', dark: '#529b2e' },
        warning: { DEFAULT: '#e6a23c', light: '#eebe77', dark: '#b88230' },
        danger: { DEFAULT: '#f56c6c', light: '#f89898', dark: '#c45656' },
        info: { DEFAULT: '#909399', light: '#b1b3b8', dark: '#73767a' },
        gray: { 100: '#f5f7fa', 200: '#ebeef5', 300: '#dcdfe6', 400: '#c0c4cc', 500: '#909399', 600: '#606266', 700: '#303133' }
      }
    },
  },
  plugins: [],
};
