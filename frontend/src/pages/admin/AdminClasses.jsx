import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'

const STATUS_VI = {
  recruiting: 'Đang tuyển sinh',
  upcoming: 'Sắp khai giảng',
  ongoing: 'Đang học',
  finished: 'Đã kết thúc',
}

const AdminClasses = () => {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await adminService.getAllClasses()
      const rows = (data || []).map((c) => ({
        ...c,
        student_count: (c.class_members || []).filter((m) => m.status === 'active').length,
      }))
      setClasses(rows)
      setLoading(false)
    })()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Lớp Zoom</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng quan toàn hệ thống. Tạo lớp mới ở khu vực giảng viên (Admin cũng vào được).
          </p>
        </div>
        <Link
          to="/teacher/classes"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          + Tạo lớp Zoom
        </Link>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Khóa</th>
                <th className="px-4 py-3">Lịch</th>
                <th className="px-4 py-3">Giáo viên</th>
                <th className="px-4 py-3">Sĩ số</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/teacher/classes/${c.id}`} className="text-indigo-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.courses?.title || '—'}</td>
                  <td className="px-4 py-3">{c.schedule_label || '—'}</td>
                  <td className="px-4 py-3">{c.profiles?.name || '—'}</td>
                  <td className="px-4 py-3">
                    {c.student_count}/{c.max_students}
                  </td>
                  <td className="px-4 py-3">{STATUS_VI[c.status] || c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminClasses
