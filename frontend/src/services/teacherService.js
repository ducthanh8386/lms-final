import { supabase } from '../lib/supabaseClient'

export const teacherService = {
  // Lấy các đơn hàng đang pending của giáo viên
  async getPendingOrders(teacherId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id(name, email), order_items(price, courses(title))')
      .eq('teacher_id', teacherId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Cập nhật thông tin thanh toán (Bank & QR)
  async updatePaymentSettings(teacherId, payload) {
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', teacherId)
    return { data, error }
  },

  // Upload QR lên Storage (tùy chọn nếu teacher upload file ảnh)
  async uploadQRImage(file, teacherId) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${teacherId}_qr_${Math.random()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('course-thumbnails') // Tạm dùng chung bucket với thumbnail hoặc tạo bucket riêng. Ở đây dùng chung cho tiện.
      .upload(fileName, file)

    if (uploadError) return { error: uploadError }

    const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(fileName)
    return { data: data.publicUrl }
  },

  // Phê duyệt đơn hàng -> Chuyển status = completed, và tự động ghi vào enrollments
  async approveOrder(orderId) {
    // 1. Đổi status đơn hàng
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId)
      .select('user_id')
      .single()

    if (orderError) return { error: orderError }

    // 2. Lấy các course trong order
    const { data: items } = await supabase
      .from('order_items')
      .select('course_id')
      .eq('order_id', orderId)

    if (items && items.length > 0) {
      // Lấy các enrollments đã có của user đối với các khóa học này để tránh trùng lặp
      const { data: existing } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', order.user_id)
        .in('course_id', items.map(item => item.course_id))

      const existingCourseIds = new Set(existing?.map(e => e.course_id) || [])

      const newEnrollments = items
        .filter(item => !existingCourseIds.has(item.course_id))
        .map(item => ({
          user_id: order.user_id,
          course_id: item.course_id
        }))

      if (newEnrollments.length > 0) {
        // 3. Thêm vào bảng enrollments.
        const { error: enrollError } = await supabase.from('enrollments').insert(newEnrollments)
        if (enrollError) return { error: enrollError }
      }
    }

    return { success: true }
  },

  async rejectOrder(orderId) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'rejected' })
      .eq('id', orderId)
    return { data, error }
  },

  // Lấy danh sách học viên đăng ký các khóa học của giáo viên
  async getEnrolledStudents(teacherId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, enrolled_at, course_id, courses!inner(title, teacher_id), profiles:user_id(name, email)')
      .eq('courses.teacher_id', teacherId)
      .order('enrolled_at', { ascending: false })
    return { data, error }
  }
}
