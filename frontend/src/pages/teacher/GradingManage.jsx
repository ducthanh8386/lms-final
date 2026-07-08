import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { assignmentService } from '../../services/assignmentService'
import { supabase } from '../../lib/supabaseClient'

import { useToast } from '../../context/ToastContext'

const GradingManage = () => {
  const { id: assignmentId } = useParams()
  const toast = useToast()
  const [submissions, setSubmissions] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)

  // Grading form state
  const [editingId, setEditingId] = useState(null)
  const [gradeData, setGradeData] = useState({ grade: '', feedback: '' })
  const [saving, setSaving] = useState(false)

  const fetchAssignment = useCallback(async () => {
    const { data } = await supabase.from('assignments').select('*, courses(id, title)').eq('id', assignmentId).single()
    if (data) setAssignment(data)
  }, [assignmentId])

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    const { data } = await assignmentService.getAssignmentSubmissions(assignmentId)
    if (data) setSubmissions(data)
    setLoading(false)
  }, [assignmentId])

  useEffect(() => {
    fetchAssignment()
    fetchSubmissions()
  }, [fetchAssignment, fetchSubmissions])

  const handleDownload = async (fileUrl) => {
    try {
      const { data } = await assignmentService.downloadFile('submission-files', fileUrl)
      if (data) {
        window.open(data, '_blank')
      } else {
        toast.error("Không thể tải file")
      }
    } catch {
      toast.error("Lỗi tải file")
    }
  }

  const openGradingForm = (sub) => {
    setEditingId(sub.id)
    setGradeData({
      grade: sub.grade || '',
      feedback: sub.feedback || ''
    })
  }

  const handleSaveGrade = async (subId) => {
    setSaving(true)
    await assignmentService.gradeSubmission(subId, parseFloat(gradeData.grade) || null, gradeData.feedback)
    setEditingId(null)
    setSaving(false)
    fetchSubmissions()
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left">
      <div className="mb-6">
        <Link to={`/teacher/courses/${assignment?.course_id || ''}/assignments`} className="text-sm font-medium text-slate-500 hover:text-accent">
          &larr; Quay lại bài tập
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Chấm bài - {assignment?.title}
        </h1>
        <p className="text-slate-500">Khóa học: {assignment?.courses?.title}</p>
      </div>

      {loading ? (
        <p>Đang tải danh sách bài nộp...</p>
      ) : submissions.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 font-semibold text-slate-900">Học viên</th>
                  <th className="p-4 font-semibold text-slate-900">Ngày nộp</th>
                  <th className="p-4 font-semibold text-slate-900">File đính kèm</th>
                  <th className="p-4 font-semibold text-slate-900">Điểm / Nhận xét</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-4 align-top">
                      <div className="font-medium text-slate-900">{sub.profiles?.name}</div>
                      <div className="text-xs text-slate-500">{sub.profiles?.email || 'N/A'}</div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      {new Date(sub.submitted_at).toLocaleString()}
                    </td>
                    <td className="p-4 align-top">
                      {sub.file_url ? (
                        <button 
                          onClick={() => handleDownload(sub.file_url)}
                          className="flex items-center gap-1 font-medium text-accent hover:underline"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Tải bài làm
                        </button>
                      ) : (
                        <span className="text-slate-400">Không có file</span>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      {editingId === sub.id ? (
                        <div className="flex flex-col gap-2 rounded bg-slate-100 p-3">
                          <input 
                            type="number" 
                            step="0.1"
                            placeholder="Điểm (VD: 9.5)" 
                            className="rounded border p-1 text-sm bg-white"
                            value={gradeData.grade}
                            onChange={e => setGradeData({...gradeData, grade: e.target.value})}
                          />
                          <textarea 
                            placeholder="Nhận xét" 
                            className="rounded border p-1 text-sm bg-white"
                            rows="2"
                            value={gradeData.feedback}
                            onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveGrade(sub.id)} disabled={saving} className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700">Lưu</button>
                            <button onClick={() => setEditingId(null)} className="rounded px-3 py-1 text-slate-600 hover:bg-slate-200">Hủy</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {sub.grade !== null ? (
                            <>
                              <div className="font-bold text-green-600">Điểm: {sub.grade}</div>
                              <div className="mt-1 text-sm text-slate-600">{sub.feedback || <em className="text-slate-400">Chưa có nhận xét</em>}</div>
                              <button onClick={() => openGradingForm(sub)} className="mt-2 text-xs font-medium text-blue-600 hover:underline">Sửa điểm</button>
                            </>
                          ) : (
                            <>
                              <div className="mb-2 text-yellow-600 font-medium">Chưa chấm</div>
                              <button onClick={() => openGradingForm(sub)} className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-purple-600">Chấm ngay</button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden space-y-4">
            {submissions.map(sub => (
              <div key={sub.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900">{sub.profiles?.name}</div>
                    <div className="text-xs text-slate-500">{sub.profiles?.email || 'N/A'}</div>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{new Date(sub.submitted_at).toLocaleString()}</div>
                </div>

                <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-sm">
                  <span className="text-xs font-semibold text-slate-600">Bài nộp:</span>
                  {sub.file_url ? (
                    <button 
                      onClick={() => handleDownload(sub.file_url)}
                      className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Tải bài làm
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Không có file</span>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <span className="text-xs font-semibold text-slate-600 block mb-1">Kết quả / Điểm số:</span>
                  {editingId === sub.id ? (
                    <div className="flex flex-col gap-2 rounded bg-slate-100 p-3 mt-1">
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder="Điểm (VD: 9.5)" 
                        className="rounded border p-1 text-sm bg-white"
                        value={gradeData.grade}
                        onChange={e => setGradeData({...gradeData, grade: e.target.value})}
                      />
                      <textarea 
                        placeholder="Nhận xét" 
                        className="rounded border p-1 text-sm bg-white"
                        rows="2"
                        value={gradeData.feedback}
                        onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveGrade(sub.id)} disabled={saving} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">Lưu</button>
                        <button onClick={() => setEditingId(null)} className="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-200">Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {sub.grade !== null ? (
                        <>
                          <div className="font-bold text-green-600 text-sm">Điểm: {sub.grade}</div>
                          <div className="text-xs text-slate-600 mt-1">{sub.feedback || <em className="text-slate-400">Chưa có nhận xét</em>}</div>
                          <button onClick={() => openGradingForm(sub)} className="mt-2 text-xs font-medium text-blue-600 hover:underline">Sửa điểm</button>
                        </>
                      ) : (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-yellow-600 font-medium">Chưa chấm</span>
                          <button onClick={() => openGradingForm(sub)} className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-purple-600">Chấm ngay</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          Chưa có học viên nào nộp bài.
        </div>
      )}
    </div>
  )
}

export default GradingManage
