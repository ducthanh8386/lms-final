import React, { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import { authService } from '../../services/authService'
import { preloadRoute } from '../../utils/routePreload'

const tabs = [
  {
    to: '/',
    label: 'Trang chủ',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="currentColor" aria-hidden>
        <path d="M12 3.2 3 10.5V21h6.5v-5.5h5V21H21V10.5L12 3.2Z" />
      </svg>
    ),
  },
  {
    to: '/courses',
    label: 'Lộ trình',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="12" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <path d="M8.5 7.5 15.5 11M8.5 16.5 15.5 13" />
      </svg>
    ),
  },
  {
    to: '/my-schedule',
    label: 'Lịch học',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    to: '/faq',
    label: 'Hỏi đáp',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2.2V14" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
]

const tabLabelClass = 'text-[10px] font-medium leading-tight'

const MobileBottomNav = () => {
  const { user, profile } = useAuth()
  const { openLogin } = useAuthModal()
  const location = useLocation()
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    setAccountOpen(false)
  }, [location.pathname])

  const avatarLetter = (profile?.name || user?.email || 'U').charAt(0).toUpperCase()

  const handleAccount = () => {
    if (!user) {
      openLogin(location.pathname)
      return
    }
    setAccountOpen((v) => !v)
  }

  const handleSignOut = async () => {
    setAccountOpen(false)
    await authService.signOut()
    window.location.assign('/')
  }

  return (
    <>
      {accountOpen && (
        <div className="fixed inset-0 z-[55] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng"
            onClick={() => setAccountOpen(false)}
          />
          <div className="absolute bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 rounded-t-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#f05123_0deg,#fbbf24_90deg,#22c55e_180deg,#3b82f6_270deg,#f05123_360deg)] p-[2.5px]">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white ring-2 ring-white">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    avatarLetter
                  )}
                </span>
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-[#242424]">
                  {profile?.name || user?.email?.split('@')[0]}
                </p>
                <p className="truncate text-[12px] text-[#757575]">
                  @{user?.email?.split('@')[0] || 'user'}
                </p>
              </div>
            </div>
            <div className="border-t border-[#f0f0f0] px-3 pt-1.5">
              <Link
                to="/learning"
                onClick={() => setAccountOpen(false)}
                className="block w-full py-[10px] hover:opacity-80"
              >
                <span
                  style={{
                    fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: '#666666',
                  }}
                >
                  Khóa học của tôi
                </span>
              </Link>
              <Link
                to="/settings"
                onClick={() => setAccountOpen(false)}
                className="block w-full py-[10px] hover:opacity-80"
              >
                <span
                  style={{
                    fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: '#666666',
                  }}
                >
                  Cài đặt
                </span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full bg-transparent py-[10px] text-left hover:opacity-80"
              >
                <span
                  style={{
                    fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: '#666666',
                  }}
                >
                  Đăng xuất
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e8e8e8] bg-white pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        aria-label="Điều hướng chính"
      >
        <div className="flex h-[56px] items-stretch">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              onMouseEnter={() => preloadRoute(tab.to)}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-[#666]'
                }`
              }
            >
              {tab.icon}
              <span className={tabLabelClass}>{tab.label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={handleAccount}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 bg-transparent transition-colors ${
              accountOpen ? 'text-primary' : 'text-[#666]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
            </svg>
            <span className={tabLabelClass}>Tài khoản</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default MobileBottomNav
