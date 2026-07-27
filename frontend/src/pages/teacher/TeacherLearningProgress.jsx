import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { teacherService } from '../../services/teacherService'

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

const formatLastStudied = (iso) => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  const diffDays = Math.round((today - target) / 86400000)
  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatLastLesson = (row) => {
  if (row.progressPercent >= 100) return 'Hoàn thành'
  if (!row.lastLessonTitle && row.lastLessonOrder == null) return '—'
  const order =
    row.lastLessonOrder != null && row.lastLessonOrder > 0
      ? row.lastLessonOrder
      : row.lastLessonOrder === 0
        ? 1
        : null
  if (order != null) {
    return row.lastLessonTitle ? `Bài ${order}: ${row.lastLessonTitle}` : `Bài ${order}`
  }
  return row.lastLessonTitle
}

const TeacherLearningProgress = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [rows, setRows] = useState([])
  const [courseId, setCourseId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const loadCourses = useCallback(async () => {
    if (!user) return
    const { data } = await teacherService.getPurchaseCourses(user.id)
    setCourses(data || [])
  }, [user])

  const loadProgress = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await teacherService.getCourseLearningProgress(
      user.id,
      courseId || null
    )
    setRows(data || [])
    setLoading(false)
  }, [user, courseId])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(
      (r) =>
        r.studentName?.toLowerCase().includes(term) ||
        r.studentEmail?.toLowerCase().includes(term) ||
        r.courseTitle?.toLowerCase().includes(term)
    )
  }, [rows, searchTerm])

  const handleExportCSV = () => {
    if (filtered.length === 0) return
    const headers = ['Học viên', 'Email', 'Khóa học', 'Tiến độ (%)', 'Bài cuối học', 'Ngày học gần nhất']
    const csvRows = filtered.map((r) => [
      r.studentName,
      r.studentEmail,
      r.courseTitle,
      String(r.progressPercent),
      formatLastLesson(r),
      formatLastStudied(r.lastStudiedAt),
    ])

    let csvContent = '\uFEFF'
    csvContent += headers.join(',') + '\n'
    csvRows.forEach((row) => {
      csvContent += row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `tien_do_hoc_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Tiến độ học</h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Theo dõi tiến độ học viên trên khóa video (đã mua) — không phải điểm danh lớp học.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:max-w-xs"
          >
            <option value="">Tất cả khóa video</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:max-w-md"
          />
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orangeHover shrink-0 cursor-pointer"
          >
            Xuất CSV
          </button>
        </div>
        <div className="text-sm text-slate-500">
          {filtered.length} học viên
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Đang tải tiến độ...</div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-4 font-medium text-slate-600">Học viên</th>
                  <th className="p-4 font-medium text-slate-600">Khóa học</th>
                  <th className="p-4 font-medium text-slate-600">Tiến độ</th>
                  <th className="p-4 font-medium text-slate-600">Bài cuối học</th>
                  <th className="p-4 font-medium text-slate-600">Ngày học gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((row) => (
                  <tr key={`${row.enrollmentId}`} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{row.studentName}</div>
                      <div className="text-xs text-slate-500">{row.studentEmail}</div>
                    </td>
                    <td className="p-4 text-slate-800">{row.courseTitle}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${row.progressPercent}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-800">{row.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{formatLastLesson(row)}</td>
                    <td className="p-4 text-slate-600">{formatLastStudied(row.lastStudiedAt)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      Chưa có học viên enroll khóa video, hoặc chưa có dữ liệu tiến độ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((row) => (
              <div key={row.enrollmentId} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="font-bold text-slate-900">{row.studentName}</div>
                <div className="text-xs text-slate-500">{row.studentEmail}</div>
                <div className="mt-2 text-sm text-slate-700">{row.courseTitle}</div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${row.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{row.progressPercent}%</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="block text-slate-400">Bài cuối</span>
                    {formatLastLesson(row)}
                  </div>
                  <div>
                    <span className="block text-slate-400">Học gần nhất</span>
                    {formatLastStudied(row.lastStudiedAt)}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                Chưa có dữ liệu tiến độ.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default TeacherLearningProgress
