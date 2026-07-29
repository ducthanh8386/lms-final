import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { preloadRoute } from '../../utils/routePreload'

const SECTIONS = [
  {
    title: null,
    items: [
      {
        to: '/teacher',
        end: true,
        label: 'Tổng quan',
        hint: 'Bảng điều khiển',
      },
    ],
  },
  {
    title: 'Khóa video',
    titleClass: 'text-teal-300',
    items: [
      { to: '/teacher/courses', label: 'Khóa học', hint: 'Video · free · Zoom được giao' },
      { to: '/teacher/qa', label: 'Hỏi đáp', hint: 'Trả lời học viên trong bài' },
      { to: '/teacher/students', label: 'Học viên', hint: 'Danh sách enroll' },
      { to: '/teacher/progress', label: 'Tiến độ học', hint: 'F8-style' },
      { to: '/teacher/reviews', label: 'Đánh giá', hint: 'Review khóa học' },
    ],
  },
  {
    title: 'Khóa Zoom',
    titleClass: 'text-blue-300',
    items: [
      { to: '/teacher/leads', label: 'Đăng ký tư vấn', hint: 'CRM · xếp lớp' },
      { to: '/teacher/classes', label: 'Lớp học', hint: 'Tuyển sinh · sĩ số' },
      { to: '/teacher/schedule', label: 'Lịch dạy', hint: 'Zoom · điểm danh' },
    ],
  },
  {
    title: 'Tài khoản',
    items: [{ to: '/teacher/settings', label: 'Cài đặt', hint: 'Thông tin nhận tiền' }],
  },
]

export const TeacherSidebar = ({ onNavigate }) => {
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-[#0f172a] text-white">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-extrabold">
          GV
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">Khu vực giảng viên</p>
          <p className="truncate text-[11px] text-white/50">Video · Zoom · học viên</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section, idx) => (
          <div key={section.title || `s-${idx}`}>
            {section.title && (
              <p
                className={`mb-1 px-3 text-[10px] font-bold uppercase tracking-wider ${
                  section.titleClass || 'text-white/40'
                }`}
              >
                {section.title}
              </p>
            )}
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
                        ? 'bg-primary text-white shadow-lg shadow-orange-500/20'
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
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/60 hover:bg-white/5 hover:text-white"
        >
          ← Về trang học viên
        </Link>
      </div>
    </aside>
  )
}

export const TeacherTopbar = ({ onOpenMenu }) => {
  const { profile, user } = useAuth()
  const location = useLocation()

  const handleSignOut = async () => {
    await authService.signOut()
    window.location.assign('/')
  }

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
          Xin chào, {profile?.name || user?.email?.split('@')[0] || 'Giảng viên'}
        </p>
        <p className="truncate text-[11px] text-slate-500">{location.pathname}</p>
      </div>

      <Link
        to="/teacher/progress"
        className="hidden rounded-full bg-primary px-3.5 py-2 text-[12px] font-bold text-white hover:bg-brand-orangeHover sm:inline-flex"
      >
        Tiến độ học
      </Link>
      <Link
        to="/settings"
        className="rounded-full border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
      >
        Tài khoản
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
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
    </header>
  )
}

export const TeacherMobileNav = () => {
  const items = [
    { to: '/teacher', end: true, label: 'Home' },
    { to: '/teacher/progress', label: 'Tiến độ' },
    { to: '/teacher/leads', label: 'Tư vấn' },
    { to: '/teacher/classes', label: 'Lớp' },
    { to: '/teacher/schedule', label: 'Lịch' },
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
                isActive ? 'text-primary' : 'text-slate-500'
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
