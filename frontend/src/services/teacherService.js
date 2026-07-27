import { supabase } from '../lib/supabaseClient'
import { notificationService } from './notificationService'

export const teacherService = {
  // Đơn hàng gần đây (SePay tự duyệt — không cần approve thủ công)
  async getRecentOrders(teacherId, limit = 50) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id(name, email), order_items(price, courses(title))')
      .eq('teacher_id', teacherId)
      .in('status', ['pending', 'awaiting_confirmation', 'completed', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  // Lấy các đơn hàng đang pending của giáo viên (legacy)
  async getPendingOrders(teacherId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id(name, email), order_items(price, courses(title))')
      .eq('teacher_id', teacherId)
      .in('status', ['pending', 'awaiting_confirmation'])
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

    // Gửi thông báo cho student
    try {
      await notificationService.createNotification(
        order.user_id,
        'order_approved',
        'Đơn hàng đã được duyệt',
        `Đơn hàng #${orderId.slice(0, 8).toUpperCase()} của bạn đã được giáo viên phê duyệt. Hãy vào học ngay!`,
        orderId,
        'order'
      )
    } catch (err) {
      console.error("Gửi thông báo duyệt đơn hàng lỗi:", err)
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
  },

  // Khóa video (purchase) của giáo viên — filter tiến độ học
  async getPurchaseCourses(teacherId) {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, enrollment_mode')
      .eq('teacher_id', teacherId)
      .eq('enrollment_mode', 'purchase')
      .order('title', { ascending: true })
    return { data, error }
  },

  /**
   * Tiến độ học F8-style: enrollments khóa purchase + course_learning_progress
   * @param {string} teacherId
   * @param {string|null} courseId optional filter
   */
  async getCourseLearningProgress(teacherId, courseId = null) {
    let enrollQuery = supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        user_id,
        course_id,
        courses!inner(id, title, teacher_id, enrollment_mode),
        profiles:user_id(id, name, email)
      `)
      .eq('courses.teacher_id', teacherId)
      .eq('courses.enrollment_mode', 'purchase')
      .order('enrolled_at', { ascending: false })

    if (courseId) {
      enrollQuery = enrollQuery.eq('course_id', courseId)
    }

    const { data: enrollments, error: enrollError } = await enrollQuery
    if (enrollError) return { data: null, error: enrollError }
    if (!enrollments?.length) return { data: [], error: null }

    const courseIds = [...new Set(enrollments.map((e) => e.course_id))]
    const userIds = [...new Set(enrollments.map((e) => e.user_id))]

    const { data: progressRows, error: progressError } = await supabase
      .from('course_learning_progress')
      .select(`
        user_id,
        course_id,
        progress_percent,
        completed_lessons,
        total_lessons,
        last_studied_at,
        study_seconds,
        last_lesson_id,
        lessons:last_lesson_id(id, title, order_index)
      `)
      .in('course_id', courseIds)
      .in('user_id', userIds)

    if (progressError) return { data: null, error: progressError }

    const progressMap = new Map()
    for (const row of progressRows || []) {
      progressMap.set(`${row.user_id}:${row.course_id}`, row)
    }

    const data = enrollments.map((en) => {
      const progress = progressMap.get(`${en.user_id}:${en.course_id}`) || null
      return {
        enrollmentId: en.id,
        enrolledAt: en.enrolled_at,
        userId: en.user_id,
        courseId: en.course_id,
        courseTitle: en.courses?.title || '',
        studentName: en.profiles?.name || 'Học viên',
        studentEmail: en.profiles?.email || '',
        progressPercent: progress?.progress_percent ?? 0,
        completedLessons: progress?.completed_lessons ?? 0,
        totalLessons: progress?.total_lessons ?? 0,
        lastStudiedAt: progress?.last_studied_at ?? null,
        studySeconds: progress?.study_seconds ?? 0,
        lastLessonId: progress?.last_lesson_id ?? null,
        lastLessonTitle: progress?.lessons?.title ?? null,
        lastLessonOrder: progress?.lessons?.order_index ?? null,
      }
    })

    return { data, error: null }
  },
}
