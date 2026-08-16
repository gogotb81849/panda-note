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
import { useRouter, isNavigationFailure, NavigationFailureType } from 'vue-router'
import { ElMessage } from 'element-plus'

const DEBUG_TAG = '[政工笔-调试]'
const FAILURE_TYPE_LABEL: Record<number, string> = {
  1: 'NAVIGATION_ABORTED   (某个守卫return false/abortNavigation，导航被主动取消)',
  2: 'NAVIGATION_CANCELLED (新的导航又触发了，当前这次被覆盖掉)',
  3: 'NAVIGATION_DUPLICATED(目标就是当前路由，什么都没做就"完成"了)',
  4: 'NAVIGATION_REDIRECTED (守卫return navigateTo/throw redirect，被重定向到别的路由了)',
}
const authStore = useAuthStore()
const router = useRouter()

/**
 * 检查 router.push() 返回值是否为 NavigationFailure。
 * Vue Router 4 大坑："导航被取消/重定向/重复"不会 reject promise，
 * 而是 resolve 成一个 failure 对象，不判断就会把失败当成功弹 toast。
 */
function inspectNavResult(res: any, target: string): { ok: boolean; detail: string } {
  if (res == null || typeof res !== 'object') {
    return { ok: true, detail: 'result=null/undefined（Vue Router < 4.x 风格，视为成功）' }
  }
  if (!isNavigationFailure(res)) {
    return { ok: true, detail: `非 NavigationFailure，res.normalizedPath=${(res as any)?.normalizedPath ?? 'N/A'}（成功到达目标）` }
  }
  // 是 NavigationFailure
  const typeNum: number = (res.type ?? 0) as number
  const label = FAILURE_TYPE_LABEL[typeNum] || `UNKNOWN_FAILURE(type=${typeNum})`
  const toStr: string = (() => { try { return JSON.stringify(res.to, (k, v) => k === 'matched' ? `[${(v as any[])?.length ?? 0}条]` : v) } catch { return String(res.to) } })()
  const fromStr: string = (() => { try { return JSON.stringify(res.from, (k, v) => k === 'matched' ? `[${(v as any[])?.length ?? 0}条]` : v) } catch { return String(res.from) } })()
  const detail = `${label}\n  to=${toStr}\n  from=${fromStr}\n  target=${target}`
  return { ok: false, detail }
}

// ====== 进入工具箱页时打印基础状态（帮助定位：是未登录/无token导致的无反应吗？）======
onMounted(() => {
  const s = {
    path: window.location.pathname,
    href: window.location.href,
    isAuthenticated: authStore.isAuthenticated,
    tokenLen: authStore.token?.length ?? 0,
    userRole: authStore.user?.role ?? null,
    user: authStore.user ? { id: authStore.user.id, username: authStore.user.username, role: authStore.user.role } : null,
    localStorageHasToken: false,
    localStorageHasUser: false,
    ua: navigator.userAgent,
  }
  try {
    s.localStorageHasToken = !!localStorage.getItem('auth_token')
    s.localStorageHasUser = !!localStorage.getItem('auth_user')
  } catch { /* ignore */ }
  console.log(`${DEBUG_TAG} 工具箱页已挂载，基础状态：`, s)
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
