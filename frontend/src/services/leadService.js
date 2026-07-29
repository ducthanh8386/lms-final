import { supabase } from '../lib/supabaseClient'

export const LEAD_STATUS = [
  { value: 'new', label: 'Mới đăng ký', className: 'bg-amber-50 text-amber-700' },
  { value: 'contacted', label: 'Đã liên hệ', className: 'bg-sky-50 text-sky-700' },
  { value: 'consulting', label: 'Đang tư vấn', className: 'bg-violet-50 text-violet-700' },
  { value: 'agreed', label: 'Đồng ý đăng ký', className: 'bg-indigo-50 text-indigo-700' },
  { value: 'paid', label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700' },
  { value: 'placed', label: 'Đã xếp lớp', className: 'bg-green-50 text-green-800' },
  { value: 'closed', label: 'Đóng', className: 'bg-slate-100 text-slate-600' },
]

export const STATUS_OPTIONS = [
  { value: 'sinh_vien_it', label: 'Sinh viên IT' },
  { value: 'sinh_vien_trai_nganh', label: 'Sinh viên trái ngành' },
  { value: 'di_lam_it', label: 'Người đi làm IT' },
  { value: 'di_lam_trai_nganh', label: 'Người đi làm trái ngành' },
]

export const GOAL_OPTIONS = [
  { value: 'chuyen_nganh', label: 'Chuyển ngành/đổi nghề' },
  { value: 'thuc_tap', label: 'Xin được thực tập' },
  { value: 'ho_tro_cong_viec', label: 'Hỗ trợ việc học / công việc hiện tại' },
  { value: 'dam_me', label: 'Phục vụ đam mê' },
]

export const leadService = {
  async submitLead(payload) {
    // RPC SECURITY DEFINER — tránh lỗi RLS khi insert().select() (HV/anon không SELECT được lead)
    const { data, error } = await supabase.rpc('submit_course_lead', {
      p_course_id: payload.courseId,
      p_full_name: payload.fullName?.trim() || '',
      p_phone: payload.phone?.trim() || '',
      p_email: payload.email?.trim() || null,
      p_current_status: payload.currentStatus,
      p_learning_goal: payload.learningGoal,
      p_preferred_schedule: payload.preferredSchedule?.trim() || null,
      p_notes: payload.notes?.trim() || null,
    })
    return { data, error }
  },

  async getLeadsForTeacher(teacherId) {
    const { data, error } = await supabase
      .from('course_leads')
      .select('*, courses!inner(id, title, teacher_id), classes:assigned_class_id(id, name)')
      .eq('courses.teacher_id', teacherId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getAllLeads() {
    const { data, error } = await supabase
      .from('course_leads')
      .select('*, courses(id, title, teacher_id), classes:assigned_class_id(id, name)')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async updateLeadStatus(leadId, status) {
    const { data, error } = await supabase
      .from('course_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select('*, courses(id, title), classes:assigned_class_id(id, name)')
      .single()
    return { data, error }
  },

  async updateLeadNotes(leadId, consultantNotes) {
    const { data, error } = await supabase
      .from('course_leads')
      .update({
        consultant_notes: consultantNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single()
    return { data, error }
  },

  async placeIntoClass(leadId, classId) {
    const { data, error } = await supabase.rpc('place_lead_into_class', {
      p_lead_id: leadId,
      p_class_id: classId,
    })
    return { data, error }
  },

  async getClassesForCourse(courseId) {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, schedule_label, status, max_students, class_members(id, status)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
    return { data, error }
  },
}
