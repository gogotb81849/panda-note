/**
 * 设备自动检测 composable
 * 
 * 使用行业主流库 ua-parser-js 进行设备类型检测
 * 周下载量2200万+，是行业标准方案
 * 
 * 检测逻辑：
 * 1. ua-parser-js 通过 getDevice().type 返回 mobile/tablet/smarttv/wearable/embedded
 * 2. 如果 type 为 undefined，说明 UA 中没有移动设备特征，判定为桌面端
 * 3. 屏幕尺寸作为辅助判断（部分平板浏览器桌面模式下 UA 伪装为桌面端）
 * 
 * 参考：https://docs.uaparser.dev
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import UAParser from 'ua-parser-js'

export type DeviceType = 'desktop' | 'tablet' | 'phone'
export type Orientation = 'landscape' | 'portrait'

const deviceType = ref<DeviceType>('desktop')
const orientation = ref<Orientation>('landscape')
const detected = ref(false)

/**
 * 使用 ua-parser-js 检测设备类型
 * 
 * ua-parser-js 的 device.type 可能返回值：
 * - 'mobile' → 手机
 * - 'tablet' → 平板
 * - 'smarttv' / 'wearable' / 'embedded' → 归类为桌面端（非移动触控设备）
 * - undefined → 桌面端（UA 中无移动设备特征）
 * 
 * 辅助判断：部分平板浏览器在"桌面模式"下 UA 伪装为桌面端，
 * 此时通过屏幕尺寸判断：短边 <= 900px 很可能是平板
 */
function detectDeviceType(): DeviceType {
  if (!process.client) return 'desktop'

  const parser = new UAParser()
  const result = parser.getResult()
  const deviceType = result.device.type

  // ua-parser-js 明确识别为平板
  if (deviceType === 'tablet') {
    return 'tablet'
  }

  // ua-parser-js 识别为 mobile，但需结合屏幕尺寸判断
  // 有些支持通话的平板（如华为 MatePad Mini）UA 中含 Mobile，会被识别为 mobile
  // 行业经验：屏幕短边 > 600px 的移动设备按平板处理
  if (deviceType === 'mobile') {
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const minDimension = Math.min(screenWidth, screenHeight)
    if (minDimension > 600) {
      return 'tablet'
    }
    return 'phone'
  }

  // 智能电视、可穿戴设备等归类为桌面端
  if (deviceType === 'smarttv' || deviceType === 'wearable' || deviceType === 'embedded') {
    return 'desktop'
  }

  // ua-parser-js 未识别出移动设备类型（type 为 undefined）
  // 此时通过屏幕尺寸辅助判断（处理平板浏览器桌面模式的情况）
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const minDimension = Math.min(screenWidth, screenHeight)
  if (minDimension <= 900) {
    return 'tablet'
  }

  // 默认桌面端
  return 'desktop'
}

/**
 * 判断屏幕方向
 */
function detectOrientation(): Orientation {
  if (process.client) {
    if (screen.orientation && screen.orientation.type) {
      return screen.orientation.type.includes('landscape') ? 'landscape' : 'portrait'
    }
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }
  return 'landscape'
}

/**
 * 更新设备信息并应用 CSS 类
 */
function updateDeviceInfo() {
  deviceType.value = detectDeviceType()
  orientation.value = detectOrientation()
  detected.value = true

  if (process.client) {
    const root = document.documentElement

    root.classList.remove('device-phone', 'device-tablet', 'device-desktop')
    root.classList.add(`device-${deviceType.value}`)

    root.classList.remove('orientation-landscape', 'orientation-portrait')
    root.classList.add(`orientation-${orientation.value}`)
  }
}

/**
 * 处理设备自动检测的 composable
 */
export function useDeviceDetection() {
  let orientationMediaQuery: MediaQueryList | null = null

  onMounted(() => {
    updateDeviceInfo()

    window.addEventListener('resize', updateDeviceInfo)

    if (screen.orientation) {
      orientationMediaQuery = screen.orientation
      screen.orientation.addEventListener('change', updateDeviceInfo)
    }

    const portraitQuery = window.matchMedia('(orientation: portrait)')
    const landscapeQuery = window.matchMedia('(orientation: landscape)')
    portraitQuery.addEventListener('change', updateDeviceInfo)
    landscapeQuery.addEventListener('change', updateDeviceInfo)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateDeviceInfo)
    if (screen.orientation && orientationMediaQuery) {
      screen.orientation.removeEventListener('change', updateDeviceInfo)
    }
    const portraitQuery = window.matchMedia('(orientation: portrait)')
    const landscapeQuery = window.matchMedia('(orientation: landscape)')
    portraitQuery.removeEventListener('change', updateDeviceInfo)
    landscapeQuery.removeEventListener('change', updateDeviceInfo)
  })

  const isPhone = computed(() => deviceType.value === 'phone')
  const isTablet = computed(() => deviceType.value === 'tablet')
  const isDesktop = computed(() => deviceType.value === 'desktop')
  const isLandscape = computed(() => orientation.value === 'landscape')
  const isPortrait = computed(() => orientation.value === 'portrait')

  const isAutoMode = computed(() => isPhone.value || isTablet.value)

  return {
    deviceType,
    orientation,
    detected,
    isPhone,
    isTablet,
    isDesktop,
    isLandscape,
    isPortrait,
    isAutoMode,
    updateDeviceInfo,
  }
}
