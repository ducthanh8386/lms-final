import { supabase } from '../lib/supabaseClient'

export const studentService = {
  // Lấy các khóa học đã đăng ký
  async getMyEnrollments(userId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id, enrolled_at, courses(*, profiles(name))')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false })
    return { data, error }
  },

  // Đánh dấu hoàn thành bài học
  async completeLesson(userId, lessonId) {
    const { data, error } = await supabase
      .from('lesson_progress')
      .insert([{ user_id: userId, lesson_id: lessonId }])
      .select()
    return { data, error }
  },

  // Lấy tiến độ của một khóa học (danh sách các lesson_id đã hoàn thành)
  async getCourseProgress(userId, courseId) {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id, lessons!inner(course_id)')
      .eq('user_id', userId)
      .eq('lessons.course_id', courseId)
      
    return { data, error }
  },

  // Đánh giá khóa học
  async addReview(courseId, userId, rating, comment) {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{ course_id: courseId, user_id: userId, rating, comment }])
    return { data, error }
  },

  // Checkout nội bộ (tách theo teacher_id)
  async checkout(courses, user) {
    if (!courses || courses.length === 0) return { error: { message: "Giỏ hàng trống" } }
    const courseIds = courses.map(c => c.id)
    const { data, error } = await supabase.rpc('checkout_courses', { p_course_ids: courseIds })
    return { data, error }
  },

  async uploadReceipt(orderId, file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${orderId}_${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file)

    if (uploadError) return { error: uploadError }

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
    
    // Update order with receipt_url
    const { error: updateError } = await supabase
      .from('orders')
      .update({ receipt_url: data.publicUrl })
      .eq('id', orderId)

    if (updateError) return { error: updateError }

    return { data: data.publicUrl }
  }
}
