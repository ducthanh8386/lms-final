import { supabase } from '../lib/supabaseClient'

function relativeTime(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Vừa xong'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} tháng trước`
  return `${Math.floor(months / 12)} năm trước`
}

export const lessonCommentService = {
  relativeTime,

  async listByLesson(lessonId) {
    const { data, error } = await supabase.rpc('get_lesson_comments', {
      p_lesson_id: lessonId,
    })
    return { data: data || [], error }
  },

  async listByCourse(courseId) {
    const { data, error } = await supabase.rpc('get_course_lesson_comments', {
      p_course_id: courseId,
    })
    return { data: data || [], error }
  },

  async create({ lessonId, courseId, userId, body, parentId = null }) {
    const trimmed = String(body || '').trim()
    if (!trimmed) {
      return { data: null, error: { message: 'Nội dung không được để trống' } }
    }
    const { data, error } = await supabase
      .from('lesson_comments')
      .insert([
        {
          lesson_id: lessonId,
          course_id: courseId,
          user_id: userId,
          parent_id: parentId,
          body: trimmed,
        },
      ])
      .select('id')
      .single()
    return { data, error }
  },

  async remove(commentId) {
    const { error } = await supabase.from('lesson_comments').delete().eq('id', commentId)
    return { error }
  },

  async toggleLike(commentId, userId, liked) {
    if (liked) {
      const { error } = await supabase
        .from('lesson_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
      return { error }
    }
    const { error } = await supabase
      .from('lesson_comment_likes')
      .insert([{ comment_id: commentId, user_id: userId }])
    return { error }
  },
}
