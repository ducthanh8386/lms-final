import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, profile, loading } = useAuth()

  // Chỉ hiện spinner lúc boot — tránh unmount cả cây khi auth re-check lúc đổi tab
  if (loading && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check if user is banned
  if (profile && profile.status === 'banned') {
    return <Navigate to="/login" replace />
  }

  // Role checking
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'teacher') return <Navigate to="/teacher" replace />
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
