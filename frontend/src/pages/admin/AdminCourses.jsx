import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { useToast } from '../../context/ToastContext'
import CourseModeBadge from '../../components/course/CourseModeBadge'

/**
 * @param {'purchase'|'consultation'} courseMode — tách danh sách Video vs Zoom
 */
const AdminCourses = ({ courseMode = 'purchase' }) => {
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const isZoom = courseMode === 'consultation'

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
    let list = courses.filter((c) => (c.enrollment_mode || 'purchase') === courseMode)
    if (statusFilter === 'pending' || statusFilter === 'approved' || statusFilter === 'rejected') {
      list = list.filter((c) => c.status === statusFilter)
    }
    return list
  }, [courses, courseMode, statusFilter])

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

  const createHref = isZoom ? '/admin/zoom-courses/new' : '/admin/courses/new'

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {isZoom ? 'Khóa Zoom' : 'Khóa Video'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isZoom
              ? 'Tạo khóa Zoom riêng · phân công GV · form tư vấn · xếp lớp.'
              : 'Tạo khóa Video · phân công GV · SePay · bài học / tài liệu.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={createHref}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${
              isZoom ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-700 hover:bg-teal-800'
            }`}
          >
            {isZoom ? '+ Tạo khóa Zoom' : '+ Tạo khóa Video'}
          </Link>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
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
                <th className="px-4 py-3">{isZoom ? 'Học phí (tham khảo)' : 'Giá'}</th>
                <th className="px-4 py-3">Thời lượng</th>
                <th className="px-4 py-3">Giáo viên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
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
                    {isZoom
                      ? c.price > 0
                        ? `${Number(c.price).toLocaleString('vi-VN')}đ`
                        : 'Liên hệ'
                      : c.is_free
                        ? 'Miễn phí'
                        : `${Number(c.price || 0).toLocaleString('vi-VN')}đ`}
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
                      to={
                        isZoom
                          ? `/admin/zoom-courses/${c.id}/edit`
                          : `/admin/courses/${c.id}/edit`
                      }
                      className="mr-3 text-indigo-600 hover:underline"
                    >
                      Sửa
                    </Link>
                    {!isZoom && (
                      <Link
                        to={`/teacher/courses/${c.id}/lessons`}
                        className="text-teal-700 hover:underline"
                      >
                        Video/Tài liệu
                      </Link>
                    )}
                    {isZoom && (
                      <Link to="/admin/classes" className="text-blue-700 hover:underline">
                        Lớp Zoom
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    {isZoom ? 'Chưa có khóa Zoom.' : 'Chưa có khóa Video.'}
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
