import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { classService } from '../../services/classService'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

const ClassDetail = () => {
  const { classId } = useParams()
  const toast = useToast()
  const { confirm } = useConfirm()
  const navigate = useNavigate()

  const [classObj, setClassObj] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ name: '', description: '', max_students: 50 })
  const [saving, setSaving] = useState(false)

  const fetchDetails = useCallback(async () => {
    setLoading(true)
    const { data, error } = await classService.getClassDetails(classId)
    if (error) {
      toast.error("Không tìm thấy thông tin lớp: " + error.message)
      navigate('/teacher/classes')
    } else if (data) {
      setClassObj(data)
      setEditData({
        name: data.name,
        description: data.description || '',
        max_students: data.max_students || 50
      })
    }
    setLoading(false)
  }, [classId, toast, navigate])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  const handleCopyLink = () => {
    if (!classObj) return
    const inviteLink = `${window.location.origin}/join/${classObj.invite_code}`
    navigator.clipboard.writeText(inviteLink)
    toast.success("Đã sao chép liên kết mời thành công!")
  }

  const handleRegenerateCode = async () => {
    if (!(await confirm("Bạn có chắc chắn muốn thay đổi mã mời lớp học không? Học viên dùng mã cũ sẽ không thể tham gia lớp."))) return

    const { data, error } = await classService.regenerateInviteCode(classId)
    if (error) {
      toast.error("Lỗi đổi mã: " + error.message)
    } else {
      toast.success("Đổi mã mời mới thành công!")
      setClassObj(prev => ({ ...prev, invite_code: data.invite_code }))
    }
  }

  const handleRemoveStudent = async (student) => {
    if (!(await confirm(`Xác nhận xóa học sinh "${student.name}" ra khỏi lớp học này?`))) return

    const { error } = await classService.removeStudentFromClass(classId, student.id)
    if (error) {
      toast.error("Lỗi xóa học sinh: " + error.message)
    } else {
      toast.success("Đã xóa học sinh khỏi lớp!")
      fetchDetails()
    }
  }

  const handleUpdateDetails = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await classService.updateClass(classId, {
      name: editData.name,
      description: editData.description,
      max_students: Number(editData.max_students)
    })
    
    if (error) {
      toast.error("Lỗi cập nhật: " + error.message)
    } else {
      toast.success("Cập nhật thông tin lớp thành công!")
      setClassObj(prev => ({
        ...prev,
        name: data.name,
        description: data.description,
        max_students: data.max_students
      }))
      setIsEditing(false)
    }
    setSaving(false)
  }

  const getInitials = (name) => {
    if (!name) return 'HV'
    return name.split(' ').map(n => n[0]).slice(-2).join('').toUpperCase()
  }

  if (loading) return <div className="p-8 text-left">Đang tải thông tin chi tiết lớp...</div>

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left bg-slate-50 min-h-screen">
      <header className="mb-6">
        <Link to="/teacher/classes" className="text-sm font-medium text-slate-500 hover:text-accent">&larr; Quay lại danh sách lớp</Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{classObj.name}</h1>
            {classObj.courses && <p className="text-sm text-slate-500 font-semibold mt-1">Khóa học liên kết: {classObj.courses.title}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              {isEditing ? 'Hủy sửa' : 'Sửa thông tin lớp'}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Cột chính: Danh sách học viên */}
        <div className="md:col-span-2 space-y-6">
          {isEditing ? (
            <form onSubmit={handleUpdateDetails} className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-2">Chỉnh sửa thông tin lớp</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên lớp học</label>
                <input 
                  type="text" 
                  required
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả lớp</label>
                <textarea 
                  value={editData.description}
                  onChange={e => setEditData({...editData, description: e.target.value})}
                  rows="3"
                  className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Học sinh tối đa</label>
                <input 
                  type="number" 
                  min="1" 
                  value={editData.max_students}
                  onChange={e => setEditData({...editData, max_students: e.target.value})}
                  className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="submit" disabled={saving} className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 transition">
                  {saving ? 'Đang lưu...' : 'Lưu lại'}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Danh sách học sinh ({classObj.members?.length || 0})</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-4 font-semibold text-slate-600">Học viên</th>
                      <th className="p-4 font-semibold text-slate-600">Email</th>
                      <th className="p-4 font-semibold text-slate-600">Ngày tham gia</th>
                      <th className="p-4 font-semibold text-slate-600 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {classObj.members?.map(member => {
                      const profile = member.profiles || {}
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/50">
                          <td className="p-4 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                              {profile.avatar ? (
                                <img src={profile.avatar} alt="avatar" className="h-full w-full rounded-full object-cover" />
                              ) : (
                                getInitials(profile.name)
                              )}
                            </div>
                            <span className="font-bold text-slate-800">{profile.name || 'N/A'}</span>
                          </td>
                          <td className="p-4 text-slate-600">{profile.email}</td>
                          <td className="p-4 text-slate-500 text-xs">
                            {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleRemoveStudent(profile)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold hover:underline"
                            >
                              Xóa khỏi lớp
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {(!classObj.members || classObj.members.length === 0) && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                          Chưa có học sinh nào tham gia lớp này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Cột phụ: Chi tiết mã mời & Trạng thái */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Thông tin mã mời</h3>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-dashed flex flex-col items-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Mã Lớp Học</span>
              <span className="text-3xl font-black text-accent tracking-widest font-mono">{classObj.invite_code}</span>
            </div>

            <div className="space-y-2">
              <button 
                onClick={handleCopyLink}
                className="w-full text-center rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-purple-600 transition shadow-sm"
              >
                Sao chép link mời học viên
              </button>
              <button 
                onClick={handleRegenerateCode}
                className="w-full text-center rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition bg-white shadow-sm"
              >
                Tạo lại mã mời mới
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Chia sẻ mã mời này hoặc đường dẫn trực tiếp cho học sinh của bạn để họ có thể tự ghi danh vào lớp.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-2">
            <h3 className="font-bold text-slate-900 border-b pb-2 mb-2">Thống kê lớp</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Giới hạn học viên:</span>
              <span className="font-bold text-slate-800">{classObj.max_students}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Học viên hiện tại:</span>
              <span className="font-bold text-slate-800">{classObj.members?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Chỗ trống còn lại:</span>
              <span className="font-bold text-slate-800">
                {Math.max(0, classObj.max_students - (classObj.members?.length || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClassDetail
