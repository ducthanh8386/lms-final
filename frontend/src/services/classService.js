import { supabase } from '../lib/supabaseClient'

export const classService = {
  // === CHO GIÁO VIÊN ===

  // Tạo lớp Zoom — GV quản lý = GV được gán trên khóa Zoom (không phải người bấm tạo)
  async createClass(classData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: 'Chưa đăng nhập' } }

    let teacherId = user.id
    if (classData.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id, enrollment_mode')
        .eq('id', classData.course_id)
        .single()
      if (course?.enrollment_mode && course.enrollment_mode !== 'consultation') {
        return { error: { message: 'Chỉ tạo lớp cho khóa Zoom' } }
      }
      if (course?.teacher_id) teacherId = course.teacher_id
    }

    const { data, error } = await supabase
      .from('classes')
      .insert([
        {
          ...classData,
          teacher_id: teacherId,
        },
      ])
      .select(
        '*, courses:course_id(id, title), profiles:teacher_id(id, name, email), class_members(id, status)'
      )
      .single()

    return { data, error }
  },

  // Lấy lớp Zoom: GV thấy lớp mình quản lý; Admin thấy tất cả
  async getTeacherClasses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: 'Chưa đăng nhập' } }

    const role = user.app_metadata?.userrole
    let query = supabase
      .from('classes')
      .select(
        '*, courses:course_id(id, title), profiles:teacher_id(id, name, email), class_members(id, status)'
      )
      .order('created_at', { ascending: false })

    if (role !== 'admin') {
      query = query.eq('teacher_id', user.id)
    }

    const { data, error } = await query
    if (error) return { error }

    // Bổ sung tên GV nếu embed profiles bị RLS (dùng profiles_public)
    const rows = data || []
    const missing = rows.filter((c) => c.teacher_id && !c.profiles?.name).map((c) => c.teacher_id)
    let nameById = {}
    if (missing.length) {
      const { data: pubs } = await supabase
        .from('profiles_public')
        .select('id, name')
        .in('id', [...new Set(missing)])
      nameById = Object.fromEntries((pubs || []).map((p) => [p.id, p.name]))
    }

    const formattedData = rows.map((c) => {
      const activeMembers = c.class_members?.filter((m) => m.status === 'active') || []
      const profile =
        c.profiles?.name
          ? c.profiles
          : c.teacher_id
            ? { id: c.teacher_id, name: nameById[c.teacher_id] || null, email: c.profiles?.email }
            : null
      return {
        ...c,
        profiles: profile,
        student_count: activeMembers.length,
      }
    })

    return { data: formattedData, error: null }
  },

  // Lấy chi tiết lớp + danh sách học viên
  async getClassDetails(classId) {
    const { data: classObj, error: classErr } = await supabase
      .from('classes')
      .select('*, courses:course_id(id, title, teacher_id)')
      .eq('id', classId)
      .single()

    if (classErr) return { error: classErr }

    let teacher = null
    if (classObj.teacher_id) {
      const { data: pub } = await supabase
        .from('profiles_public')
        .select('id, name')
        .eq('id', classObj.teacher_id)
        .maybeSingle()
      teacher = pub
        ? { id: pub.id, name: pub.name }
        : { id: classObj.teacher_id, name: null }
    }

    const { data: members, error: membersErr } = await supabase
      .from('class_members')
      .select('*, profiles:student_id(name, email, avatar)')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })

    if (membersErr) return { error: membersErr }

    return {
      data: {
        ...classObj,
        profiles: teacher,
        members: members || [],
      },
    }
  },

  // Cập nhật thông tin lớp (ví dụ: đổi tên, mô tả, trạng thái active)
  async updateClass(classId, updatePayload) {
    const { data, error } = await supabase
      .from('classes')
      .update(updatePayload)
      .eq('id', classId)
      .select()
      .single()
    return { data, error }
  },

  // Xóa học viên khỏi lớp (set status = removed)
  async removeStudentFromClass(classId, studentId) {
    const { data, error } = await supabase
      .from('class_members')
      .update({ status: 'removed' })
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .select()
    return { data, error }
  },

  // Tạo lại mã mời
  async regenerateInviteCode(classId) {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase
      .from('classes')
      .update({ invite_code: newCode })
      .eq('id', classId)
      .select()
      .single()
    return { data, error }
  },

  // === CHO HỌC VIÊN ===

  // Tham gia lớp bằng mã mời (RPC — bypass RLS + sync lịch Zoom)
  async joinClassByCode(inviteCode) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: 'Chưa đăng nhập' } }

    const formattedCode = inviteCode.trim().toUpperCase()
    const { data: classId, error } = await supabase.rpc('join_class_by_code', {
      p_code: formattedCode,
    })

    if (error) return { data: null, error }
    return { data: { class_id: classId }, error: null }
  },

  // Lấy các lớp học học viên đang tham gia (kèm tên khóa Zoom)
  async getStudentClasses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: 'Chưa đăng nhập' } }

    const { data, error } = await supabase
      .from('class_members')
      .select(
        'joined_at, classes(*, courses:course_id(id, title, enrollment_mode))'
      )
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })

    if (error) return { error }

    const classes = (data || []).map((m) => m.classes).filter(Boolean)
    const teacherIds = [...new Set(classes.map((c) => c.teacher_id).filter(Boolean))]
    let nameById = {}
    if (teacherIds.length) {
      const { data: pubs } = await supabase
        .from('profiles_public')
        .select('id, name')
        .in('id', teacherIds)
      nameById = Object.fromEntries((pubs || []).map((p) => [p.id, p.name]))
    }

    return {
      data: classes.map((c) => ({
        ...c,
        profiles: c.teacher_id
          ? { id: c.teacher_id, name: nameById[c.teacher_id] || null }
          : null,
      })),
      error: null,
    }
  }
}
