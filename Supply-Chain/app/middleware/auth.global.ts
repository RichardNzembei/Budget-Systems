// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  // Skip during SSR/hydration checks that need localStorage
  if (import.meta.server) return

  const userStr = localStorage.getItem('user')

  // Not logged in → redirect to login (except if already on login)
  if (!userStr) {
    if (to.path !== '/' && to.path !== '/') {
      return navigateTo('/', { redirectCode: 302 })
    }
    return
  }

  let user
  try {
    user = JSON.parse(userStr)
    if (!user?.role) throw new Error('invalid user')
  } catch {
    localStorage.removeItem('user')
    return navigateTo('/')
  }

  // Already logged in → redirect away from login page
  if (to.path === '/' || to.path === '/') {
    return navigateTo(
      user.role === 'admin' ? '/admin/dashboard' : '/worker/orders',
      { redirectCode: 302 }
    )
  }

  // Role protection
  if (to.path.startsWith('/admin/') && user.role !== 'admin') {
    return navigateTo('/worker/orders')
  }

  if (to.path.startsWith('/worker/') && user.role !== 'worker') {
    return navigateTo('/admin/dashboard')
  }
})
