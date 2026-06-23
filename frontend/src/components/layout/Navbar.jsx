import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { useCart } from '../../context/CartContext'

const Navbar = () => {
  const { user, profile, loading } = useAuth()
  const { totalCount } = useCart()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="relative bg-white shadow-sm z-50">
      <div className="flex h-16 items-center justify-between px-8">
        <div>
          <Link to="/" className="text-2xl font-bold text-slate-900">LMS Marketplace</Link>
        </div>
        
        {/* Hamburger Mobile Menu Toggle Button */}
        {!loading && (
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="block md:hidden text-slate-600 hover:text-accent focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        )}

        {/* Desktop Navigation Link Menu */}
        <div className="hidden md:flex items-center gap-4">
          {loading ? (
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 animate-pulse rounded bg-slate-200"></div>
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200"></div>
            </div>
          ) : user ? (
            <>
              <span className="text-sm font-medium text-slate-600">
                Xin chào, {profile?.name || user.email} ({profile?.role})
              </span>
              
              {profile?.role === 'student' && (
                <>
                  <Link to="/courses" className="text-sm font-medium text-slate-600 hover:text-accent">Khóa học</Link>
                  <Link to="/learning" className="text-sm font-medium text-slate-600 hover:text-accent">Đang học</Link>
                  
                  <Link to="/cart" className="relative text-sm font-medium text-slate-600 hover:text-accent">
                    Giỏ hàng
                    {totalCount > 0 && (
                      <span className="absolute -top-2 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {totalCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {profile?.role === 'teacher' && (
                <Link to="/teacher/courses" className="text-sm font-medium text-slate-600 hover:text-accent">Dành cho GV</Link>
              )}

              {profile?.role === 'admin' && (
                <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-accent">Admin</Link>
              )}

              <button 
                onClick={() => authService.signOut()}
                className="rounded bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300 transition"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <div className="flex gap-4">
              <Link to="/login" className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 transition">Đăng nhập</Link>
              <Link to="/register" className="rounded bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300 transition">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet Drawer Collapsible Dropdown Menu */}
      {isOpen && !loading && (
        <div className="absolute top-16 left-0 w-full border-t border-slate-100 bg-white px-8 py-4 shadow-md md:hidden flex flex-col gap-4 animate-fadeIn z-50">
          {user ? (
            <>
              <div className="border-b border-slate-100 pb-2">
                <div className="text-sm font-semibold text-slate-800">{profile?.name || user.email}</div>
                <div className="text-xs text-slate-500 mt-0.5 capitalize">Vai trò: {profile?.role}</div>
              </div>
              
              {profile?.role === 'student' && (
                <>
                  <Link 
                    to="/courses" 
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-slate-600 hover:text-accent py-1"
                  >
                    Khóa học
                  </Link>
                  <Link 
                    to="/learning" 
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-slate-600 hover:text-accent py-1"
                  >
                    Đang học
                  </Link>
                  <Link 
                    to="/cart" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between text-sm font-medium text-slate-600 hover:text-accent py-1"
                  >
                    <span>Giỏ hàng</span>
                    {totalCount > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {totalCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {profile?.role === 'teacher' && (
                <Link 
                  to="/teacher/courses" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-slate-600 hover:text-accent py-1"
                >
                  Dành cho GV
                </Link>
              )}

              {profile?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-slate-600 hover:text-accent py-1"
                >
                  Admin
                </Link>
              )}

              <button 
                onClick={() => {
                  setIsOpen(false)
                  authService.signOut()
                }}
                className="w-full rounded bg-red-50 py-2 text-center text-sm font-medium text-red-600 hover:bg-red-100 transition"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link 
                to="/login" 
                onClick={() => setIsOpen(false)}
                className="w-full rounded bg-accent py-2 text-center text-sm font-medium text-white hover:bg-purple-600 transition"
              >
                Đăng nhập
              </Link>
              <Link 
                to="/register" 
                onClick={() => setIsOpen(false)}
                className="w-full rounded bg-slate-200 py-2 text-center text-sm font-medium hover:bg-slate-300 transition"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
