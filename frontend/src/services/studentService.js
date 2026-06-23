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

    // Re-verify prices and teacher_ids directly from Database to prevent client-side price tampering
    const { data: dbCourses, error: dbError } = await supabase
      .from('courses')
      .select('id, price, is_free, teacher_id')
      .in('id', courseIds)

    if (dbError) return { error: dbError }
    if (!dbCourses || dbCourses.length === 0) {
      return { error: { message: "Không tìm thấy thông tin khóa học trong hệ thống" } }
    }

    // Map database values by course ID
    const dbCourseMap = dbCourses.reduce((acc, c) => {
      acc[c.id] = c
      return acc
    }, {})

    // Rebuild standard courses with verified DB fields
    const verifiedCourses = []
    try {
      for (const c of courses) {
        const dbC = dbCourseMap[c.id]
        if (!dbC) {
          throw new Error(`Khóa học "${c.title}" không tồn tại hoặc đã bị gỡ bỏ`)
        }
        verifiedCourses.push({
          ...c,
          price: dbC.is_free ? 0 : Number(dbC.price || 0),
          teacher_id: dbC.teacher_id
        })
      }
    } catch (err) {
      return { error: { message: err.message } }
    }

    // Group courses by teacher_id
    const teacherGroups = verifiedCourses.reduce((acc, course) => {
      const teacherId = course.teacher_id
      if (!acc[teacherId]) acc[teacherId] = []
      acc[teacherId].push(course)
      return acc
    }, {})

    const createdOrders = []

    // NOTE: This inserts multiple orders sequentially without rollback. If any middle insertion fails, 
    // preceding successful orders will remain in DB. Under standard operations this is acceptable,
    // but should be refactored to a Database transaction/rpc if rollback is strictly required.
    for (const teacherId in teacherGroups) {
      const teacherCourses = teacherGroups[teacherId]
      const total_price = teacherCourses.reduce((sum, c) => sum + (c.price || 0), 0)
      
      const status = total_price === 0 ? 'completed' : 'pending'

      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ user_id: user.id, total_price, status, teacher_id: teacherId }])
        .select()
        .single()

      if (orderError) return { error: orderError }

      // 2. Create order_items
      const orderItems = teacherCourses.map(c => ({
        order_id: order.id,
        course_id: c.id,
        price: c.price || 0
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) return { error: itemsError }

      // 3. Auto-enroll if free
      if (status === 'completed') {
        const { data: existing } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .in('course_id', teacherCourses.map(c => c.id))

        const existingCourseIds = new Set(existing?.map(e => e.course_id) || [])

        const enrollments = teacherCourses
          .filter(c => !existingCourseIds.has(c.id))
          .map(c => ({
            user_id: user.id,
            course_id: c.id
          }))

        if (enrollments.length > 0) {
          const { error: enrollError } = await supabase.from('enrollments').insert(enrollments)
          if (enrollError) console.error("Enrollment error (free course):", enrollError)
        }
      }

      createdOrders.push(order)
    }

    return { data: createdOrders }
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
