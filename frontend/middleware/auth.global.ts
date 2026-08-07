export default defineNuxtRouteMiddleware(async (to) => {
  // ★ 白名单：临时自修复接口直接放行（沙箱curl无cookie触发PM2重启用）
  if (to.path === '/__fix_pm2_20260806') {
    return;
  }

  const authStore = useAuthStore();
  
  await authStore.checkAuth();
  
  if (to.path !== '/login' && !authStore.isAuthenticated) {
    return navigateTo('/login');
  }
  
  if (to.path === '/login' && authStore.isAuthenticated) {
    return navigateTo('/');
  }
});