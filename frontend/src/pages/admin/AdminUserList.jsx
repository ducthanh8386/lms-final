import React, { useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'
import { useToast } from '../../context/ToastContext'

const AdminUserList = ({ role }) => {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const title = role === 'teacher' ? 'Quản lý giáo viên' : 'Quản lý học viên'

  const load = async () => {
    setLoading(true)
    const { data, error } =
      role === 'teacher' ? await adminService.getTeachers() : await adminService.getStudents()
    if (error) toast.error(error.message)
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [role])

  const toggleBan = async (u) => {
    const next = u.status === 'active' ? 'banned' : 'active'
    const { error } = await adminService.updateUserStatus(u.id, next)
    if (error) toast.error(error.message)
    else {
      toast.success('Đã cập nhật')
      load()
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {users.length} tài khoản · khóa/mở nhanh. Tạo user mới tại trang Users cũ nếu cần.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">{u.status || 'active'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleBan(u)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      {u.status === 'banned' ? 'Mở khóa' : 'Khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export const AdminTeachers = () => <AdminUserList role="teacher" />
export const AdminStudents = () => <AdminUserList role="student" />
export default AdminUserList
