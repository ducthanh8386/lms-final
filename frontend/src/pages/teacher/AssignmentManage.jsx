import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { assignmentService } from '../../services/assignmentService'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { assignmentSchema } from '../../schemas'

const AssignmentManage = () => {
  const { id: courseId } = useParams()
  const toast = useToast()
  const { confirm } = useConfirm()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState(null)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', due_date: '' })
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const fetchCourseInfo = useCallback(async () => {
    const { data } = await supabase.from('courses').select('title').eq('id', courseId).single()
    if (data) setCourse(data)
  }, [courseId])

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const { data } = await assignmentService.getAssignments(courseId)
    if (data) setAssignments(data)
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    fetchAssignments()
    fetchCourseInfo()
  }, [fetchAssignments, fetchCourseInfo])

  const handleSave = async (e) => {
    e.preventDefault()
    
    // Zod Validation
    const validationResult = assignmentSchema.safeParse({
      title: formData.title,
      description: formData.description || undefined,
      due_date: formData.due_date || undefined
    })

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message)
      return
    }

    setUploading(true)
    
    let fileUrl = null
    const file = fileInputRef.current?.files[0]

    try {
      if (editingId) {
        if (file) {
          const { data } = await assignmentService.uploadAssignmentFile(courseId, editingId, file)
          if (data) fileUrl = data
        }
        await assignmentService.updateAssignment(editingId, { 
          title: formData.title, 
          description: formData.description,
          due_date: formData.due_date || null,
          ...(fileUrl && { file_url: fileUrl })
        })
      } else {
        // Tạo trước để lấy ID
        const { data: newAssignment } = await assignmentService.createAssignment({
          course_id: courseId,
          title: formData.title,
          description: formData.description,
          due_date: formData.due_date || null
        })

        if (newAssignment && newAssignment.length > 0 && file) {
          const createdId = newAssignment[0].id
          const { data: fData } = await assignmentService.uploadAssignmentFile(courseId, createdId, file)
          if (fData) {
            await assignmentService.updateAssignment(createdId, { file_url: fData })
          }
        }
      }
      
      setShowForm(false)
      setFormData({ title: '', description: '', due_date: '' })
      setEditingId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success("Lưu bài tập thành công!")
      fetchAssignments()
    } catch (err) {
      console.error(err)
      toast.error("Có lỗi xảy ra")
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      title: item.title,
      description: item.description || '',
      due_date: item.due_date ? new Date(item.due_date).toISOString().slice(0, 16) : ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (await confirm("Bạn có chắc muốn xóa bài tập này?")) {
      await assignmentService.deleteAssignment(id)
      toast.success("Đã xóa bài tập!")
      fetchAssignments()
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 text-left">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/teacher/courses" className="text-sm font-medium text-slate-500 hover:text-accent">
            &larr; Quay lại danh sách
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Quản lý Bài tập - {course?.title || 'Khóa học'}
          </h1>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData({ title: '', description: '', due_date: '' })
          }}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600 self-start sm:self-auto"
        >
          + Thêm Bài Tập
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-8 rounded-xl border bg-slate-50 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">{editingId ? 'Sửa bài tập' : 'Thêm bài tập mới'}</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="assignment-title" className="block text-sm font-medium text-slate-700">Tên bài tập *</label>
              <input
                id="assignment-title"
                type="text" required
                className="mt-1 block w-full rounded-md border p-2"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="assignment-description" className="block text-sm font-medium text-slate-700">Mô tả / Đề bài</label>
              <textarea
                id="assignment-description"
                rows="3"
                className="mt-1 block w-full rounded-md border p-2"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label htmlFor="assignment-due" className="block text-sm font-medium text-slate-700">Hạn nộp (Không bắt buộc)</label>
              <input
                id="assignment-due"
                type="datetime-local"
                className="mt-1 block w-full rounded-md border p-2"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
              />
            </div>

            <div>
              <label htmlFor="assignment-file" className="block text-sm font-medium text-slate-700">Đính kèm file (PDF, Docx...)</label>
              <input
                id="assignment-file"
                type="file"
                ref={fileInputRef}
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-300"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-4 py-2 font-medium text-slate-600 hover:bg-slate-200"
            >
              Hủy
            </button>
            <button
              type="submit" disabled={uploading}
              className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {uploading ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Đang tải...</p>
      ) : assignments.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="overflow-x-auto w-full rounded-xl border bg-white shadow-sm hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 font-semibold text-slate-900">Tên bài tập</th>
                  <th className="p-4 font-semibold text-slate-900">Hạn nộp</th>
                  <th className="p-4 font-semibold text-slate-900 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(item => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      {item.file_url && <span className="text-xs text-accent font-medium">Có đính kèm file</span>}
                    </td>
                    <td className="p-4 text-slate-600">
                      {item.due_date ? new Date(item.due_date).toLocaleString() : 'Không có'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
                        <Link 
                          to={`/teacher/assignments/${item.id}/submissions`}
                          className="font-medium text-green-600 hover:underline"
                        >
                          Chấm bài
                        </Link>
                        <button onClick={() => handleEdit(item)} className="font-medium text-blue-600 hover:underline">Sửa</button>
                        <button onClick={() => handleDelete(item.id)} className="font-medium text-red-600 hover:underline">Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden space-y-4">
            {assignments.map(item => (
              <div key={item.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
                <div>
                  <div className="font-bold text-slate-900">{item.title}</div>
                  {item.file_url && <span className="rounded bg-purple-50 border border-purple-100 text-[10px] font-bold text-accent px-1.5 py-0.5 mt-1.5 inline-block">Có đính kèm file</span>}
                </div>
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">Hạn nộp: </span>
                  {item.due_date ? new Date(item.due_date).toLocaleString() : 'Không có'}
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 text-sm">
                  <Link 
                    to={`/teacher/assignments/${item.id}/submissions`}
                    className="font-semibold text-green-600 hover:underline"
                  >
                    Chấm bài
                  </Link>
                  <button onClick={() => handleEdit(item)} className="font-semibold text-blue-600 hover:underline">Sửa</button>
                  <button onClick={() => handleDelete(item.id)} className="font-semibold text-red-600 hover:underline">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          Chưa có bài tập nào. Hãy thêm bài tập đầu tiên!
        </div>
      )}
    </div>
  )
}

export default AssignmentManage
