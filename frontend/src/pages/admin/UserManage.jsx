import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

const UserManage = () => {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await adminService.getAllUsers()
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active'
    const { error } = await adminService.updateUserStatus(userId, newStatus)
    if (error) toast.error("Lỗi khi đổi trạng thái: " + error.message)
    else {
      toast.success("Cập nhật trạng thái thành công")
      fetchUsers()
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    const { error } = await adminService.updateUserRole(userId, newRole)
    if (error) toast.error("Lỗi khi đổi role: " + error.message)
    else {
      toast.success("Cập nhật quyền thành công")
      fetchUsers()
    }
  }

  const handleNameChange = async (userId, newName) => {
    const { error } = await adminService.updateUserName(userId, newName)
    if (error) toast.error("Lỗi khi đổi tên: " + error.message)
    else {
      toast.success("Cập nhật tên thành công")
      fetchUsers()
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await adminService.createUser(formData, session.access_token)
      if (error) throw new Error(error.message)
      toast.success("Đã tạo tài khoản thành công")
      setShowAddForm(false)
      setFormData({ name: '', email: '', password: '', role: 'student' })
      fetchUsers()
    } catch (err) {
      toast.error("Lỗi tạo user: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!(await confirm("Bạn có chắc chắn muốn XÓA VĨNH VIỄN user này? Các dữ liệu liên quan sẽ bị xóa."))) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await adminService.deleteUser(userId, session.access_token)
      if (error) throw new Error(error.message)
      toast.success("Đã xóa user thành công")
      fetchUsers()
    } catch (err) {
      toast.error("Lỗi xóa user: " + err.message)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-8 text-left">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-accent hover:underline">← Về Admin Dashboard</Link>
      </div>
      
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Người Dùng</h1>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600"
        >
          {showAddForm ? 'Đóng form' : '+ Thêm User'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddUser} className="mb-8 rounded-xl border bg-slate-50 p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Tạo tài khoản mới</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input type="text" placeholder="Họ Tên" required className="rounded border p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input type="email" placeholder="Email" required className="rounded border p-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input type="password" placeholder="Mật khẩu" required minLength="6" className="rounded border p-2" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <select className="rounded border p-2" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={isSubmitting} className="rounded bg-accent px-4 py-2 font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Đang tạo...' : 'Tạo User'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Đang tải danh sách...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Họ Tên / ID</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <input 
                      type="text" 
                      className="w-full bg-transparent font-medium text-slate-900 outline-none border-b border-transparent focus:border-slate-300"
                      defaultValue={u.name || ''}
                      onBlur={(e) => {
                        if(e.target.value !== u.name) handleNameChange(u.id, e.target.value)
                      }}
                      title="Click để sửa tên"
                    />
                    <div className="text-xs text-slate-500 mt-1">ID: {u.id.substring(0, 8)}...</div>
                  </td>
                  <td className="p-4">
                    <select 
                      className="rounded border p-1"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleStatusChange(u.id, u.status)}
                      className={`mr-2 rounded px-3 py-1 text-xs font-medium text-white ${u.status === 'active' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                      {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default UserManage
