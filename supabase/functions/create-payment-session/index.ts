import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildVietQrAppUrl,
  corsHeaders,
  generatePaymentCode,
  jsonResponse,
} from '../_shared/sepay.ts'

const EXPIRATION_SECONDS = Number(Deno.env.get('SEPAY_PAYMENT_EXPIRATION_SECONDS') || '300')

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

    const { order_ids: orderIds } = await req.json()
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return jsonResponse({ error: 'order_ids bắt buộc' }, 400)
    }

    const { data: orders, error: orderErr } = await admin
      .from('orders')
      .select('id, user_id, total_price, status')
      .in('id', orderIds)

    if (orderErr) throw orderErr
    if (!orders || orders.length !== orderIds.length) {
      return jsonResponse({ error: 'Một số đơn hàng không tồn tại' }, 400)
    }

    for (const o of orders) {
      if (o.user_id !== user.id) {
        return jsonResponse({ error: 'Không có quyền với đơn hàng này' }, 403)
      }
      if (o.status !== 'pending' && o.status !== 'awaiting_confirmation') {
        return jsonResponse({ error: `Đơn ${o.id} không ở trạng thái chờ thanh toán` }, 400)
      }
      if (Number(o.total_price) <= 0) {
        return jsonResponse({ error: 'Chỉ tạo phiên cho đơn có phí' }, 400)
      }
    }

    const amount = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0)
    if (amount <= 0) {
      return jsonResponse({ error: 'Tổng tiền không hợp lệ' }, 400)
    }

    // Một user chỉ 1 phiên pending còn hạn — resume thay vì tạo đơn/phiên mới
    const { data: existing } = await admin
      .from('payment_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return jsonResponse({
        paymentCode: existing.payment_code,
        qrUrl: existing.qr_url,
        amount: Number(existing.amount),
        expiresAt: existing.expires_at,
        status: existing.status,
        orderIds: existing.order_ids,
        resumed: true,
      })
    }

    // Cancel other pending sessions for these orders (optional soft)
    const paymentCode = generatePaymentCode()
    const qrUrl = buildVietQrAppUrl(paymentCode, amount)
    const expiresAt = new Date(Date.now() + EXPIRATION_SECONDS * 1000).toISOString()

    const { data: session, error: insertErr } = await admin
      .from('payment_sessions')
      .insert({
        payment_code: paymentCode,
        user_id: user.id,
        order_ids: orderIds,
        amount,
        status: 'pending',
        provider: 'sepay',
        qr_url: qrUrl,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    await admin
      .from('orders')
      .update({ payment_code: paymentCode })
      .in('id', orderIds)

    return jsonResponse({
      paymentCode: session.payment_code,
      qrUrl: session.qr_url,
      amount: Number(session.amount),
      expiresAt: session.expires_at,
      status: session.status,
      orderIds: session.order_ids,
    })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err.message || 'Lỗi tạo phiên thanh toán' }, 500)
  }
})
