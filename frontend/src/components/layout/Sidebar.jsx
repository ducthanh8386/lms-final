import React from 'react'
import { NavLink } from 'react-router-dom'
import { preloadRoute } from '../../utils/routePreload'

const navItems = [
  {
    to: '/',
    label: 'Trang chủ',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 3.2 3 10.5V21h6.5v-5.5h5V21H21V10.5L12 3.2Z" />
      </svg>
    ),
  },
  {
    to: '/courses',
    label: 'Lộ trình',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="12" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <path d="M8.5 7.5 15.5 11M8.5 16.5 15.5 13" />
      </svg>
    ),
  },
  {
    to: '/my-classes',
    label: 'Lớp học',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 19V5h16v14" />
        <path d="M8 19v-6h8v6" />
        <path d="M2 19h20" />
      </svg>
    ),
  },
  {
    to: '/my-schedule',
    label: 'Lịch học',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    to: '/faq',
    label: 'Hỏi đáp',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2.2V14" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
]

const Sidebar = () => {
  return (
    <div className="relative hidden w-[72px] shrink-0 md:block">
      <aside className="sticky top-[66px] flex w-full flex-col items-center bg-white py-3">
        <nav className="flex w-full flex-col items-center gap-1 px-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onMouseEnter={() => preloadRoute(item.to)}
              onFocus={() => preloadRoute(item.to)}
              className={({ isActive }) =>
                `flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#f5f5f5] text-[#242424]'
                    : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#242424]'
                }`
              }
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full">{item.icon}</span>
              <span className="text-center leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  )
}

export default Sidebar
