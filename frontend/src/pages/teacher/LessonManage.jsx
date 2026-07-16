import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { courseService } from '../../services/courseService'
import { lessonSchema } from '../../schemas'

import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

const getYoutubeId = (url) => {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}

const LessonManage = () => {
  const { id: courseId } = useParams()
  const toast = useToast()
  const { confirm } = useConfirm()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'video',
    content: '',
    order_index: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: cData } = await supabase.from('courses').select('*').eq('id', courseId).single()
      if (cData) setCourse(cData)

      const { data: lData } = await courseService.getCourseLessons(courseId)
      if (lData) setLessons(lData)
      
      setLoading(false)
    }
    fetchData()
  }, [courseId])

  const handleSaveLesson = async (e) => {
    e.preventDefault()
    
    // Zod Validation
    const validationResult = lessonSchema.safeParse({
      title: formData.title,
      content_type: formData.content_type,
      content: formData.content,
      order_index: Number(formData.order_index)
    })

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message)
      return
    }

    const payload = { ...formData, course_id: courseId }
    
    if (editingLessonId) {
      const { data, error } = await courseService.updateLesson(editingLessonId, payload)
      if (!error && data) {
        setLessons(prev => prev.map(l => l.id === editingLessonId ? data[0] : l))
        setShowForm(false)
        setEditingLessonId(null)
        setFormData({ title: '', content_type: 'video', content: '', order_index: lessons.length })
        toast.success("Cập nhật bài học thành công!")
      } else {
        toast.error("Lỗi khi cập nhật bài học: " + error?.message)
      }
    } else {
      const { data, error } = await courseService.createLesson(payload)
      if (!error && data) {
        setLessons([...lessons, data[0]])
        setShowForm(false)
        setFormData({ title: '', content_type: 'video', content: '', order_index: lessons.length + 1 })
        toast.success("Đã thêm bài học thành công!")
      } else {
        toast.error("Lỗi khi lưu bài học: " + error?.message)
      }
    }
  }

  const handleEditLesson = (lesson) => {
    setEditingLessonId(lesson.id)
    setFormData({
      title: lesson.title,
      content_type: lesson.content_type,
      content: lesson.content,
      order_index: lesson.order_index
    })
    setShowForm(true)
  }

  const handleDeleteLesson = async (lessonId) => {
    if (!(await confirm("Bạn có chắc chắn muốn xóa bài học này?"))) return
    const { error } = await courseService.deleteLesson(lessonId)
    if (error) {
      toast.error("Lỗi xóa bài học: " + error.message)
    } else {
      setLessons(prev => prev.filter(l => l.id !== lessonId))
      toast.success("Xóa bài học thành công!")
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 text-left">
      <div className="mb-6">
        <Link to="/teacher/courses" className="text-sm font-medium text-accent hover:underline">← Quay lại danh sách khóa học</Link>
      </div>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bài học: {course?.title || 'Đang tải...'}
          </h1>
          <p className="text-slate-500">Quản lý nội dung bài học trong khóa này.</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link 
            to={`/teacher/courses/${courseId}/quizzes`}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 text-center text-sm"
          >
            Quản lý trắc nghiệm
          </Link>
          <button 
            onClick={() => {
              setEditingLessonId(null)
              setFormData({ title: '', content_type: 'video', content: '', order_index: lessons.length + 1 })
              setShowForm(true)
            }}
            className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600 text-sm"
          >
            + Thêm bài học
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleSaveLesson} className="mb-8 rounded-xl border bg-slate-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {editingLessonId ? 'Sửa Bài Học' : 'Thêm Bài Học Mới'}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="lesson-title" className="block text-sm font-medium text-slate-700">Tên bài học *</label>
              <input
                id="lesson-title"
                type="text" required
                className="mt-1 w-full rounded border p-2"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="lesson-order" className="block text-sm font-medium text-slate-700">Thứ tự</label>
              <input
                id="lesson-order"
                type="number"
                className="mt-1 w-full rounded border p-2"
                value={formData.order_index}
                onChange={e => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label htmlFor="lesson-type" className="block text-sm font-medium text-slate-700">Loại nội dung</label>
              <select
                id="lesson-type"
                className="mt-1 w-full rounded border p-2"
                value={formData.content_type}
                onChange={e => setFormData({...formData, content_type: e.target.value})}
              >
                <option value="video">Video (YouTube Link)</option>
                <option value="text">Văn bản (Text/HTML)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="lesson-content" className="block text-sm font-medium text-slate-700">Nội dung (Link Youtube hoặc Text) *</label>
              <textarea
                id="lesson-content"
                required rows="3"
                className="mt-1 w-full rounded border p-2"
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                placeholder={formData.content_type === 'video' ? 'https://youtube.com/watch?v=...' : 'Nhập nội dung bài học...'}
              />
            </div>
            {formData.content_type === 'video' && getYoutubeId(formData.content) && (
              <div className="mt-4 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Xem trước Video</label>
                <div className="aspect-video w-full max-w-md rounded-lg overflow-hidden border bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${getYoutubeId(formData.content)}`}
                    title="Video Preview"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => {
                setShowForm(false)
                setEditingLessonId(null)
              }} 
              className="rounded px-4 py-2 hover:bg-slate-200"
            >
              Hủy
            </button>
            <button type="submit" className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600">
              Lưu
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Đang tải bài học...</p>
      ) : lessons.length > 0 ? (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center justify-between rounded border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                  {lesson.order_index}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{lesson.title}</h3>
                  <p className="text-xs text-slate-500 uppercase">{lesson.content_type}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleEditLesson(lesson)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Sửa
                </button>
                <button 
                  onClick={() => handleDeleteLesson(lesson.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">Chưa có bài học nào trong khóa này.</p>
      )}
    </div>
  )
}

export default LessonManage
