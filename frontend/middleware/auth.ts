
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();
  
  // Initialize auth state
  authStore.checkAuth();
  
  // If not logged in and not on login page, redirect to login
  if (to.path !== '/login' && !authStore.isAuthenticated) {
    return navigateTo('/login');
  }
  
  // If logged in and on login page, redirect to home
  if (to.path === '/login' && authStore.isAuthenticated) {
    return navigateTo('/');
  }
});
