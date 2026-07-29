import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders,
  extractPaymentCodeFromText,
  hmacSha256Hex,
  jsonResponse,
} from '../_shared/sepay.ts'

async function verifyWebhookAuth(req: Request, rawBody: string): Promise<boolean> {
  const ipnSecret = Deno.env.get('SEPAY_IPN_SECRET') || ''
  const hmacSecret = Deno.env.get('SEPAY_WEBHOOK_HMAC_SECRET') || ''

  const xSecret = req.headers.get('X-Secret-Key') || ''
  const auth = req.headers.get('Authorization') || ''
  const signature = req.headers.get('X-SePay-Signature') || ''

  // No auth headers sent by SePay → skip verification
  if (!xSecret && !auth && !signature) return true

  // Both secrets blank → allow
  if (!ipnSecret && !hmacSecret) return true

  if (ipnSecret && xSecret && xSecret === ipnSecret) return true

  if (ipnSecret && auth.toLowerCase().startsWith('apikey ')) {
    if (auth.slice(7).trim() === ipnSecret) return true
  }

  if (hmacSecret && signature) {
    const timestamp = req.headers.get('X-SePay-Timestamp') || ''
    const tolerance = Number(Deno.env.get('SEPAY_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS') || '300')
    if (timestamp) {
      const ts = Number(timestamp)
      if (!Number.isNaN(ts)) {
        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) <= tolerance) {
          const expected = await hmacSha256Hex(hmacSecret, `${timestamp}.${rawBody}`)
          const normalized = signature.replace(/^sha256=/i, '').toLowerCase()
          if (normalized === expected.toLowerCase()) return true
        }
      }
    }
  }

  return false
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    const rawBody = await req.text()
    const okAuth = await verifyWebhookAuth(req, rawBody)
    if (!okAuth) return jsonResponse({ error: 'Unauthorized webhook' }, 401)

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Gateway IPN shape
    const notificationType = String(payload.notification_type || '')
    const order = (payload.order || {}) as Record<string, unknown>
    const transaction = (payload.transaction || {}) as Record<string, unknown>

    let paymentCode: string | null = null
    let providerTxId: string | null = null
    let amount = 0

    if (notificationType) {
      if (notificationType === 'ORDER_PAID') {
        paymentCode = extractPaymentCodeFromText(
          String(order.order_invoice_number || ''),
          String(order.order_description || ''),
          String(order.order_id || '')
        )
        providerTxId = String(
          transaction.transaction_id || transaction.id || order.order_id || ''
        ) || null
        amount = Number(order.order_amount || transaction.amount || 0)
      } else if (
        ['ORDER_FAILED', 'TRANSACTION_VOID', 'ORDER_CANCELLED', 'ORDER_EXPIRED'].includes(
          notificationType
        )
      ) {
        return jsonResponse({ ok: true, ignored: notificationType })
      } else {
        return jsonResponse({ ok: true, ignored: notificationType })
      }
    } else {
      // Bank transfer flat payload
      const transferType = String(payload.transferType || payload.transfer_type || '').toLowerCase()
      if (transferType && transferType !== 'in') {
        return jsonResponse({ ok: true, ignored: 'not_incoming' })
      }
      paymentCode = extractPaymentCodeFromText(
        String(payload.content || ''),
        String(payload.description || ''),
        String(payload.code || ''),
        String(payload.transaction_content || ''),
        String(payload.referenceCode || '')
      )
      providerTxId = String(payload.id || payload.transaction_id || payload.referenceCode || '') || null
      amount = Number(payload.transferAmount || payload.amount || payload.transfer_amount || 0)
    }

    if (!paymentCode) {
      return jsonResponse({ ok: true, ignored: 'no_payment_code' })
    }

    const { data: session, error: sessErr } = await admin
      .from('payment_sessions')
      .select('*')
      .eq('payment_code', paymentCode)
      .maybeSingle()

    if (sessErr) throw sessErr
    if (!session) {
      return jsonResponse({ ok: true, ignored: 'session_not_found', paymentCode })
    }

    if (session.status === 'succeeded') {
      return jsonResponse({ ok: true, already_completed: true })
    }

    if (amount > 0 && Number(amount) < Number(session.amount)) {
      return jsonResponse({ ok: false, error: 'amount_too_low' }, 400)
    }

    const { data: result, error: completeErr } = await admin.rpc('complete_payment_session', {
      p_payment_code: paymentCode,
      p_provider_tx_id: providerTxId,
    })
    if (completeErr) throw completeErr

    return jsonResponse({ ok: true, result })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err.message || 'Webhook error' }, 500)
  }
})
