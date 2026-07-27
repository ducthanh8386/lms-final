import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders,
  findSePayIncomingPayment,
  jsonResponse,
} from '../_shared/sepay.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(supabaseUrl, serviceKey)

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token)
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { paymentCode } = await req.json()
    if (!paymentCode) return jsonResponse({ error: 'paymentCode bắt buộc' }, 400)

    const { data: session, error: sessErr } = await admin
      .from('payment_sessions')
      .select('*')
      .eq('payment_code', paymentCode)
      .single()

    if (sessErr || !session) {
      return jsonResponse({ error: 'Không tìm thấy phiên thanh toán' }, 404)
    }
    if (session.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    if (session.status === 'succeeded') {
      return jsonResponse({
        status: 'succeeded',
        paymentCode: session.payment_code,
        amount: Number(session.amount),
        expiresAt: session.expires_at,
        qrUrl: session.qr_url,
        orderIds: session.order_ids,
        alreadyCompleted: true,
      })
    }

    if (session.status === 'cancelled') {
      return jsonResponse({
        status: 'cancelled',
        paymentCode: session.payment_code,
        amount: Number(session.amount),
        expiresAt: session.expires_at,
        qrUrl: session.qr_url,
        orderIds: session.order_ids,
      })
    }

    const expired = new Date(session.expires_at).getTime() < Date.now()

    // Sync with SePay
    const incoming = await findSePayIncomingPayment({
      paymentCode: session.payment_code,
      amount: Number(session.amount),
      createdAt: session.created_at,
    })

    if (incoming) {
      const { data: result, error: completeErr } = await admin.rpc('complete_payment_session', {
        p_payment_code: session.payment_code,
        p_provider_tx_id: incoming.providerTransactionId,
      })
      if (completeErr) throw completeErr

      return jsonResponse({
        status: 'succeeded',
        paymentCode: session.payment_code,
        amount: Number(session.amount),
        expiresAt: session.expires_at,
        qrUrl: session.qr_url,
        orderIds: session.order_ids,
        result,
      })
    }

    if (expired) {
      await admin.rpc('cancel_payment_session', { p_payment_code: session.payment_code })
      return jsonResponse({
        status: 'cancelled',
        paymentCode: session.payment_code,
        amount: Number(session.amount),
        expiresAt: session.expires_at,
        qrUrl: session.qr_url,
        orderIds: session.order_ids,
        reason: 'timeout',
      })
    }

    return jsonResponse({
      status: 'pending',
      paymentCode: session.payment_code,
      amount: Number(session.amount),
      expiresAt: session.expires_at,
      qrUrl: session.qr_url,
      orderIds: session.order_ids,
    })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err.message || 'Lỗi đồng bộ thanh toán' }, 500)
  }
})
