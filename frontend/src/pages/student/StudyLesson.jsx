import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { courseService } from '../../services/courseService'
import { studentService } from '../../services/studentService'
import { assignmentService } from '../../services/assignmentService'
import { quizService } from '../../services/quizService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import DOMPurify from 'dompurify'

const StudyLesson = () => {
  const { id: courseId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const [course, setCourse] = useState(null)
  
  const [lessons, setLessons] = useState([])
  const [assignments, setAssignments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  
  const [activeItem, setActiveItem] = useState({ type: 'lesson', data: null }) // { type: 'lesson' | 'assignment', data: object }
  const [completedIds, setCompletedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Assignment states
  const [submission, setSubmission] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Close sidebar on mobile when active lesson/assignment changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [activeItem])

  useEffect(() => {
    const fetchData = async () => {
      const { data: cData } = await courseService.getCourseDetail(courseId)
      if (cData) setCourse(cData)

      const { data: lData } = await courseService.getCourseLessons(courseId)
      if (lData && lData.length > 0) {
        setLessons(lData)
        setActiveItem(prev => {
          if (prev && prev.data && prev.data.course_id === courseId) return prev
          return { type: 'lesson', data: lData[0] }
        })
      }

      const { data: aData } = await assignmentService.getAssignments(courseId)
      if (aData) {
        setAssignments(aData)
        // If no lessons but have assignments
        if ((!lData || lData.length === 0) && aData.length > 0) {
          setActiveItem(prev => {
            if (prev && prev.data && prev.data.course_id === courseId) return prev
            return { type: 'assignment', data: aData[0] }
          })
        }
      }

      // Fetch published quizzes of the course
      const { data: qzData } = await quizService.getQuizzesByCourse(courseId)
      if (qzData) {
        setQuizzes(qzData.filter(q => q.is_published))
      }

      if (user) {
        const { data: pData } = await studentService.getCourseProgress(user.id, courseId)
        if (pData && lData) {
          const courseLessonIds = new Set(lData.map(l => l.id))
          const filteredProgress = pData
            .filter(p => courseLessonIds.has(p.lesson_id))
            .map(p => p.lesson_id)
          setCompletedIds(filteredProgress)
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [courseId, user])

  // Fetch submission when active assignment changes
  useEffect(() => {
    if (activeItem.type === 'assignment' && activeItem.data && user) {
      const fetchSub = async () => {
        const { data } = await assignmentService.getStudentSubmission(activeItem.data.id, user.id)
        setSubmission(data || null)
      }
      fetchSub()
    }
  }, [activeItem, user])

  const handleCompleteLesson = async () => {
    if (!user || activeItem.type !== 'lesson' || !activeItem.data) return
    if (completedIds.includes(activeItem.data.id)) return

    const { error } = await studentService.completeLesson(user.id, activeItem.data.id)
    if (!error) {
      setCompletedIds(prev => [...prev, activeItem.data.id])
    }
  }

  const handleDownloadAssignmentFile = async (fileUrl) => {
    try {
      const { data } = await assignmentService.downloadFile('assignment-files', fileUrl)
      if (data) window.open(data, '_blank')
    } catch (e) {
      toast.error("Lỗi tải file")
    }
  }

  const handleDownloadSubmissionFile = async (fileUrl) => {
    try {
      const { data } = await assignmentService.downloadFile('submission-files', fileUrl)
      if (data) window.open(data, '_blank')
    } catch (e) {
      toast.error("Lỗi tải file")
    }
  }

  const handleSubmitAssignment = async (e) => {
    e.preventDefault()
    if (!user || activeItem.type !== 'assignment' || !activeItem.data) return
    
    const file = fileInputRef.current?.files[0]
    if (!file) {
      toast.error("Vui lòng chọn file để nộp")
      return
    }

    setUploading(true)
    try {
      const { data: filePath } = await assignmentService.uploadSubmissionFile(courseId, activeItem.data.id, file)
      if (filePath) {
        await assignmentService.submitAssignment({
          assignment_id: activeItem.data.id,
          student_id: user.id,
          file_url: filePath
        })
        
        // Refresh submission
        const { data } = await assignmentService.getStudentSubmission(activeItem.data.id, user.id)
        setSubmission(data)
        if (fileInputRef.current) fileInputRef.current.value = ''
        toast.success("Nộp bài thành công!")
      }
    } catch (err) {
      console.error(err)
      toast.error("Có lỗi xảy ra khi nộp bài")
    } finally {
      setUploading(false)
    }
  }


  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  if (loading) return <div className="p-8">Đang tải nội dung...</div>
  if (!course) return <div className="p-8">Không tìm thấy khóa học!</div>

  const progressPercent = lessons.length > 0 ? Math.round((completedIds.length / lessons.length) * 100) : 0

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col md:flex-row text-left bg-slate-50">
      
      {/* Sidebar: Danh sách bài học */}
      <div className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex w-full border-r bg-white md:w-80 overflow-y-auto shrink-0 flex-col h-72 md:h-full border-b md:border-b-0`}>
        <div className="p-4 border-b">
          <Link to="/learning" className="mb-2 block text-xs font-medium text-accent hover:underline">← Về danh sách khóa học</Link>
          <h2 className="font-bold text-slate-900 line-clamp-2">{course.title}</h2>
          
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
              <span>Tiến độ</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Lessons */}
          {lessons.length > 0 && (
            <div className="px-4 py-2 text-xs font-bold uppercase text-slate-400 bg-slate-50">Bài học</div>
          )}
          {lessons.map((lesson, idx) => {
            const isCompleted = completedIds.includes(lesson.id)
            const isActive = activeItem.type === 'lesson' && activeItem.data?.id === lesson.id

            return (
              <button
                key={lesson.id}
                onClick={() => setActiveItem({ type: 'lesson', data: lesson })}
                className={`flex w-full items-center gap-3 border-b p-4 text-left transition ${isActive ? 'bg-slate-100 border-l-4 border-l-accent' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 text-slate-500'}`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${isActive ? 'text-accent' : 'text-slate-700'}`}>{lesson.title}</div>
                  <div className="text-xs text-slate-500">{lesson.content_type === 'video' ? '📺 Video' : '📄 Văn bản'}</div>
                </div>
              </button>
            )
          })}

          {/* Assignments */}
          {assignments.length > 0 && (
            <div className="px-4 py-2 mt-2 text-xs font-bold uppercase text-slate-400 bg-slate-50 border-t">Bài tập</div>
          )}
          {assignments.map((assignment, idx) => {
            const isActive = activeItem.type === 'assignment' && activeItem.data?.id === assignment.id

            return (
              <button
                key={assignment.id}
                onClick={() => setActiveItem({ type: 'assignment', data: assignment })}
                className={`flex w-full items-center gap-3 border-b p-4 text-left transition ${isActive ? 'bg-slate-100 border-l-4 border-l-purple-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-purple-200 bg-purple-50 text-purple-600 text-xs">
                  📝
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${isActive ? 'text-purple-700' : 'text-slate-700'}`}>{assignment.title}</div>
                  {assignment.due_date && <div className="text-xs text-slate-500">Hạn: {new Date(assignment.due_date).toLocaleDateString()}</div>}
                </div>
              </button>
            )
          })}

          {/* Quizzes */}
          {quizzes.length > 0 && (
            <div className="px-4 py-2 mt-2 text-xs font-bold uppercase text-slate-400 bg-slate-50 border-t">Trắc nghiệm</div>
          )}
          {quizzes.map((quizItem, idx) => {
            return (
              <Link
                key={quizItem.id}
                to={`/learning/${courseId}/quiz/${quizItem.id}`}
                className="flex w-full items-center gap-3 border-b p-4 text-left hover:bg-slate-50 transition border-l-4 border-l-transparent text-slate-700"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-orange-200 bg-orange-50 text-orange-600 text-xs">
                  💡
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium leading-relaxed">{quizItem.title}</div>
                  <div className="text-xs text-slate-400 font-semibold">{quizItem.time_limit_minutes ? `${quizItem.time_limit_minutes} phút` : 'Tự do'}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="md:hidden mb-4 flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            {sidebarOpen ? '✕ Ẩn bài học' : '☰ Hiện danh sách bài học'}
          </button>
          <span className="text-xs font-bold text-slate-500">{progressPercent}% Hoàn thành</span>
        </div>

        {activeItem.type === 'lesson' && activeItem.data ? (
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-2xl font-bold text-slate-900">{activeItem.data.title}</h1>
            
            {activeItem.data.content_type === 'video' ? (
              <div className="mb-8 aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
                <iframe 
                  width="100%" height="100%" 
                  src={`https://www.youtube.com/embed/${getYoutubeId(activeItem.data.content) || activeItem.data.content}`} 
                  title="YouTube video player" frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div 
                className="mb-8 rounded-xl bg-white p-6 shadow-sm border whitespace-pre-wrap text-slate-700"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeItem.data.content) }}
              />
            )}

            <div className="flex items-center justify-between border-t pt-6">
              <div>
                {!completedIds.includes(activeItem.data.id) && (
                  <button 
                    onClick={handleCompleteLesson}
                    className="rounded bg-green-500 px-6 py-2 font-bold text-white hover:bg-green-600"
                  >
                    Hoàn thành bài học
                  </button>
                )}
                {completedIds.includes(activeItem.data.id) && (
                  <span className="font-medium text-green-600">✓ Đã hoàn thành</span>
                )}
              </div>
            </div>
          </div>
        ) : activeItem.type === 'assignment' && activeItem.data ? (
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{activeItem.data.title}</h1>
            {activeItem.data.due_date && (
              <div className="mb-6 inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 border border-red-100">
                Hạn nộp: {new Date(activeItem.data.due_date).toLocaleString()}
              </div>
            )}

            <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border whitespace-pre-wrap text-slate-700">
              <h3 className="font-bold text-slate-900 mb-2 border-b pb-2">Đề bài</h3>
              <div 
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeItem.data.description || 'Không có mô tả chi tiết.') }}
              />
              
              {activeItem.data.file_url && (
                <button 
                  onClick={() => handleDownloadAssignmentFile(activeItem.data.file_url)}
                  className="flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 w-fit"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Tải file đính kèm
                </button>
              )}
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 border-b pb-2">Tình trạng nộp bài</h3>
              
              {submission ? (
                <div className="space-y-4">
                  <div className="flex gap-4 items-center">
                    <div className="text-sm font-medium text-slate-500 w-32">Trạng thái:</div>
                    <div className="text-sm font-bold text-green-600">Đã nộp</div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-sm font-medium text-slate-500 w-32">Ngày nộp:</div>
                    <div className="text-sm text-slate-900">{new Date(submission.submitted_at).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-sm font-medium text-slate-500 w-32">File bài làm:</div>
                    <div>
                      <button 
                        onClick={() => handleDownloadSubmissionFile(submission.file_url)}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Tải file của bạn
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="text-sm font-medium text-slate-500 w-32">Kết quả:</div>
                    <div>
                      {submission.grade !== null ? (
                        <div className="rounded bg-green-50 p-4 border border-green-100">
                          <div className="text-lg font-bold text-green-700 mb-1">Điểm: {submission.grade}</div>
                          <div className="text-sm text-green-800">Nhận xét: {submission.feedback || 'Không có'}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-yellow-600">Giáo viên chưa chấm</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Allow resubmit if not graded yet */}
                  {submission.grade === null && (
                    <form onSubmit={handleSubmitAssignment} className="mt-6 border-t pt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nộp lại bài (sẽ ghi đè file cũ)</label>
                      <div className="flex items-center gap-4">
                        <input type="file" ref={fileInputRef} className="text-sm file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-4 file:py-2 hover:file:bg-slate-200" required />
                        <button type="submit" disabled={uploading} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50">
                          {uploading ? 'Đang nộp...' : 'Nộp lại'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitAssignment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Upload file bài làm của bạn (PDF, Docx, Zip...)</label>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      required
                      className="block w-full text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-slate-200 border rounded p-2"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="submit" 
                      disabled={uploading}
                      className="rounded bg-accent px-6 py-2 font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                    >
                      {uploading ? 'Đang nộp bài...' : 'Nộp bài'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Không có nội dung.
          </div>
        )}
      </div>
    </div>
  )
}

export default StudyLesson
