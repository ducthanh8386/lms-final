import { supabase } from '../lib/supabaseClient'

export const notificationService = {
  // Lấy 20 thông báo gần nhất của người dùng
  async getNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return { data, error }
  },

  // Đếm số lượng thông báo chưa đọc
  async getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: 0 }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return { data: count || 0, error }
  },

  // Đánh dấu 1 thông báo đã đọc
  async markAsRead(notificationId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()

    return { data, error }
  },

  // Đánh dấu tất cả thông báo là đã đọc
  async markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)

    return { data, error }
  },

  // Tạo thông báo mới (sử dụng khi thực hiện các hành động trong App)
  async createNotification(userId, type, title, body, relatedId = null, relatedType = null) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        body,
        related_id: relatedId,
        related_type: relatedType
      }])
      .select()
      .single()

    return { data, error }
  }
}
