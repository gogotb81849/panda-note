<template>
  <div class="toolbox-container">
    <div class="toolbox-header">
      <h2>🧰 工具箱</h2>
      <p>常用小工具，提高工作效率</p>
    </div>
    
    <div class="tools-grid">
      <!-- PDF压缩工具 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="showPdfCompressor = true">
        <div class="tool-content">
          <div class="tool-icon">📄</div>
          <h3>PDF压缩</h3>
          <p>智能双轨压缩，自动选择最优方案</p>
          <el-button type="primary" class="tool-btn">立即使用</el-button>
        </div>
      </el-card>
      
      <!-- 图片压缩工具 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="showImageCompressor = true">
        <div class="tool-content">
          <div class="tool-icon">🖼️</div>
          <h3>图片压缩</h3>
          <p>快速压缩图片，节省存储空间</p>
          <el-button type="primary" class="tool-btn">立即使用</el-button>
        </div>
      </el-card>
      
      <!-- 杂志编排 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openMagazine">
        <div class="tool-content">
          <div class="tool-icon">📖</div>
          <h3>杂志编排</h3>
          <p>创建杂志、编排文章、生成PDF</p>
          <el-button type="primary" class="tool-btn">打开杂志编排</el-button>
        </div>
      </el-card>
      
      <!-- 便利贴 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openStickyNote">
        <div class="tool-content">
          <div class="tool-icon">📝</div>
          <h3>便利贴</h3>
          <p>快速记录灵感，不丢想法</p>
          <el-button type="primary" class="tool-btn">打开便利贴</el-button>
        </div>
      </el-card>
      
      <!-- 屏保时钟 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openScreensaver">
        <div class="tool-content">
          <div class="tool-icon">🕐</div>
          <h3>屏保时钟</h3>
          <p>船舶休息时显示时钟和日程</p>
          <el-button type="primary" class="tool-btn">打开时钟</el-button>
        </div>
      </el-card>
      
      <!-- 船名达人 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openShipQuiz">
        <div class="tool-content">
          <div class="tool-icon">🚢</div>
          <h3>船名达人</h3>
          <p>船舶知识记忆训练，间隔重复学习</p>
          <el-button type="primary" class="tool-btn">开始训练</el-button>
        </div>
      </el-card>

      <!-- 政工笔 · AI 智能写作（船舶政工写作专家系统） -->
      <el-card class="tool-card tool-card-highlight cursor-pointer hover:shadow-lg transition-shadow" @click="openAiManuscript">
        <div class="tool-content">
          <div class="tool-icon">✍️</div>
          <h3>政工笔 · AI 智能写作</h3>
          <p>通讯/简报/人物稿/散文/总结：10 步结构化填表 → 出一篇集团录用规范、去 AI 化 ≤15% 的成品稿</p>
          <el-button type="warning" class="tool-btn">进入政工笔</el-button>
        </div>
      </el-card>
    </div>
    
    <!-- PDF压缩对话框 -->
    <PdfCompressorDialog v-model="showPdfCompressor" />
    
    <!-- 图片压缩对话框 -->
    <ImageCompressorDialog v-model="showImageCompressor" />
    
    <!-- 便利贴 (可打开多个) -->
    <StickyNote 
      v-for="note in stickyNotes" 
      :key="note.id" 
      :id="note.id"
      @close="closeStickyNote(note.id)"
    />
    
    <!-- 屏保时钟 -->
    <ScreenSaver v-if="showScreenSaver" @close="showScreenSaver = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, isNavigationFailure } from 'vue-router'
// ⚠️ 注意：vue-router@4.x 并没有命名导出 NavigationFailureType（之前我误写加进去了）
//  这个错误导入会在 SSR/部分打包场景触发 "Object prototype may only be an Object or null: undefined"
//  ——因为导入的符号是 undefined，TS/打包器的 type helper 会在原型链处理时炸锅，
//  导致整个页面 script setup 在挂载时就崩了（就是陈先生看到的一整排红色"系统错误:…undefined"）。
//  所以只保留真实存在的 useRouter 和 isNavigationFailure；type 编号直接按 1~4 硬编码字符串解释。
import { ElMessage } from 'element-plus'

const DEBUG_TAG = '[政工笔-调试]'
// ⚠️ 顶层所有声明都要"绝不抛异常"。
//  之前错加 NavigationFailureType 这个不存在的命名导出，直接导致 script setup 阶段原型链报错，
//  连按钮 @click 绑定都做不了。所以 FAILURE_TYPE_LABEL 用 try 定义、isNavigationFailure 也用 try 存下来。
let FAILURE_TYPE_LABEL: Readonly<Record<number, string>> = Object.freeze({
  1: 'NAVIGATION_ABORTED   (某个守卫 return false/调用 abortNavigation()，导航被主动取消)',
  2: 'NAVIGATION_CANCELLED (在本次导航完成前又触发了新导航，当前这次被后者覆盖掉)',
  3: 'NAVIGATION_DUPLICATED (目标路由就是当前路由，push() 什么都没做就"完成"了)',
  4: 'NAVIGATION_REDIRECTED (守卫里 return navigateTo / throw redirect，被重定向到其它路由)',
} as const)
try {
  // Object.freeze 已经返回 Readonly 了，但某些老 TS target 下 Record<> 会被包装成 type helper。
  // 这里二次确认 FAILURE_TYPE_LABEL 真的可访问，避免未来再出现原型链炸弹。
  const _t = FAILURE_TYPE_LABEL[1] + FAILURE_TYPE_LABEL[2] + FAILURE_TYPE_LABEL[3] + FAILURE_TYPE_LABEL[4]
  if (typeof _t !== 'string') throw new Error('FAILURE_TYPE_LABEL 内容不是字符串')
} catch (e: any) {
  try { console.warn(`${DEBUG_TAG} FAILURE_TYPE_LABEL 初始化失败（忽略，使用兜底对象）: ${e?.message || e}`) } catch { /* ignore */ }
  // 兜底：用最简单的 {} 做一个不可能触发原型链报错的映射
  FAILURE_TYPE_LABEL = Object.freeze({
    1: 'NAVIGATION_ABORTED', 2: 'NAVIGATION_CANCELLED', 3: 'NAVIGATION_DUPLICATED', 4: 'NAVIGATION_REDIRECTED',
  })
}

// 把 isNavigationFailure 存到一个局部变量，包 typeof 检查，万一未来打包时没导出也不会崩
const _safeIsNavFailure: ((x: any) => boolean) | undefined = (() => {
  try {
    if (typeof isNavigationFailure === 'function') return (x: any) => {
      try { return (isNavigationFailure as any)(x) } catch { return false }
    }
    return undefined
  } catch { return undefined }
})()

const authStore = (() => {
  try { return useAuthStore() } catch (e: any) {
    try { console.error(`${DEBUG_TAG} useAuthStore() 调用失败，降级为空对象: ${e?.message || e}`) } catch { /* ignore */ }
    // 兜底：返回一个最小可用的假 store，至少不会让按钮绑定崩
    return { isAuthenticated: false, token: '', user: null } as any
  }
})()
const router = (() => {
  try { return useRouter() } catch (e: any) {
    try { console.error(`${DEBUG_TAG} useRouter() 调用失败！: ${e?.message || e}`) } catch { /* ignore */ }
    throw e  // useRouter 都拿不到就没救了，直接抛
  }
})()

/**
 * 检查 router.push() 返回值是否为 NavigationFailure。
 * Vue Router 4 大坑："导航被取消/重定向/重复"不会 reject promise，
 * 而是 resolve 成一个 failure 对象，不判断就会把失败当成功弹 toast。
 */
function inspectNavResult(res: any, target: string): { ok: boolean; detail: string } {
  try {
    if (res == null || typeof res !== 'object') {
      return { ok: true, detail: 'result=null/undefined（Vue Router < 4.x 风格，视为成功）' }
    }
    if (_safeIsNavFailure) {
      try {
        const isF = _safeIsNavFailure(res)
        if (!isF) {
          return { ok: true, detail: `非 NavigationFailure，res.normalizedPath=${(res as any)?.normalizedPath ?? 'N/A'}（成功到达目标）` }
        }
      } catch (e2: any) {
        try { console.warn(`${DEBUG_TAG} _safeIsNavFailure 调错，降级判断: ${e2?.message || e2}`) } catch {/* ignore */}
      }
    }
    // 没装 helper 或 helper 本身抛错 → 降级：判断是否像 NavigationFailure（有 type/to/from）
    const hasFailureShape = typeof (res as any).type === 'number' && (res as any).to && (res as any).from
    if (!hasFailureShape) {
      return { ok: true, detail: `(降级) 不像是 NavigationFailure，返回成功` }
    }
    const typeNum: number = ((res as any).type ?? 0) as number
    const label = FAILURE_TYPE_LABEL[typeNum] || `UNKNOWN_FAILURE(type=${typeNum})`
    const safeStr = (v: any) => {
      try { return JSON.stringify(v, (k, val) => k === 'matched' ? `[${((val as any[])?.length ?? 0)}条]` : val) } catch { return String(v) }
    }
    const detail = `${label}\n  to=${safeStr((res as any).to)}\n  from=${safeStr((res as any).from)}\n  target=${target}`
    return { ok: false, detail }
  } catch (e: any) {
    try { console.warn(`${DEBUG_TAG} inspectNavResult 内部抛错（忽略，当作成功）: ${e?.message || e}`) } catch {/* ignore */}
    return { ok: true, detail: `inspectNavResult 自检异常，降级为成功` }
  }
}

// ====== 进入工具箱页时打印基础状态（帮助定位：是未登录/无token导致的无反应吗？）======
// ⚠️ 挂载逻辑整块 try-catch：任何新代码在这里抛错都不要再把整个页面弄挂（上次 NavigationFailureType
//  错误导入导致的 "Object prototype…undefined" 就是典型 script setup 阶段致命异常，按钮 handler 全不绑定）。
onMounted(() => {
  try {
    const s: Record<string, any> = {
      path: (window && window.location && window.location.pathname) || '(n/a)',
      href: (window && window.location && window.location.href) || '(n/a)',
      isAuthenticated: !!(authStore && authStore.isAuthenticated),
      tokenLen: (authStore && authStore.token && authStore.token.length) ?? 0,
      userRole: (authStore && authStore.user && authStore.user.role) ?? null,
      user: (authStore && authStore.user)
        ? { id: authStore.user.id, username: authStore.user.username, role: authStore.user.role }
        : null,
      localStorageHasToken: false,
      localStorageHasUser: false,
      ua: (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.length) || 0,
    }
    try {
      s.localStorageHasToken = !!localStorage.getItem('auth_token')
      s.localStorageHasUser = !!localStorage.getItem('auth_user')
    } catch { /* ignore */ }
    console.log(`${DEBUG_TAG} 工具箱页已挂载，基础状态：`, s)
  } catch (e: any) {
    // 挂载本身也能炸？兜底——不让工具箱页彻底崩。用户看到这个 warning 至少还能操作按钮。
    try {
      console.error(`${DEBUG_TAG} ❌ onMounted 本身挂载阶段抛错（已 try-catch 兜底不影响按钮绑定）:`, e?.message || e, e)
    } catch { /* double ignore */ }
    try {
      ElMessage.warning(`工具箱挂载阶段有异常：${e?.message || String(e)}  （已兜底，按钮仍可点击）`, { duration: 10000 })
    } catch { /* ignore */ }
  }
})

const showPdfCompressor = ref(false)
const showImageCompressor = ref(false)
const showScreenSaver = ref(false)

interface StickyNoteData {
  id: string
}

const stickyNotes = ref<StickyNoteData[]>([])
let noteCounter = 0

const openStickyNote = () => {
  const id = `sticky-${++noteCounter}-${Date.now()}`
  stickyNotes.value.push({ id })
}

const closeStickyNote = (id: string) => {
  const idx = stickyNotes.value.findIndex(n => n.id === id)
  if (idx >= 0) {
    stickyNotes.value.splice(idx, 1)
  }
}

const openScreensaver = () => {
  showScreenSaver.value = true
}

const openMagazine = () => {
  router.push('/magazine')
}

const openShipQuiz = () => {
  router.push('/training/ship-quiz')
}

const openAiManuscript = async () => {
  const t0 = Date.now()
  console.log(`${DEBUG_TAG} ① 点击政工笔卡片，准备跳转 /toolbox/ai-manuscript，ts=${t0}`)

  // 1) 事前校验：登录状态 + token 长度
  try {
    console.log(`${DEBUG_TAG} ② 事前检查 → isAuthenticated=${authStore.isAuthenticated},  userRole=${authStore.user?.role ?? 'null'},  tokenLength=${authStore.token?.length ?? 0}`)
    if (!authStore.isAuthenticated) {
      console.warn(`${DEBUG_TAG} ②-1 未登录，按中间件规则应跳 /login，但这里先发预警。尝试直接跳登录页。`)
      ElMessage.warning('当前未登录，正在跳转到登录页...（如果没有跳转请手动点登录）')
      try {
        await router.push('/login')
      } catch (e2: any) {
        console.error(`${DEBUG_TAG} ②-2 跳登录页也失败了：`, e2?.message || e2, e2)
        ElMessage.error(`跳登录页失败：${e2?.message || String(e2)}`)
      }
      return
    }
  } catch (ePre: any) {
    console.error(`${DEBUG_TAG} 异常：事前校验阶段抛错 → `, ePre?.message || ePre, ePre)
  }

  // 2) 核心跳转：await router.push()，捕获 Nuxt 中间件/导航失败 + 识别 NavigationFailure
  try {
    const target = '/toolbox/ai-manuscript'
    console.log(`${DEBUG_TAG} ③ 调用 router.push('${target}')，开始等待 Nuxt 路由完成...`)
    const beforeUrl = window.location.href
    const res = await router.push(target)
    const afterUrl = window.location.href
    const dt = Date.now() - t0

    // ★★★ 陈先生之前看到的"弹出成功但页面没动"的精确根因就在这里：★★★
    // Vue Router 4 的 router.push resolve≠成功！需要 isNavigationFailure 判断。
    const nav = inspectNavResult(res, target)

    console.group(`${DEBUG_TAG} ④ router.push 返回（耗时 ${dt}ms）`)
    console.log('  before URL =', beforeUrl)
    console.log('  after  URL =', afterUrl)
    console.log('  检查结果ok =', nav.ok)
    console.log('  详细       =', nav.detail)
    console.log('  returned对象=', res)
    console.groupEnd()

    if (nav.ok) {
      // 即使 inspectNavResult 说成功，也二次确认 afterUrl 确实包含 target 路径（保险）
      const reallyArrived = afterUrl.includes(target)
      if (reallyArrived) {
        console.log(`${DEBUG_TAG} ④-1 ✅ 真实到达目标页！URL=${afterUrl}`)
        ElMessage.success(`已进入政工笔（耗时${dt}ms）`)
      } else {
        console.warn(`${DEBUG_TAG} ④-2 ⚠️ inspectNavResult=true 但 URL 没到目标页！before=${beforeUrl} after=${afterUrl}`)
        ElMessage.warning(`导航返回成功但 URL 未变（${afterUrl}），请查看 F12 控制台【${DEBUG_TAG}】`, { duration: 10000 })
      }
    } else {
      // 这就是之前"弹成功但页面没动"的场景：把 NavigationFailure 当成了成功
      console.warn(`${DEBUG_TAG} ④-3 ❌ NavigationFailure 检测到！（这才是"页面没反应"的直接原因）` + '\n' + nav.detail)
      ElMessage.error(`政工笔进入失败：${nav.detail.split('\n')[0]}\n详情见 F12 控制台【${DEBUG_TAG}】`, { duration: 15000 })
    }
  } catch (err: any) {
    const dt = Date.now() - t0
    console.group(`${DEBUG_TAG} ❌ 政工笔跳转异常（Promise reject，耗时 ${dt}ms）`)
    console.error('  err =', err)
    console.error('  err.name =', err?.name)
    console.error('  err.message =', err?.message)
    console.error('  err.statusCode =', err?.statusCode)
    console.error('  err.statusMessage =', err?.statusMessage)
    console.error('  JSON(err) =', (() => { try { return JSON.stringify(err, null, 2) } catch { return '[不可序列化]' } })())
    console.error('  当前URL =', window.location.href)
    console.error('  isAuthenticated =', authStore.isAuthenticated)
    console.groupEnd()

    const shortMsg = err?.message || err?.statusMessage || String(err) || '未知导航错误'
    ElMessage.error(`政工笔进入失败：${shortMsg}  （F12 控制台筛选“${DEBUG_TAG}”查看详细日志）`, { duration: 8000 })
  }
}
</script>

<style scoped>
.toolbox-container {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.toolbox-header {
  margin-bottom: 32px;
}

.toolbox-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text);
}

.toolbox-header p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.tool-card {
  border-radius: 12px;
}

.tool-content {
  text-align: center;
  padding: 16px;
}

.tool-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.tool-card h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.tool-card p {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.tool-btn {
  width: 100%;
}

.tool-card-highlight {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%);
  border: 1px solid #86efac;
  box-shadow: 0 8px 24px -12px rgba(34, 197, 94, 0.35);
  transition: transform .2s ease, box-shadow .2s ease;
}
.tool-card-highlight:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 40px -16px rgba(22, 163, 74, 0.45) !important;
}

@media (max-width: 768px) {
  .toolbox-container {
    padding: 16px;
  }
  
  .tools-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .tool-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .tool-card h3 {
    font-size: 14px;
  }

  .tool-card p {
    font-size: 12px;
    margin-bottom: 8px;
  }
}
</style>
