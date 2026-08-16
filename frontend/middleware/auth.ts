/**
 * 命名中间件 auth（仅在页面显式声明 definePageMeta({ middleware:['auth'] }) 时运行）
 *
 * ⚠️ v2 修复：之前同步调用 checkAuth() 没有 await，在"token过期→profile 401→被清掉"
 * 这类场景下会发生竞态：同步判定时 isAuthenticated 可能还未刷新为最终值，
 * 导致 return navigateTo('/login') 发出 Redirect → Vue Router 返回 NavigationFailure，
 * 但 Promise 仍是 resolve → 调用方误以为"导航成功"（如工具箱入口之前的错弹 success toast）。
 * 因此 v2 加了 await 与【路由调试-命名中间件】日志。
 *
 * 另外：auth.global.ts 已经给所有路由跑了一遍认证，命名中间件相当于第二次校验。
 * 如果某个页面只靠全局就够了，就不要声明此中间件（减少竞态）。
 */
const TAG = '[路由调试-命名中间件 auth]'

function log(...args: any[]) {
  try { console.log(TAG, ...args) } catch { /* ignore */ }
}
function logWarn(...args: any[]) {
  try { console.warn(TAG, ...args) } catch { /* ignore */ }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const t0 = Date.now()
  log(`① 进入命名中间件 auth，目标=${to.fullPath || to.path}   （注意：auth.global.ts 已经跑过一次认证）`)

  const authStore = useAuthStore();
  const before = { isAuth: authStore.isAuthenticated, role: authStore.user?.role ?? null, tokenLen: authStore.token?.length ?? 0 }
  log(`② checkAuth() 调用前 =`, before)

  // ★ v2: 必须 await，否则就是同步读 store 快照，与真实状态不一致
  try {
    await authStore.checkAuth();
  } catch (e: any) {
    logWarn(`②-1 checkAuth 抛错（不中断，继续用当前状态）：`, e?.message || e)
  }

  const after = { isAuth: authStore.isAuthenticated, role: authStore.user?.role ?? null, tokenLen: authStore.token?.length ?? 0 }
  log(`③ checkAuth() 调用后 =`, after, `   耗时 ${Date.now() - t0}ms`)

  if (after.isAuth !== before.isAuth) {
    logWarn(`③-1 ⚠️ checkAuth 前后 isAuthenticated 从 ${before.isAuth} 变为 ${after.isAuth}！这正是之前出现"竞态 redirect"的根因。`)
  }

  if (to.path !== '/login' && !authStore.isAuthenticated) {
    logWarn(`④ 未登录 → 跳 /login   原目标=${to.fullPath || to.path}`)
    return navigateTo('/login');
  }
  if (to.path === '/login' && authStore.isAuthenticated) {
    log(`④ 已登录且去登录页 → 跳 /`)
    return navigateTo('/');
  }
  log(`⑤ ✅ 通过   总耗时 ${Date.now() - t0}ms`)
});
