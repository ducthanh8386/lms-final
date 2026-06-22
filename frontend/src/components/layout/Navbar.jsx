import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { useCart } from '../../context/CartContext'

const Navbar = () => {
  const { user, profile, loading } = useAuth()
  const { totalCount } = useCart()

  return (
    <header className="flex h-16 items-center justify-between bg-white px-8 shadow-sm">
      <div>
        <Link to="/" className="text-2xl font-bold text-slate-900">LMS Marketplace</Link>
      </div>
      
      {loading ? (
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200"></div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200"></div>
        </div>
      ) : user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Xin chào, {profile?.name || user.email} ({profile?.role})</span>
          
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

          {(profile?.role === 'teacher' || profile?.role === 'admin') && (
            <Link to="/teacher/courses" className="text-sm font-medium text-slate-600 hover:text-accent">Dành cho GV</Link>
          )}

          {profile?.role === 'admin' && (
            <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-accent">Admin</Link>
          )}

          <button 
            onClick={() => authService.signOut()}
            className="rounded bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300"
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link to="/login" className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-purple-600">Đăng nhập</Link>
          <Link to="/register" className="rounded bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300">Đăng ký</Link>
        </div>
      )}
    </header>
  )
}

export default Navbar
