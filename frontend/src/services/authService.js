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
  }
}
