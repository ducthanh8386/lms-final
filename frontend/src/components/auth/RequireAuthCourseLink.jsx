import React, { startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import { preloadRoute } from '../../utils/routePreload'

/**
 * Click khóa học: đã login → vào chi tiết; chưa login → mở modal đăng nhập.
 */
const RequireAuthCourseLink = ({ courseId, className, children }) => {
  const { user, loading } = useAuth()
  const { openLogin } = useAuthModal()
  const navigate = useNavigate()
  const to = `/courses/${courseId}`

  const handleClick = (e) => {
    e.preventDefault()
    if (loading) return
    if (user) {
      startTransition(() => {
        navigate(to)
      })
      return
    }
    openLogin(to)
  }

  return (
    <a
      href={to}
      onClick={handleClick}
      onMouseEnter={() => {
        if (user) preloadRoute(to)
      }}
      className={className}
    >
      {children}
    </a>
  )
}

export default RequireAuthCourseLink
