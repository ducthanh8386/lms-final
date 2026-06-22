import { supabase } from '../lib/supabaseClient'

export const assignmentService = {
  // Lấy danh sách bài tập của 1 khóa học
  async getAssignments(courseId) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true })
    return { data, error }
  },

  // Tạo bài tập mới
  async createAssignment(assignmentData) {
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select()
    return { data, error }
  },

  // Cập nhật bài tập
  async updateAssignment(assignmentId, assignmentData) {
    const { data, error } = await supabase
      .from('assignments')
      .update(assignmentData)
      .eq('id', assignmentId)
      .select()
    return { data, error }
  },

  // Xóa bài tập
  async deleteAssignment(assignmentId) {
    const { data, error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
    return { data, error }
  },

  // Tải file đề bài lên bucket assignment-files
  async uploadAssignmentFile(courseId, assignmentId, file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${courseId}/${assignmentId}/${Math.random()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('assignment-files')
      .upload(fileName, file)
      
    if (error) return { error }
    return { data: data.path }
  },

  // Tải file nộp bài lên bucket submission-files
  async uploadSubmissionFile(courseId, assignmentId, file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${courseId}/${assignmentId}/${Math.random()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('submission-files')
      .upload(fileName, file)
      
    if (error) return { error }
    return { data: data.path }
  },

  // Lấy object URL từ private bucket
  async downloadFile(bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)
      
    if (error) return { error }
    const url = URL.createObjectURL(data)
    return { data: url }
  },

  // Nộp bài
  async submitAssignment(submissionData) {
    const { data: existing } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', submissionData.assignment_id)
      .eq('student_id', submissionData.student_id)
      .single()
      
    if (existing) {
      const { data, error } = await supabase
        .from('submissions')
        .update({ file_url: submissionData.file_url, submitted_at: new Date() })
        .eq('id', existing.id)
        .select()
      return { data, error }
    } else {
      const { data, error } = await supabase
        .from('submissions')
        .insert([submissionData])
        .select()
      return { data, error }
    }
  },

  // Lấy danh sách bài nộp của 1 assignment (cho giáo viên)
  async getAssignmentSubmissions(assignmentId) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*, profiles(name, email)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    return { data, error }
  },

  // Lấy bài nộp của 1 student cho 1 assignment
  async getStudentSubmission(assignmentId, studentId) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .single()
      
    if (error && error.code === 'PGRST116') {
      return { data: null } // No rows found
    }
    return { data, error }
  },

  // Chấm điểm
  async gradeSubmission(submissionId, grade, feedback) {
    const { data, error } = await supabase
      .from('submissions')
      .update({ grade, feedback })
      .eq('id', submissionId)
      .select()
    return { data, error }
  }
}
