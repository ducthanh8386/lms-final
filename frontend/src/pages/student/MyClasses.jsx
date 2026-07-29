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
      toast.error('Lỗi tải lớp học: ' + error.message)
    } else if (data) {
      setClasses(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchClasses()
  }, [user])

  const handleJoinClass = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) {
      toast.error('Vui lòng nhập mã lớp học')
      return
    }

    setJoining(true)
    const { error } = await classService.joinClassByCode(inviteCode)
    setJoining(false)

    if (error) {
      toast.error(error.message || 'Không thể tham gia lớp học')
    } else {
      toast.success('Tham gia lớp Zoom thành công!')
      setInviteCode('')
      setShowJoinForm(false)
      fetchClasses()
    }
  }

  return (
    <div className="mx-auto max-w-4xl bg-slate-50 p-4 text-left sm:p-6 lg:p-8 min-h-screen">
      <header className="mb-8 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lớp Zoom của tôi</h1>
          <p className="text-sm text-slate-500">
            Lớp đã được admin/GV xếp hoặc bạn tham gia bằng mã lớp — xem lịch và vào học Zoom.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/my-schedule"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Xem lịch học
          </Link>
          <button
            type="button"
            onClick={() => setShowJoinForm(!showJoinForm)}
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orangeHover"
          >
            {showJoinForm ? 'Đóng form nhập' : 'Nhập mã lớp'}
          </button>
        </div>
      </header>

      {showJoinForm && (
        <form
          onSubmit={handleJoinClass}
          className="mb-8 max-w-md animate-fadeIn rounded-xl border bg-white p-6 shadow-sm"
        >
          <h3 className="mb-2 font-bold text-slate-900">Nhập mã lớp Zoom</h3>
          <p className="mb-4 text-xs text-slate-500">
            Mã 6 ký tự do trung tâm / giáo viên gửi sau khi xác nhận đăng ký tư vấn.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="VD: ABCXYZ"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              maxLength={6}
              className="flex-1 rounded-lg border px-3 py-2 text-center font-mono font-bold uppercase tracking-widest text-slate-700 focus:border-accent focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={joining}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {joining ? 'Đang gửi...' : 'Tham gia'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 w-full animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {classes.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border bg-white p-6 shadow-sm transition duration-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                  Zoom
                </span>
              </div>

              <p className="mb-1 text-xs text-slate-500">
                Giáo viên:{' '}
                <strong className="text-slate-700">{c.profiles?.name || 'Chưa rõ'}</strong>
              </p>
              {c.courses?.title && (
                <p className="mb-1 text-xs text-slate-500">
                  Khóa: <strong className="text-slate-700">{c.courses.title}</strong>
                </p>
              )}
              {c.schedule_label && (
                <p className="mb-1 text-xs text-slate-500">
                  Lịch: <strong className="text-slate-700">{c.schedule_label}</strong>
                </p>
              )}
              {c.invite_code && (
                <p className="mb-3 text-xs text-slate-500">
                  Mã lớp:{' '}
                  <strong className="font-mono tracking-wider text-slate-800">{c.invite_code}</strong>
                </p>
              )}

              <p className="mb-4 line-clamp-2 h-10 text-sm text-slate-600">
                {c.description || 'Lớp Zoom — vào lịch học để xem buổi và link họp.'}
              </p>

              <div className="flex items-center justify-between border-t pt-3">
                <Link
                  to="/my-schedule"
                  className="text-sm font-bold text-accent hover:underline"
                >
                  Xem lịch & vào Zoom →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <p className="mb-2 text-slate-500">Bạn chưa có lớp Zoom nào.</p>
          <p className="mb-4 text-xs text-slate-400">
            Sau khi đăng ký tư vấn và được xác nhận, trung tâm sẽ xếp lớp hoặc gửi mã lớp.
          </p>
          <button
            type="button"
            onClick={() => setShowJoinForm(true)}
            className="rounded-lg bg-slate-900 px-6 py-2 font-medium text-white hover:bg-slate-800"
          >
            Nhập mã lớp Zoom
          </button>
        </div>
      )}
    </div>
  )
}

export default MyClasses
