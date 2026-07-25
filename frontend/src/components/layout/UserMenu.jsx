import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { preloadRoute } from '../../utils/routePreload'

const rainbowRing =
  'bg-[conic-gradient(from_180deg_at_50%_50%,#f05123_0deg,#fbbf24_90deg,#22c55e_180deg,#3b82f6_270deg,#f05123_360deg)]'

const itemStyle = {
  fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: 1.4,
  color: '#666666',
}

const UserMenu = () => {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!user) return null

  const displayName = profile?.name || user.email?.split('@')[0] || 'Người dùng'
  const handle =
    '@' +
    (user.email?.split('@')[0] || profile?.name?.replace(/\s+/g, '').toLowerCase() || 'user')
  const letter = displayName.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    setOpen(false)
    await authService.signOut()
    window.location.assign('/')
  }

  const Avatar = ({ size = 'sm' }) => {
    const box = size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs'
    const pad = size === 'lg' ? 'p-[2.5px]' : 'p-[2px]'
    return (
      <span className={`inline-flex shrink-0 rounded-full ${rainbowRing} ${pad}`}>
        <span
          className={`flex items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white ring-2 ring-white ${box}`}
        >
          {profile?.avatar ? (
            <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            letter
          )}
        </span>
      </span>
    )
  }

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center"
        aria-label="Tài khoản"
        aria-expanded={open}
      >
        <Avatar size="sm" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[300px] overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar size="lg" />
            <div className="min-w-0">
              <p className="truncate font-sans text-[16px] font-semibold leading-snug tracking-tight text-[#242424] antialiased">
                {displayName}
              </p>
              <p className="mt-0.5 truncate font-sans text-[13px] font-normal leading-snug text-[#808080] antialiased">
                {handle}
              </p>
            </div>
          </div>

          <div className="border-t border-[#f0f0f0] px-5 py-2">
            <Link
              to="/learning"
              onMouseEnter={() => preloadRoute('/learning')}
              onClick={() => setOpen(false)}
              className="block w-full py-[10px] hover:opacity-80"
            >
              <span style={itemStyle}>Khóa học của tôi</span>
            </Link>
            <Link
              to="/settings"
              onMouseEnter={() => preloadRoute('/settings')}
              onClick={() => setOpen(false)}
              className="block w-full py-[10px] hover:opacity-80"
            >
              <span style={itemStyle}>Cài đặt</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full bg-transparent py-[10px] text-left hover:opacity-80"
            >
              <span style={itemStyle}>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
