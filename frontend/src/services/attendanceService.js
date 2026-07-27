import { supabase } from '../lib/supabaseClient'

export const attendanceService = {
  async getForSchedule(scheduleId) {
    const { data, error } = await supabase
      .from('schedule_attendance')
      .select('*, profiles:student_id(name, email)')
      .eq('schedule_id', scheduleId)
    return { data, error }
  },

  async upsert(scheduleId, studentId, status, note = null) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('schedule_attendance')
      .upsert(
        {
          schedule_id: scheduleId,
          student_id: studentId,
          status,
          note,
          marked_by: user?.id || null,
          marked_at: new Date().toISOString(),
        },
        { onConflict: 'schedule_id,student_id' }
      )
      .select()
      .single()
    return { data, error }
  },
}
