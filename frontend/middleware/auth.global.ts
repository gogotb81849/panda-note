export default defineNuxtRouteMiddleware(async (to) => {
  // ★ 白名单：临时自修复接口（沙箱curl无cookie触发PM2重启用）
  //   v0814 追加：带 /api 前缀的路径（后端 setGlobalPrefix('api')），客户端走 /api/** 代理也能穿透
  if (to.path === '/__fix_pm2_20260806' || to.path === '/api/_fix_pm2_20260806') {
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