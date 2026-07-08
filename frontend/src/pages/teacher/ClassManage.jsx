import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { classService } from '../../services/classService'
import { courseService } from '../../services/courseService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { classSchema } from '../../schemas'
import TeacherTabs from '../../components/teacher/TeacherTabs'

const ClassManage = () => {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  
  const [classes, setClasses] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  
  // State form tạo lớp
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_students: 50,
    course_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState(null)

  const fetchClasses = async () => {
    setLoading(true)
    const { data, error } = await classService.getTeacherClasses()
    if (error) {
      toast.error("Lỗi tải lớp học: " + error.message)
    } else if (data) {
      setClasses(data)
    }
    setLoading(false)
  }

  const fetchCourses = async () => {
    if (!user) return
    const { data } = await courseService.getTeacherCourses(user.id)
    if (data) setCourses(data)
  }

  useEffect(() => {
    fetchClasses()
    fetchCourses()
  }, [user])

  const handleToggleActive = async (classObj) => {
    const newStatus = !classObj.is_active
    const actionText = newStatus ? "mở lại" : "tạm khóa"
    
    if (!(await confirm(`Bạn có muốn ${actionText} lớp học "${classObj.name}" không?`))) return

    const { error } = await classService.updateClass(classObj.id, { is_active: newStatus })
    if (error) {
      toast.error("Lỗi cập nhật trạng thái: " + error.message)
    } else {
      toast.success("Cập nhật thành công!")
      fetchClasses()
    }
  }

  const handleCopyLink = (code) => {
    const inviteLink = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(inviteLink)
    toast.success("Đã sao chép đường dẫn mời: " + inviteLink)
  }

  const handleCreateClass = async (e) => {
    e.preventDefault()
    setSaving(true)
    setValidationError(null)

    // Validate Zod
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      max_students: Number(formData.max_students),
      course_id: formData.course_id || null
    }

    const result = classSchema.safeParse(payload)
    if (!result.success) {
      setValidationError(result.error.errors[0].message)
      setSaving(false)
      return
    }

    const { data, error } = await classService.createClass(payload)
    if (error) {
      toast.error("Lỗi tạo lớp học: " + error.message)
    } else {
      toast.success("Tạo lớp học thành công!")
      setShowModal(false)
      setFormData({ name: '', description: '', max_students: 50, course_id: '' })
      fetchClasses()
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 text-left bg-slate-50 min-h-screen">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Lớp Học</h1>
          <p className="text-slate-500">Giảng dạy học viên của bạn thông qua việc chia nhóm học tập.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-purple-600 transition shadow-sm"
        >
          + Tạo lớp mới
        </button>
      </header>

      <TeacherTabs />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-44 w-full rounded-xl bg-white border border-slate-200 animate-pulse"></div>
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(c => (
            <div 
              key={c.id} 
              className={`rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${!c.is_active ? 'opacity-75 border-red-100' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Link to={`/teacher/classes/${c.id}`} className="text-lg font-bold text-slate-900 hover:text-accent line-clamp-1">{c.name}</Link>
                  <p className="text-xs text-slate-400 mt-1">Sĩ số: {c.student_count} / {c.max_students}</p>
                </div>
                <button 
                  onClick={() => handleToggleActive(c)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                >
                  {c.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                </button>
              </div>

              <p className="text-slate-600 text-sm h-10 line-clamp-2 mb-4">{c.description || 'Không có mô tả lớp.'}</p>

              <div className="flex flex-col gap-2 border-t pt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Mã mời: <strong className="text-slate-800 tracking-wider font-mono">{c.invite_code}</strong></span>
                  <button 
                    onClick={() => handleCopyLink(c.invite_code)}
                    className="text-accent hover:underline font-semibold"
                  >
                    Sao chép link mời
                  </button>
                </div>
                <Link 
                  to={`/teacher/classes/${c.id}`}
                  className="w-full text-center mt-2 rounded bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  Vào chi tiết lớp
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <p className="mb-4 text-slate-500">Bạn chưa tạo lớp học nào.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-slate-900 px-6 py-2 font-medium text-white hover:bg-slate-850"
          >
            Khởi tạo lớp học đầu tiên
          </button>
        </div>
      )}

      {/* Modal Tạo Lớp Học */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border text-left">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-slate-900">Tạo Lớp Học Mới</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              {validationError && (
                <div className="rounded bg-red-50 p-3 text-sm text-red-600 font-medium">{validationError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên lớp học *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Ví dụ: Toán lớp 10A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  className="w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Mục tiêu hoặc thông tin bổ sung về lớp..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Học sinh tối đa</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="200"
                    required
                    value={formData.max_students}
                    onChange={e => setFormData({...formData, max_students: e.target.value})}
                    className="w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Liên kết Khóa học</label>
                  <select 
                    value={formData.course_id}
                    onChange={e => setFormData({...formData, course_id: e.target.value})}
                    className="w-full rounded-md border p-2.5 bg-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  >
                    <option value="">-- Không bắt buộc --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600 disabled:opacity-50 text-sm"
                >
                  {saving ? 'Đang lưu...' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClassManage
