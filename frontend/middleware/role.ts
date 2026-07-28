// 角色验证中间件
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  const userRole = authStore.user?.role
  
  // 检查 requiredRole（单一角色）
  const requiredRole = to.meta.requiredRole as string | undefined
  if (requiredRole && userRole !== requiredRole) {
    ElMessage.error('您没有权限访问此页面')
    return navigateTo('/admin')
  }
  
  // 检查 allowedRoles（多个允许的角色）
  const allowedRoles = to.meta.allowedRoles as string[] | undefined
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      ElMessage.error('您没有权限访问此页面')
      return navigateTo('/admin')
    }
  }
})
