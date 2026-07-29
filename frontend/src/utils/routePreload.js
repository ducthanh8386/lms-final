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
  '/checkout/detail': () => import('../pages/student/CheckoutDetail'),
  '/settings': () => import('../pages/AccountSettings'),
  '/faq': () => import('../pages/Faq'),
  '/login': () => import('../pages/auth/Login'),
  '/register': () => import('../pages/auth/Register'),
  '/teacher': () => import('../pages/teacher/TeacherDashboard'),
  '/teacher/courses': () => import('../pages/teacher/CourseManage'),
  '/teacher/qa': () => import('../pages/teacher/TeacherQA'),
  '/teacher/leads': () => import('../pages/teacher/CourseLeads'),
  '/teacher/classes': () => import('../pages/teacher/ClassManage'),
  '/teacher/schedule': () => import('../pages/teacher/ScheduleManage'),
  '/teacher/students': () => import('../pages/teacher/Students'),
  '/teacher/progress': () => import('../pages/teacher/TeacherLearningProgress'),
  '/teacher/reviews': () => import('../pages/teacher/TeacherReviews'),
  '/teacher/settings': () => import('../pages/teacher/TeacherSettings'),
  '/admin': () => import('../pages/admin/AdminDashboard'),
  '/admin/courses': () => import('../pages/admin/AdminCourses'),
  '/admin/zoom-courses': () => import('../pages/admin/AdminCourses'),
  '/admin/payments': () => import('../pages/admin/AdminPayments'),
  '/admin/leads': () => import('../pages/admin/AdminLeads'),
  '/admin/classes': () => import('../pages/admin/AdminClasses'),
  '/admin/schedules': () => import('../pages/admin/AdminScheduleApproval'),
  '/admin/teachers': () => import('../pages/admin/AdminUserList'),
  '/admin/students': () => import('../pages/admin/AdminUserList'),
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
