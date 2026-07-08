import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { classService } from '../../services/classService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const MyClasses = () => {
  const { user } = useAuth()
  const toast = useToast()
  
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)

  const fetchClasses = async () => {
    setLoading(true)
    const { data, error } = await classService.getStudentClasses()
    if (error) {
      toast.error("Lỗi tải lớp học: " + error.message)
    } else if (data) {
      setClasses(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  const handleJoinClass = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) {
      toast.error("Vui lòng nhập mã lớp học")
      return
    }

    setJoining(true)
    const { data, error } = await classService.joinClassByCode(inviteCode)
    setJoining(false)

    if (error) {
      toast.error(error.message || "Không thể tham gia lớp học")
    } else {
      toast.success("Tham gia lớp học thành công!")
      setInviteCode('')
      setShowJoinForm(false)
      fetchClasses()
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 text-left bg-slate-50 min-h-screen">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lớp Học Của Tôi</h1>
          <p className="text-slate-500 text-sm">Các nhóm lớp học bạn đã tham gia cùng với giáo viên của mình.</p>
        </div>
        <button
          onClick={() => setShowJoinForm(!showJoinForm)}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-purple-600 transition shadow-sm"
        >
          {showJoinForm ? 'Đóng form nhập' : 'Tham gia lớp mới'}
        </button>
      </header>

      {/* Form nhập mã mời để tham gia lớp */}
      {showJoinForm && (
        <form onSubmit={handleJoinClass} className="mb-8 rounded-xl border bg-white p-6 shadow-sm max-w-md animate-fadeIn">
          <h3 className="font-bold text-slate-900 mb-2">Nhập mã mời lớp học</h3>
          <p className="text-xs text-slate-500 mb-4">Nhận mã lớp (gồm 6 ký tự viết hoa) từ giáo viên của bạn để tham gia vào lớp học.</p>
          
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="VD: ABCXYZ"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              maxLength={6}
              className="flex-1 rounded-lg border px-3 py-2 text-center font-bold tracking-widest font-mono text-slate-700 uppercase focus:border-accent focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={joining}
              className="rounded-lg bg-slate-900 px-6 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 text-sm"
            >
              {joining ? 'Đang gửi...' : 'Tham gia'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2].map(n => (
            <div key={n} className="h-32 w-full rounded-xl bg-white border border-slate-200 animate-pulse"></div>
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {classes.map(c => (
            <div key={c.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition duration-300">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">Đã tham gia</span>
              </div>
              
              <p className="text-xs text-slate-500 mb-3">Giáo viên: <strong className="text-slate-700">{c.profiles?.name || 'Chưa rõ'}</strong></p>
              <p className="text-slate-600 text-sm h-12 line-clamp-2 mb-4">{c.description || 'Không có mô tả chi tiết lớp học.'}</p>
              
              {c.course_id && (
                <div className="border-t pt-3 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Khóa học:</span>
                  <Link to={`/courses/${c.course_id}`} className="font-bold text-accent hover:underline line-clamp-1">{c.course_id.slice(0, 8).toUpperCase()}</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <p className="mb-4 text-slate-500">Bạn chưa tham gia lớp học nào.</p>
          <button 
            onClick={() => setShowJoinForm(true)}
            className="rounded-lg bg-slate-900 px-6 py-2 font-medium text-white hover:bg-slate-800"
          >
            Nhập mã tham gia lớp học
          </button>
        </div>
      )}
    </div>
  )
}

export default MyClasses
