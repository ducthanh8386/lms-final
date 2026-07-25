/**
 * Map path → import() để preload chunk khi hover link.
 * Giữ đồng bộ với lazy() trong App.jsx.
 */
const routeLoaders = {
  '/': () => import('../pages/Home'),
  '/courses': () => import('../pages/student/CourseList'),
  '/learning': () => import('../pages/student/MyLearning'),
  '/my-classes': () => import('../pages/student/MyClasses'),
  '/my-schedule': () => import('../pages/student/MySchedule'),
  '/cart': () => import('../pages/student/Cart'),
  '/settings': () => import('../pages/AccountSettings'),
  '/faq': () => import('../pages/Faq'),
  '/login': () => import('../pages/auth/Login'),
  '/register': () => import('../pages/auth/Register'),
  '/teacher/courses': () => import('../pages/teacher/CourseManage'),
  '/teacher/classes': () => import('../pages/teacher/ClassManage'),
  '/teacher/schedule': () => import('../pages/teacher/ScheduleManage'),
  '/admin': () => import('../pages/admin/AdminDashboard'),
}

const preloaded = new Set()

export function preloadRoute(path) {
  const base = path.split('?')[0]

  // Chi tiết khóa học: /courses/:id
  if (base.startsWith('/courses/') && base !== '/courses') {
    const key = 'course-detail'
    if (preloaded.has(key)) return
    preloaded.add(key)
    import('../pages/student/CourseDetail').catch(() => preloaded.delete(key))
    return
  }

  const loader = routeLoaders[base]
  if (!loader || preloaded.has(base)) return
  preloaded.add(base)
  loader().catch(() => {
    preloaded.delete(base)
  })
}
