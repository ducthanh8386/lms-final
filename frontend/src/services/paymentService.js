import { supabase } from '../lib/supabaseClient'

async function invokePayment(fnName, body) {
  const { data, error } = await supabase.functions.invoke(fnName, { body })
  if (error) {
    const msg =
      data?.error ||
      error.message ||
      'Lỗi gọi dịch vụ thanh toán'
    return { data: null, error: { message: msg } }
  }
  if (data?.error) {
    return { data: null, error: { message: data.error } }
  }
  return { data, error: null }
}

export const PENDING_PAYMENT_STORAGE_KEY = 'lms_pending_payment_code'

export const paymentService = {
  async createSession(orderIds) {
    return invokePayment('create-payment-session', { order_ids: orderIds })
  },

  async syncPayment(paymentCode) {
    return invokePayment('sync-payment', { paymentCode })
  },

  async getSessionByCode(paymentCode) {
    const { data, error } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('payment_code', paymentCode)
      .maybeSingle()
    return { data, error }
  },

  /** Phiên SePay còn hạn của user hiện tại (nếu có). */
  async getActivePendingSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { data: null, error: null }

    const { data, error } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return { data, error }
  },

  rememberPaymentCode(paymentCode) {
    if (!paymentCode) return
    try {
      localStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, paymentCode)
    } catch {
      /* ignore */
    }
  },

  clearRememberedPaymentCode() {
    try {
      localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  },

  getRememberedPaymentCode() {
    try {
      return localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY) || ''
    } catch {
      return ''
    }
  },
}
