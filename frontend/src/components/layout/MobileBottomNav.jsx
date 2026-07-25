import React, { useEffect, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import { useCart } from '../../context/CartContext'
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
    to: '/learning',
    label: 'Học tập',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 5h11a2 2 0 0 1 2 2v12H6a2 2 0 0 0-2 2V5Z" />
        <path d="M17 7h3a1 1 0 0 1 1 1v11a2 2 0 0 0-2-2h-2" />
        <path d="M8 9h5M8 13h5" />
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
]

const MobileBottomNav = () => {
  const { user, profile } = useAuth()
  const { openLogin } = useAuthModal()
  const { totalCount } = useCart()
  const location = useLocation()
  const navigate = useNavigate()
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
    navigate('/')
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
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {avatarLetter}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-[#242424]">
                  {profile?.name || user?.email}
                </p>
                <p className="text-[12px] capitalize text-[#888]">{profile?.role || 'student'}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Link
                to="/learning"
                onClick={() => setAccountOpen(false)}
                className="rounded-xl px-3 py-3 text-[14px] font-semibold text-[#242424] hover:bg-[#f5f5f5]"
              >
                Khóa học của tôi
              </Link>
              <Link
                to="/cart"
                onClick={() => setAccountOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-[14px] font-semibold text-[#242424] hover:bg-[#f5f5f5]"
              >
                <span>Giỏ hàng</span>
                {totalCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                    {totalCount}
                  </span>
                )}
              </Link>
              <Link
                to="/my-classes"
                onClick={() => setAccountOpen(false)}
                className="rounded-xl px-3 py-3 text-[14px] font-semibold text-[#242424] hover:bg-[#f5f5f5]"
              >
                Lớp học của tôi
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl px-3 py-3 text-left text-[14px] font-semibold text-primary hover:bg-[#f5f5f5]"
              >
                Đăng xuất
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
                `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-[#666]'
                }`
              }
            >
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={handleAccount}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              accountOpen ? 'text-primary' : 'text-[#666]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
            </svg>
            <span>Tài khoản</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default MobileBottomNav
