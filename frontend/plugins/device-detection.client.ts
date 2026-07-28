/**
 * 客户端设备检测插件
 * 在应用挂载时自动检测设备类型并应用对应的 CSS 类
 */
export default defineNuxtPlugin(() => {
  if (process.client) {
    const root = document.documentElement

    // 检测函数
    const detectAndApply = () => {
      const width = window.innerWidth
      const ua = navigator.userAgent
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)

      // 移除旧类
      root.classList.remove('device-phone', 'device-tablet', 'device-desktop',
        'orientation-portrait', 'orientation-landscape')

      // 判断方向
      const isPortrait = window.innerHeight > window.innerWidth
      root.classList.add(isPortrait ? 'orientation-portrait' : 'orientation-landscape')

      // 判断设备
      let deviceClass = 'device-desktop'
      if (isMobileUA || width < 1024) {
        if (width < 480 || (isPortrait && width < 768 && window.innerHeight / width > 1.5)) {
          deviceClass = 'device-phone'
        } else {
          deviceClass = 'device-tablet'
        }
      }
      root.classList.add(deviceClass)
    }

    // 初始化
    detectAndApply()

    // 监听 resize（包括旋转）
    let resizeTimer: ReturnType<typeof setTimeout>
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(detectAndApply, 50)
    })

    // 监听屏幕方向变化
    if (screen.orientation) {
      screen.orientation.addEventListener('change', detectAndApply)
    }
  }
})
