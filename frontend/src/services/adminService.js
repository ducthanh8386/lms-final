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
      .select('id')
    return { data, error }
  },

  // Lấy thống kê cho Admin Dashboard
  async getDashboardStats() {
    // 1. Tổng doanh thu (từ các đơn hàng status = completed)
    const { data: completedOrders, error: revenueError } = await supabase
      .from('orders')
      .select('total_price')
      .eq('status', 'completed')

    // 2. Tổng học viên (role = student)
    const { count: totalStudents, error: studentsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')

    // 3. Tổng giáo viên (role = teacher)
    const { count: totalTeachers, error: teachersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher')

    // 4. Tổng khóa học đã được duyệt (approved)
    const { count: totalCourses, error: coursesError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    // 5. Khóa học chờ duyệt (pending)
    const { count: pendingCourses, error: pendingError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (revenueError || studentsError || teachersError || coursesError || pendingError) {
      return { error: revenueError || studentsError || teachersError || coursesError || pendingError }
    }

    const totalRevenue = completedOrders?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0

    return {
      data: {
        totalRevenue: totalRevenue || 0,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalCourses: totalCourses || 0,
        pendingCourses: pendingCourses || 0
      }
    }
  },

  async getAllCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*, profiles:teacher_id(id, name, email)')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async assignTeacher(courseId, teacherId) {
    const { data, error } = await supabase
      .from('courses')
      .update({ teacher_id: teacherId })
      .eq('id', courseId)
      .select('id')
      .single()
    return { data, error }
  },

  async updateCourseMeta(courseId, payload) {
    const { data, error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', courseId)
      .select('id')
      .single()
    return { data, error }
  },

  async getTeachers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, status, created_at')
      .eq('role', 'teacher')
      .order('name', { ascending: true })
    return { data, error }
  },

  async getStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, status, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getAllOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id(name, email), teacher:teacher_id(name), order_items(price, courses(title))')
      .order('created_at', { ascending: false })
      .limit(200)
    return { data, error }
  },

  async getAllLeads() {
    const { data, error } = await supabase
      .from('course_leads')
      .select('*, courses(id, title, teacher_id), classes:assigned_class_id(id, name)')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getAllClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select(
        '*, courses(id, title, teacher_id), class_members(id, status)'
      )
      .order('created_at', { ascending: false })

    if (error) return { data: null, error }
    if (!data?.length) return { data: [], error: null }

    // Đọc tên GV qua profiles_public (tránh RLS profiles chặn embed)
    const teacherIds = [
      ...new Set(
        data
          .flatMap((c) => [c.teacher_id, c.courses?.teacher_id])
          .filter(Boolean)
      ),
    ]
    let nameById = {}
    if (teacherIds.length) {
      const { data: pubs } = await supabase
        .from('profiles_public')
        .select('id, name')
        .in('id', teacherIds)
      nameById = Object.fromEntries((pubs || []).map((p) => [p.id, p.name]))
    }

    const enriched = data.map((c) => ({
      ...c,
      profiles: c.teacher_id
        ? { id: c.teacher_id, name: nameById[c.teacher_id] || null }
        : null,
      course_teacher_name: c.courses?.teacher_id
        ? nameById[c.courses.teacher_id] || null
        : null,
    }))

    return { data: enriched, error: null }
  },
}

