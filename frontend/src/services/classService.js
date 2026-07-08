import { supabase } from '../lib/supabaseClient'

export const classService = {
  // === CHO GIÁO VIÊN ===

  // Tạo lớp học mới
  async createClass(classData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('classes')
      .insert([{ 
        ...classData, 
        teacher_id: user.id 
      }])
      .select()
      .single()

    return { data, error }
  },

  // Lấy các lớp do giáo viên hiện tại quản lý
  async getTeacherClasses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    // Query kèm theo đếm học viên đang học trong mỗi lớp
    const { data, error } = await supabase
      .from('classes')
      .select('*, class_members(id, status)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return { error }

    // Map thêm sĩ số (chỉ đếm status = active)
    const formattedData = data.map(c => {
      const activeMembers = c.class_members?.filter(m => m.status === 'active') || []
      return {
        ...c,
        student_count: activeMembers.length
      }
    })

    return { data: formattedData, error: null }
  },

  // Lấy chi tiết lớp + danh sách học viên
  async getClassDetails(classId) {
    // Lấy thông tin lớp
    const { data: classObj, error: classErr } = await supabase
      .from('classes')
      .select('*, courses(title)')
      .eq('id', classId)
      .single()

    if (classErr) return { error: classErr }

    // Lấy danh sách học viên của lớp
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
        members: members || []
      }
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

  // Tham gia lớp bằng mã mời
  async joinClassByCode(inviteCode) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const formattedCode = inviteCode.trim().toUpperCase()

    // 1. Tìm lớp bằng mã mời (phải là lớp active)
    const { data: classObj, error: classErr } = await supabase
      .from('classes')
      .select('*')
      .eq('invite_code', formattedCode)
      .eq('is_active', true)
      .single()

    if (classErr || !classObj) {
      return { error: { message: "Mã lớp học không hợp lệ hoặc lớp học đã bị đóng." } }
    }

    // 2. Kiểm tra xem sĩ số lớp đã đầy chưa
    const { count, error: countErr } = await supabase
      .from('class_members')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classObj.id)
      .eq('status', 'active')

    if (countErr) return { error: countErr }

    if (count >= (classObj.max_students || 50)) {
      return { error: { message: "Lớp học đã đạt số lượng học viên tối đa." } }
    }

    // 3. Kiểm tra xem học viên đã từng có bản ghi thành viên hay chưa
    const { data: existing, error: existErr } = await supabase
      .from('class_members')
      .select('*')
      .eq('class_id', classObj.id)
      .eq('student_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        return { error: { message: "Bạn đã tham gia lớp này rồi!" } }
      } else {
        // Kích hoạt lại
        const { data, error } = await supabase
          .from('class_members')
          .update({ status: 'active', joined_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
        return { data, error }
      }
    }

    // 4. Nếu chưa có, tiến hành chèn bản ghi mới
    const { data, error } = await supabase
      .from('class_members')
      .insert([{
        class_id: classObj.id,
        student_id: user.id,
        status: 'active'
      }])
      .select()
      .single()

    return { data, error }
  },

  // Lấy các lớp học học viên đang tham gia
  async getStudentClasses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('class_members')
      .select('joined_at, classes(*, profiles:teacher_id(name, email))')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })

    if (error) return { error }
    return { data: data?.map(m => m.classes).filter(Boolean) || [], error: null }
  }
}
