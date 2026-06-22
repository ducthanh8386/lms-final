import { supabase } from '../lib/supabaseClient'

export const courseService = {
  // === CHO TEACHER ===
  
  // Lấy các khóa học do teacher dạy
  async getTeacherCourses(teacherId) {
    const { data, error } = await supabase
      .from('courses')
      .select('*, categories(name)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Tạo khóa học mới (mặc định status = pending trên DB)
  async createCourse(courseData) {
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
    return { data, error }
  },

  // Cập nhật khóa học
  async updateCourse(courseId, courseData) {
    const { data, error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('id', courseId)
      .select()
    return { data, error }
  },

  // === LESSONS ===

  // Lấy danh sách lesson của một khóa học (dành cho Teacher và Student đã mua)
  async getCourseLessons(courseId) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })
    return { data, error }
  },

  // Lấy đánh giá của một khóa học
  async getCourseReviews(courseId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(name)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Tạo bài học mới
  async createLesson(lessonData) {
    const { data, error } = await supabase
      .from('lessons')
      .insert([lessonData])
      .select()
    return { data, error }
  },

  async deleteLesson(lessonId) {
    const { data, error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)
    return { data, error }
  },

  // === THUMBNAILS ===
  async uploadThumbnail(file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('course-thumbnails')
      .upload(filePath, file)

    if (uploadError) {
      return { error: uploadError }
    }

    const { data } = supabase.storage
      .from('course-thumbnails')
      .getPublicUrl(filePath)

    return { data: data.publicUrl }
  },

  // Cập nhật bài học
  async updateLesson(lessonId, lessonData) {
    const { data, error } = await supabase
      .from('lessons')
      .update(lessonData)
      .eq('id', lessonId)
      .select()
    return { data, error }
  },

  // === CHO STUDENT / PUBLIC ===
  
  // Lấy danh sách khóa học public (status = approved)
  async getPublicCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*, profiles(name), categories(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    return { data, error }
  },
  
  async getCourseDetail(courseId) {
    const { data, error } = await supabase
      .from('courses')
      .select('*, profiles(name), categories(name)')
      .eq('id', courseId)
      .single()
    return { data, error }
  }
}
