import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import NotificationBell from '../ui/NotificationBell'
import UserMenu from './UserMenu'
import MyCoursesMenu from './MyCoursesMenu'
import { preloadRoute } from '../../utils/routePreload'

const Navbar = () => {
  const { user, profile, loading } = useAuth()
  const { openLogin } = useAuthModal()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMobileSearchOpen(false)
  }, [location.pathname])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = search.trim()
    setMobileSearchOpen(false)
    navigate(q ? `/courses?q=${encodeURIComponent(q)}` : '/courses')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[66px] border-b border-[#e8e8e8] bg-white">
      <div className="flex h-full items-center gap-2 px-3 md:gap-3 md:px-4 md:pl-[88px]">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold text-white shadow-sm">
            LMS
          </span>
          <span className="truncate text-[11px] font-bold leading-tight tracking-wide text-[#242424] sm:text-[12px] lg:text-[13px]" style={{ fontFamily: '"Be Vietnam Pro", system-ui, sans-serif' }}>{`HỌC LẬP TRÌNH \u0110\u1EC4 ĐI LÀM`}</span>
        </Link>

        <form onSubmit={handleSearch} className="mx-auto hidden max-w-[420px] flex-1 sm:flex">
          <label className="relative flex w-full items-center">
            <span className="pointer-events-none absolute left-3.5 text-[#888]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khóa học, bài tập..."
              className="w-full rounded-full border border-[#e8e8e8] bg-[#f5f5f5] py-2.5 pl-10 pr-4 text-sm text-[#242424] placeholder:text-[#999] outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1.5 md:gap-3">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#555] hover:bg-[#f5f5f5] sm:hidden"
            aria-label="Tìm kiếm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>

          {!loading && user ? (
            <>
              {profile?.role === 'teacher' && (
                <Link
                  to="/teacher"
                  onMouseEnter={() => preloadRoute('/teacher')}
                  className="hidden rounded-full bg-slate-900 px-3 py-2 text-[13px] font-bold text-white hover:bg-slate-800 md:inline"
                >
                  Khu vực GV
                </Link>
              )}
              {profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  onMouseEnter={() => preloadRoute('/admin')}
                  className="hidden text-sm font-semibold text-[#242424] hover:text-primary md:inline"
                >
                  Admin
                </Link>
              )}
              <MyCoursesMenu />
              <div className="hidden sm:block">
                <NotificationBell />
              </div>
              <UserMenu />
            </>
          ) : !loading ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/register"
                className="inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-[14px] font-semibold leading-none text-[#292929] transition-all duration-200 hover:-translate-y-px hover:bg-[#f0f0f0] hover:text-primary"
              >
                Đăng ký
              </Link>
              <button
                type="button"
                onClick={() => openLogin(location.pathname)}
                className="inline-flex h-9 cursor-pointer items-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_50%,#e03e12_100%)] px-4 text-[14px] font-semibold leading-none text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:brightness-105 hover:shadow-md"
              >
                Đăng nhập
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-[#e8e8e8] bg-white px-3 py-3 shadow-md sm:hidden">
          <form onSubmit={handleSearch}>
            <label className="relative flex w-full items-center">
              <span className="pointer-events-none absolute left-3.5 text-[#888]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                autoFocus
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm khóa học, bài tập..."
                className="w-full rounded-full border border-[#e8e8e8] bg-[#f5f5f5] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white"
              />
            </label>
          </form>
        </div>
      )}
    </header>
  )
}

export default Navbar
