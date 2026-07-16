import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { teacherService } from '../../services/teacherService'
import TeacherTabs from '../../components/teacher/TeacherTabs'

const Students = () => {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchEnrollments = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await teacherService.getEnrolledStudents(user.id)
    if (data) setEnrollments(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchEnrollments()
  }, [fetchEnrollments])

  // Filter enrollments based on search term
  const filteredEnrollments = enrollments.filter(enrollment => {
    const term = searchTerm.toLowerCase()
    const studentName = enrollment.profiles?.name?.toLowerCase() || ''
    const studentEmail = enrollment.profiles?.email?.toLowerCase() || ''
    const courseTitle = enrollment.courses?.title?.toLowerCase() || ''
    
    return studentName.includes(term) || studentEmail.includes(term) || courseTitle.includes(term)
  })

  // Xuất danh sách học viên ra CSV
  const handleExportCSV = () => {
    if (filteredEnrollments.length === 0) return
    const headers = ['Học viên', 'Email', 'Khóa học đăng ký', 'Ngày tham gia']
    const rows = filteredEnrollments.map(e => [
      e.profiles?.name || 'Khách',
      e.profiles?.email || 'N/A',
      e.courses?.title || 'N/A',
      e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('vi-VN') : 'N/A'
    ])
    
    let csvContent = '\uFEFF' // BOM giúp Excel hiển thị đúng font Tiếng Việt
    csvContent += headers.join(',') + '\n'
    rows.forEach(row => {
      const escapedRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`)
      csvContent += escapedRow.join(',') + '\n'
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `danh_sach_hoc_vien_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Giảng Viên Dashboard</h1>
          <p className="text-slate-500">Quản lý khóa học, đơn hàng và cài đặt thanh toán.</p>
        </div>
      </header>

      <TeacherTabs />

      {/* Control bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md flex gap-2">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email hoặc khóa học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleExportCSV}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 shrink-0 cursor-pointer"
            title="Xuất danh sách học viên ra file CSV"
          >
            Xuất CSV
          </button>
        </div>
        <div className="text-sm text-slate-500">
          Tổng số học viên: <span className="font-semibold text-slate-800">{filteredEnrollments.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Đang tải danh sách học viên...</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 font-medium text-slate-600">Học viên</th>
                  <th className="p-4 font-medium text-slate-600">Email</th>
                  <th className="p-4 font-medium text-slate-600">Khóa học đăng ký</th>
                  <th className="p-4 font-medium text-slate-600">Ngày tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEnrollments.map(enrollment => (
                  <tr key={enrollment.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">
                      {enrollment.profiles?.name || 'Khách'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {enrollment.profiles?.email || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-800 font-medium">
                      {enrollment.courses?.title}
                    </td>
                    <td className="p-4 text-slate-500">
                      {enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                  </tr>
                ))}
                {filteredEnrollments.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500">
                      Không tìm thấy học viên nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden space-y-4">
            {filteredEnrollments.map(enrollment => (
              <div key={enrollment.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900">{enrollment.profiles?.name || 'Khách'}</div>
                    <div className="text-xs text-slate-500">{enrollment.profiles?.email || 'N/A'}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-2 text-xs">
                  <span className="font-semibold text-slate-600 block">Khóa học:</span>
                  <span className="text-slate-800 font-medium">{enrollment.courses?.title}</span>
                </div>
              </div>
            ))}
            {filteredEnrollments.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-slate-500 text-sm">
                Không tìm thấy học viên nào.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Students
