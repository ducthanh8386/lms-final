import { supabase } from '../lib/supabaseClient'

export const scheduleService = {
  // === CHO GIÁO VIÊN ===

  // Tạo buổi dạy (đơn lẻ hoặc lặp lại)
  async createSchedule(scheduleData) {
    const { recurrence_type, recurrence_days, recurrence_end_date, start_time, end_time, ...rest } = scheduleData
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const baseRecord = {
      ...rest,
      teacher_id: user.id
    }

    if (recurrence_type === 'weekly' && recurrence_days?.length > 0 && recurrence_end_date) {
      const records = []
      const endLimit = new Date(recurrence_end_date)
      
      let currentStart = new Date(start_time)
      let currentEnd = new Date(end_time)
      const durationMs = currentEnd.getTime() - currentStart.getTime()

      let safetyCounter = 0
      while (currentStart <= endLimit && safetyCounter < 180) {
        safetyCounter++
        const dayOfWeek = currentStart.getDay() // 0 = CN, 1 = T2, etc.
        
        if (recurrence_days.includes(dayOfWeek)) {
          records.push({
            ...baseRecord,
            start_time: currentStart.toISOString(),
            end_time: currentEnd.toISOString(),
            recurrence_type: 'none'
          })
        }
        
        // Tăng thêm 1 ngày
        currentStart.setDate(currentStart.getDate() + 1)
        currentEnd = new Date(currentStart.getTime() + durationMs)
      }

      if (records.length === 0) {
        return { error: { message: "Không tìm thấy ngày phù hợp để tạo lịch lặp lại." } }
      }

      const { data, error } = await supabase
        .from('schedules')
        .insert(records)
        .select()
      
      return { data, error }
    } else {
      const { data, error } = await supabase
        .from('schedules')
        .insert([{
          ...baseRecord,
          start_time,
          end_time,
          recurrence_type: 'none'
        }])
        .select()
        .single()
      
      return { data, error }
    }
  },

  // Cập nhật lịch học
  async updateSchedule(scheduleId, scheduleData) {
    const { data, error } = await supabase
      .from('schedules')
      .update(scheduleData)
      .eq('id', scheduleId)
      .select()
      .single()
    return { data, error }
  },

  // Xóa lịch học
  async deleteSchedule(scheduleId) {
    const { data, error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId)
    return { data, error }
  },

  // Lấy lịch học của giáo viên (lọc theo khoảng thời gian)
  async getTeacherSchedules(startDate, endDate) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('schedules')
      .select('*, classes(name)')
      .eq('teacher_id', user.id)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true })

    return { data, error }
  },

  // Gán học sinh từ lớp học sang danh sách người tham gia buổi học
  async addParticipantsFromClass(scheduleId, classId) {
    // 1. Lấy tất cả học sinh đang học trong lớp
    const { data: members, error: membersErr } = await supabase
      .from('class_members')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'active')

    if (membersErr) return { error: membersErr }
    if (!members || members.length === 0) return { data: [], error: null }

    // 2. Insert hàng loạt vào schedule_participants
    const participants = members.map(m => ({
      schedule_id: scheduleId,
      student_id: m.student_id,
      status: 'pending'
    }))

    const { data, error } = await supabase
      .from('schedule_participants')
      .insert(participants)
      .select()

    return { data, error }
  },

  // Gán học viên đơn lẻ
  async addParticipant(scheduleId, studentId) {
    const { data, error } = await supabase
      .from('schedule_participants')
      .insert([{ schedule_id: scheduleId, student_id: studentId, status: 'pending' }])
      .select()
      .single()
    return { data, error }
  },

  // === CHO HỌC VIÊN ===

  // Lấy lịch học của học viên (lọc theo khoảng thời gian)
  async getStudentSchedules(startDate, endDate) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('schedule_participants')
      .select('schedule_id, status, schedules(*, classes(name), profiles:teacher_id(name))')
      .eq('student_id', user.id)
      .gte('schedules.start_time', startDate)
      .lte('schedules.start_time', endDate)

    if (error) return { error }

    // Format lại dữ liệu trả về cho đồng bộ cấu trúc lịch
    const formattedSchedules = data
      .filter(p => p.schedules !== null)
      .map(p => ({
        ...p.schedules,
        participation_status: p.status
      }))
      // Sắp xếp tăng dần theo thời gian
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

    return { data: formattedSchedules, error: null }
  },

  // Học viên xác nhận tham gia buổi học (status = 'confirmed' / 'declined')
  async confirmAttendance(scheduleId, status) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('schedule_participants')
      .update({ status })
      .eq('schedule_id', scheduleId)
      .eq('student_id', user.id)
      .select()
      .single()

    return { data, error }
  }
}
