import { supabase } from '../lib/supabaseClient'

export const adminService = {
  // === QUẢN LÝ USER ===
  
  // Lấy danh sách tất cả user
  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Khóa/Mở khóa tài khoản (Banned / Active)
  async updateUserStatus(userId, status) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId)
      .select()
    return { data, error }
  },

  // Đổi role user (cấp quyền teacher/admin)
  async updateUserRole(userId, role) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
    return { data, error }
  },

  // Đổi tên user
  async updateUserName(userId, name) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', userId)
      .select()
    return { data, error }
  },

  // Tạo user mới (gọi Edge Function)
  async createUser(userData, token) {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: userData,
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST'
    })
    return { data, error }
  },

  // Xóa user (gọi Edge Function)
  async deleteUser(userId, token) {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { id: userId },
      headers: { Authorization: `Bearer ${token}` },
      method: 'DELETE'
    })
    return { data, error }
  },

  // === DUYỆT KHÓA HỌC ===

  // Lấy các khóa học pending
  async getPendingCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*, profiles(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Approve hoặc Reject khóa học
  async updateCourseStatus(courseId, status) {
    const { data, error } = await supabase
      .from('courses')
      .update({ status })
      .eq('id', courseId)
      .select()
    return { data, error }
  }
}
