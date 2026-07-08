import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { useToast } from '../../context/ToastContext'

const AdminDashboard = () => {
  const toast = useToast()
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    pendingCourses: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const { data, error } = await adminService.getDashboardStats()
      if (error) {
        toast.error("Lỗi tải thông tin thống kê: " + error.message)
      } else if (data) {
        setStats(data)
      }
      setLoading(false)
    }
    fetchStats()
  }, [toast])

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 text-left">
      <h1 className="mb-8 text-3xl font-bold text-slate-900">Admin Dashboard</h1>

      {/* Stats Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-white p-6 shadow-sm border-l-4 border-l-success animate-fadeIn">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Doanh Thu</h3>
          {loading ? (
            <div className="mt-2 h-9 w-28 animate-pulse rounded bg-slate-100"></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalRevenue.toLocaleString('vi-VN')}đ</p>
          )}
          <p className="mt-1 text-[11px] text-success font-medium">Đơn hàng hoàn tất</p>
        </div>
        
        <div className="rounded-xl border bg-white p-6 shadow-sm border-l-4 border-l-accent animate-fadeIn">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Học Viên</h3>
          {loading ? (
            <div className="mt-2 h-9 w-16 animate-pulse rounded bg-slate-100"></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
          )}
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Học viên đăng ký</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm border-l-4 border-l-purple-500 animate-fadeIn">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Giáo Viên</h3>
          {loading ? (
            <div className="mt-2 h-9 w-16 animate-pulse rounded bg-slate-100"></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalTeachers}</p>
          )}
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Giảng viên đứng lớp</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm border-l-4 border-l-blue-500 animate-fadeIn">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Khóa Học</h3>
          {loading ? (
            <div className="mt-2 h-9 w-16 animate-pulse rounded bg-slate-100"></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalCourses}</p>
          )}
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Khóa học đã duyệt</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm border-l-4 border-l-warning animate-fadeIn">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ Duyệt</h3>
          {loading ? (
            <div className="mt-2 h-9 w-12 animate-pulse rounded bg-slate-100"></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.pendingCourses}</p>
          )}
          <p className="mt-1 text-[11px] text-warning font-medium">Khóa học chờ duyệt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/courses" className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md hover:border-accent group">
          <div className="mb-4 inline-block rounded-lg bg-warning/10 p-3 text-warning">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 group-hover:text-accent">Duyệt Khóa Học</h2>
          <p className="text-slate-500 text-sm">Xem các khóa học đang chờ duyệt (Pending) và quyết định Approve hoặc Reject.</p>
        </Link>
        
        <Link to="/admin/users" className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md hover:border-accent group">
          <div className="mb-4 inline-block rounded-lg bg-accent/10 p-3 text-accent">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 group-hover:text-accent">Quản lý Người Dùng</h2>
          <p className="text-slate-500 text-sm">Xem danh sách, phân quyền (Role) và Khóa/Mở khóa tài khoản.</p>
        </Link>
      </div>
    </div>
  )
}

export default AdminDashboard
