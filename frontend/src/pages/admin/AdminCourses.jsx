import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { useToast } from '../../context/ToastContext'
import CourseModeBadge from '../../components/course/CourseModeBadge'

const AdminCourses = () => {
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    const [{ data: c }, { data: t }] = await Promise.all([
      adminService.getAllCourses(),
      adminService.getTeachers(),
    ])
    setCourses(c || [])
    setTeachers(t || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return courses
    if (filter === 'purchase' || filter === 'consultation') {
      return courses.filter((c) => (c.enrollment_mode || 'purchase') === filter)
    }
    return courses.filter((c) => c.status === filter)
  }, [courses, filter])

  const onAssign = async (courseId, teacherId) => {
    const nextId = teacherId || null
    const teacher = teachers.find((t) => t.id === nextId)
    const { error } = await adminService.assignTeacher(courseId, nextId)
    if (error) toast.error(error.message)
    else {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                teacher_id: nextId,
                profiles: teacher
                  ? { id: teacher.id, name: teacher.name, email: teacher.email }
                  : null,
              }
            : c
        )
      )
      toast.success('Đã phân công giáo viên')
    }
  }

  const onStatus = async (courseId, status) => {
    const { error } = await adminService.updateCourseStatus(courseId, status)
    if (error) toast.error(error.message)
    else {
      setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, status } : c)))
      toast.success('Cập nhật trạng thái khóa')
    }
  }

  const onDuration = async (courseId, months) => {
    const value = months === '' ? null : Number(months)
    const { error } = await adminService.updateCourseMeta(courseId, { duration_months: value })
    if (error) toast.error(error.message)
    else {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, duration_months: value } : c))
      )
      toast.success('Đã lưu thời lượng')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Quản lý khóa học</h1>
          <p className="mt-1 text-sm text-slate-500">
            Admin tạo khóa Video/Zoom · phân công GV · upload bài học/tài liệu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/courses/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
          >
            + Tạo khóa học
          </Link>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="purchase">Khóa video</option>
            <option value="consultation">Khóa Zoom</option>
          </select>
        </div>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Khóa học</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Giá</th>
                <th className="px-4 py-3">Thời lượng</th>
                <th className="px-4 py-3">Giáo viên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                  <td className="px-4 py-3">
                    <CourseModeBadge mode={c.enrollment_mode} variant="soft" size="md" />
                  </td>
                  <td className="px-4 py-3">
                    {c.is_free ? 'Miễn phí' : `${Number(c.price || 0).toLocaleString('vi-VN')}đ`}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      defaultValue={c.duration_months ?? ''}
                      placeholder="tháng"
                      className="w-20 rounded border px-2 py-1 text-sm"
                      onBlur={(e) => onDuration(c.id, e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.teacher_id || ''}
                      onChange={(e) => onAssign(c.id, e.target.value)}
                      className="max-w-[180px] rounded border px-2 py-1 text-sm"
                    >
                      <option value="">— Chọn GV —</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || t.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => onStatus(c.id, e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="pending">Chờ duyệt</option>
                      <option value="approved">Đã duyệt</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      to={`/admin/courses/${c.id}/edit`}
                      className="mr-3 text-indigo-600 hover:underline"
                    >
                      Sửa
                    </Link>
                    <Link
                      to={`/teacher/courses/${c.id}/lessons`}
                      className="text-teal-700 hover:underline"
                    >
                      Video/Tài liệu
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    Không có khóa học.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminCourses
