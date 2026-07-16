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
  
  // Lấy danh sách khóa học public với tìm kiếm, phân trang, lọc danh mục
  async getPublicCourses(filters = {}) {
    const { search, category_id, page = 1, limit = 8 } = filters
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('courses_public')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    
    // Map to preserve backward compatibility with frontend: profiles.name, categories.name
    const mappedData = data?.map(c => ({
      ...c,
      profiles: { name: c.teacher_name },
      categories: { name: c.category_name }
    }))

    return { data: mappedData, error, count }
  },
  
  async getCourseDetail(courseId) {
    const { data, error } = await supabase
      .from('courses_public')
      .select('*')
      .eq('id', courseId)
      .single()

    if (data) {
      data.profiles = { name: data.teacher_name }
      data.categories = { name: data.category_name }
    }

    return { data, error }
  }
}
