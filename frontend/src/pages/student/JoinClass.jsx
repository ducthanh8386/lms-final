import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { classService } from '../../services/classService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const JoinClass = () => {
  const { inviteCode: routeCode } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [inviteCode, setInviteCode] = useState(routeCode || '')
  const [joining, setJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const processJoin = useCallback(async (code) => {
    setJoining(true)
    setErrorMessage(null)
    const { data, error } = await classService.joinClassByCode(code)
    setJoining(false)

    if (error) {
      setErrorMessage(error.message)
      toast.error(error.message)
    } else {
      toast.success("Tham gia lớp học thành công!")
      navigate('/my-classes')
    }
  }, [toast, navigate])

  useEffect(() => {
    // Chỉ tự động join khi đã load xong auth, có user và có mã code trong URL
    if (!authLoading && user && routeCode) {
      processJoin(routeCode)
    }
  }, [user, authLoading, routeCode, processJoin])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    processJoin(inviteCode)
  }

  if (authLoading) {
    return <div className="p-8 text-center text-slate-500">Đang xác thực thông tin tài khoản...</div>
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6 text-center my-12 bg-white rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Đăng nhập để tiếp tục</h2>
        <p className="text-sm text-slate-500 mb-6">Bạn cần đăng nhập vào tài khoản học viên để có thể tham gia vào lớp học này.</p>
        <Link 
          to={`/login?redirect=/join/${inviteCode}`}
          className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white hover:bg-purple-600 transition block text-center"
        >
          Đăng nhập ngay
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md p-6 my-12 text-left bg-white rounded-xl border shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900 border-b pb-2 mb-4">Tham gia lớp học</h2>
      
      {joining ? (
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent mb-4"></div>
          <p className="text-sm text-slate-600 font-medium">Đang xử lý tham gia lớp học...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3.5 text-sm font-medium text-red-600 border border-red-100">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mã mời của lớp học</label>
            <input 
              type="text" 
              placeholder="VD: ABCXYZ"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              maxLength={6}
              className="w-full rounded-lg border p-3 text-center text-xl font-black tracking-widest font-mono text-slate-800 uppercase focus:border-accent focus:outline-none"
              required
              disabled={joining}
            />
          </div>

          <button
            type="submit"
            disabled={joining}
            className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
          >
            Xác nhận tham gia lớp học
          </button>
          
          <div className="text-center pt-2">
            <Link to="/my-classes" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              Quay lại danh sách lớp học của tôi
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

export default JoinClass
