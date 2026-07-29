import { supabase } from '../lib/supabaseClient'

export const studentService = {
  // Lấy các khóa học đã đăng ký
  async getMyEnrollments(userId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(
        'course_id, enrolled_at, courses(*, enrollment_mode, profiles:teacher_id(name))'
      )
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false })
    return { data, error }
  },

  // Đánh dấu hoàn thành bài học (+ sync % vào course_learning_progress)
  async completeLesson(_userId, lessonId) {
    const { data, error } = await supabase.rpc('complete_lesson_progress', {
      p_lesson_id: lessonId,
    })
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

  // Tóm tắt tiến độ khóa (bài cuối, %, thời gian học)
  async getCourseLearningProgress(userId, courseId) {
    const { data, error } = await supabase
      .from('course_learning_progress')
      .select('*, lessons:last_lesson_id(id, title, order_index)')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()
    return { data, error }
  },

  // Heartbeat / mở bài: cập nhật bài cuối + thời gian học
  async touchLearningProgress(courseId, lessonId = null, deltaSeconds = 0) {
    const { data, error } = await supabase.rpc('touch_learning_progress', {
      p_course_id: courseId,
      p_lesson_id: lessonId,
      p_delta_seconds: deltaSeconds,
    })
    return { data, error }
  },

  // Danh sách tiến độ các khóa đã enroll (MyCoursesMenu)
  async getMyLearningProgressSummary(userId) {
    const { data, error } = await supabase
      .from('course_learning_progress')
      .select('course_id, progress_percent, last_studied_at, last_lesson_id, completed_lessons, total_lessons, study_seconds')
      .eq('user_id', userId)
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
    if (!courses || courses.length === 0) return { error: { message: 'Chưa chọn khóa học' } }
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
