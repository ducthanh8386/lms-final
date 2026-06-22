import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const TeacherTabs = () => {
  const location = useLocation()
  const currentPath = location.pathname

  const tabs = [
    { path: '/teacher/courses', label: 'Khóa học' },
    { path: '/teacher/orders', label: 'Đơn hàng' },
    { path: '/teacher/settings', label: 'Cài đặt Thanh toán' },
  ]

  return (
    <div className="mb-6 flex gap-4 border-b">
      {tabs.map((tab) => {
        const isActive = currentPath === tab.path || currentPath.startsWith(tab.path + '/')
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`border-b-2 pb-2 font-medium ${
              isActive
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

export default TeacherTabs
