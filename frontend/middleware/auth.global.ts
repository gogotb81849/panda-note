export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore();
  
  await authStore.checkAuth();
  
  if (to.path !== '/login' && !authStore.isAuthenticated) {
    return navigateTo('/login');
  }
  
  if (to.path === '/login' && authStore.isAuthenticated) {
    return navigateTo('/');
  }
});