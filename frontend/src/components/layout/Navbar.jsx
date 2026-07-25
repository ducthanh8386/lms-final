import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import { authService } from '../../services/authService'
import { useCart } from '../../context/CartContext'
import NotificationBell from '../ui/NotificationBell'
import { preloadRoute } from '../../utils/routePreload'

const Navbar = () => {
  const { user, profile, loading } = useAuth()
  const { openLogin } = useAuthModal()
  const { totalCount } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    setIsOpen(false)
    await authService.signOut()
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const q = search.trim()
    navigate(q ? `/courses?q=${encodeURIComponent(q)}` : '/courses')
  }

  const avatarLetter = (profile?.name || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[66px] border-b border-[#e8e8e8] bg-white">
      <div className="flex h-full items-center gap-3 px-3 md:px-4 md:pl-[88px]">
        {/* Logo + slogan */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white text-sm font-extrabold shadow-sm">
            LMS
          </span>
          <span className="hidden lg:block text-[13px] font-bold uppercase tracking-wide text-[#242424] whitespace-nowrap">
            Học lập trình để đi làm
          </span>
        </Link>

        {/* Search — F8 pill */}
        <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-[420px] mx-auto">
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

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {!loading && user ? (
            <>
              {profile?.role === 'student' && (
                <>
                  <Link
                    to="/learning"
                    onMouseEnter={() => preloadRoute('/learning')}
                    className="hidden md:inline text-sm font-semibold text-[#242424] hover:text-primary transition-colors"
                  >
                    Khóa học của tôi
                  </Link>
                  <Link
                    to="/cart"
                    onMouseEnter={() => preloadRoute('/cart')}
                    className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f5f5f5] text-[#555]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6h15l-1.5 9h-12z" />
                      <circle cx="9" cy="20" r="1.2" fill="currentColor" />
                      <circle cx="17" cy="20" r="1.2" fill="currentColor" />
                      <path d="M6 6 5 3H2" />
                    </svg>
                    {totalCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                        {totalCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              {profile?.role === 'teacher' && (
                <Link
                  to="/teacher/courses"
                  onMouseEnter={() => preloadRoute('/teacher/courses')}
                  className="hidden md:inline text-sm font-semibold text-[#242424] hover:text-primary"
                >
                  Dành cho GV
                </Link>
              )}
              {profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  onMouseEnter={() => preloadRoute('/admin')}
                  className="hidden md:inline text-sm font-semibold text-[#242424] hover:text-primary"
                >
                  Admin
                </Link>
              )}
              <NotificationBell />
              <div className="relative group">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-white"
                  aria-label="Tài khoản"
                >
                  {avatarLetter}
                </button>
                <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[#e8e8e8] bg-white py-2 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition group-hover:visible group-hover:opacity-100">
                  <div className="border-b border-[#f0f0f0] px-3 pb-2 mb-1">
                    <p className="truncate text-sm font-semibold text-[#242424]">{profile?.name || user.email}</p>
                    <p className="text-xs text-[#888] capitalize">{profile?.role}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left text-sm text-[#555] hover:bg-[#f5f5f5] hover:text-primary"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </>
          ) : !loading ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/register"
                className="inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-[14px] font-semibold leading-none font-sans text-[#292929] transition-all duration-200 hover:-translate-y-px hover:bg-[#f0f0f0] hover:text-primary"
              >
                Đăng ký
              </Link>
              <button
                type="button"
                onClick={() => openLogin(location.pathname)}
                className="inline-flex h-9 cursor-pointer items-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_50%,#e03e12_100%)] px-4 text-[14px] font-semibold leading-none font-sans text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:brightness-105 hover:shadow-md"
              >
                Đăng nhập
              </button>
            </div>
          ) : null}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[#555] hover:bg-[#f5f5f5]"
            aria-label="Menu"
          >
            <div className="space-y-1.5">
              <div className={`h-0.5 w-5 bg-current transition ${isOpen ? 'translate-y-2 rotate-45' : ''}`} />
              <div className={`h-0.5 w-5 bg-current transition ${isOpen ? 'opacity-0' : ''}`} />
              <div className={`h-0.5 w-5 bg-current transition ${isOpen ? '-translate-y-2 -rotate-45' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-[#e8e8e8] bg-white px-4 py-3 shadow-md flex flex-col gap-2">
          <form onSubmit={handleSearch} className="sm:hidden mb-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khóa học..."
              className="w-full rounded-full border border-[#e8e8e8] bg-[#f5f5f5] px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </form>
          <Link to="/" className="py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>Trang chủ</Link>
          <Link to="/courses" className="py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>Khóa học</Link>
          {user ? (
            <>
              <Link to="/learning" className="py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>Khóa học của tôi</Link>
              <Link to="/cart" className="py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>Giỏ hàng ({totalCount})</Link>
              <button onClick={handleSignOut} className="py-2 text-left text-sm font-medium text-primary">Đăng xuất</button>
            </>
          ) : (
            <>
              <div className="mt-1 flex items-center gap-2">
                <Link
                  to="/register"
                  className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-[14px] font-semibold leading-none font-sans text-[#292929] transition-all duration-200 hover:-translate-y-px hover:bg-[#f0f0f0] hover:text-primary"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng ký
                </Link>
                <button
                  type="button"
                  className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_50%,#e03e12_100%)] px-4 text-[14px] font-semibold leading-none font-sans text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:brightness-105 hover:shadow-md"
                  onClick={() => {
                    setIsOpen(false)
                    openLogin(location.pathname)
                  }}
                >
                  Đăng nhập
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
