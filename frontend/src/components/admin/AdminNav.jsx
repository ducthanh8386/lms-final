import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { preloadRoute } from '../../utils/routePreload'

const SECTIONS = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/admin', end: true, label: 'Dashboard', hint: 'Thống kê hệ thống' },
    ],
  },
  {
    title: 'Khóa video',
    titleClass: 'text-teal-300',
    items: [
      { to: '/admin/courses', label: 'Khóa Video', hint: 'SePay · bài học' },
      { to: '/admin/payments', label: 'Thanh toán', hint: 'Đơn SePay / video' },
    ],
  },
  {
    title: 'Người dùng',
    items: [
      { to: '/admin/teachers', label: 'Giáo viên', hint: 'Tài khoản GV' },
      { to: '/admin/students', label: 'Học viên', hint: 'Tài khoản HV' },
    ],
  },
  {
    title: 'Khóa Zoom',
    titleClass: 'text-blue-300',
    items: [
      { to: '/admin/zoom-courses', label: 'Khóa Zoom', hint: 'Tư vấn · phân công GV' },
      { to: '/admin/leads', label: 'Yêu cầu tư vấn', hint: 'CRM · xếp lớp' },
      { to: '/admin/classes', label: 'Lớp Zoom', hint: 'Tuyển sinh · sĩ số' },
      { to: '/admin/schedules', label: 'Duyệt lịch', hint: 'Buổi Zoom chờ duyệt' },
    ],
  },
]

export const AdminSidebar = ({ onNavigate }) => (
  <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-[#111827] text-white">
    <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-xs font-extrabold">
        AD
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-bold">Khu vực Admin</p>
        <p className="truncate text-[11px] text-white/50">Video · Zoom · người dùng</p>
      </div>
    </div>

    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p
            className={`mb-1 px-3 text-[10px] font-bold uppercase tracking-wider ${
              section.titleClass || 'text-white/40'
            }`}
          >
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                onMouseEnter={() => preloadRoute(item.to)}
                className={({ isActive }) =>
                  `flex items-start gap-3 rounded-xl px-3 py-2.5 transition ${
                    isActive
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] opacity-70">{item.hint}</span>
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>

    <div className="border-t border-white/10 p-3">
      <Link
        to="/teacher"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/60 hover:bg-white/5 hover:text-white"
      >
        → Khu vực giảng viên
      </Link>
      <Link
        to="/"
        onClick={onNavigate}
        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/60 hover:bg-white/5 hover:text-white"
      >
        ← Về trang chủ
      </Link>
    </div>
  </aside>
)

export const AdminTopbar = ({ onOpenMenu }) => {
  const { profile, user } = useAuth()
  const location = useLocation()
  const onZoomArea =
    location.pathname.startsWith('/admin/zoom-courses') ||
    location.pathname.startsWith('/admin/leads') ||
    location.pathname.startsWith('/admin/classes') ||
    location.pathname.startsWith('/admin/schedules') ||
    (location.pathname.startsWith('/admin/courses/new') &&
      location.search.includes('mode=consultation'))

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
        aria-label="Mở menu"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-900">
          Admin · {profile?.name || user?.email?.split('@')[0] || 'Quản trị'}
        </p>
        <p className="truncate text-[11px] text-slate-500">{location.pathname}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={onZoomArea ? '/admin/courses/new?mode=consultation' : '/admin/courses/new?mode=purchase'}
          className={`hidden rounded-full px-3.5 py-2 text-[12px] font-bold text-white sm:inline-flex ${
            onZoomArea ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-700 hover:bg-teal-800'
          }`}
        >
          {onZoomArea ? '+ Tạo khóa Zoom' : '+ Tạo khóa Video'}
        </Link>
        <button
          type="button"
          onClick={async () => {
            await authService.signOut()
            window.location.assign('/')
          }}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          aria-label="Đăng xuất"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  )
}

export const AdminMobileNav = () => {
  const items = [
    { to: '/admin', end: true, label: 'Home' },
    { to: '/admin/courses', label: 'Khóa' },
    { to: '/admin/payments', label: 'TT' },
    { to: '/admin/leads', label: 'Lead' },
    { to: '/admin/students', label: 'HV' },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      <div className="flex h-14 items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center text-[10px] font-semibold ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
