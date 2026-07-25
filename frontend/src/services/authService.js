import { supabase } from '../lib/supabaseClient'

export const authService = {
  // Đăng ký user mới
  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name, // sẽ được trigger dùng để insert vào profiles
        },
      },
    })
    return { data, error }
  },

  // Đăng nhập
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Đăng nhập OAuth (Google / Facebook / Github)
  async signInWithOAuth(provider, redirectTo = '/') {
    const redirectURL = `${window.location.origin}${redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`}`
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectURL,
      },
    })
    return { data, error }
  },

  // Đăng xuất
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Lấy session hiện tại
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Lấy profile từ bảng profiles (chứa role)
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  async updateProfile(userId, fields) {
    const { data, error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    return { data, error }
  },

  /** Xác minh mật khẩu cũ rồi đổi sang mật khẩu mới */
  async changePassword(email, currentPassword, newPassword) {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (verifyError) {
      return { data: null, error: { message: 'Mật khẩu hiện tại không đúng' } }
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    return { data, error }
  },
}
