/** Shared helpers for SePay Edge Functions */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-secret-key, x-sepay-signature, x-sepay-timestamp',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function generatePaymentCode() {
  const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()
  return `PAY${hex}`
}

export function buildVietQrUrl(paymentCode: string, amount: number) {
  const acc = Deno.env.get('SEPAY_QR_BANK_ACCOUNT') || ''
  const bank = Deno.env.get('SEPAY_QR_BANK_CODE') || ''
  const template = Deno.env.get('SEPAY_QR_TEMPLATE') || 'compact'
  if (!acc || !bank) {
    throw new Error('Chưa cấu hình SEPAY_QR_BANK_ACCOUNT / SEPAY_QR_BANK_CODE')
  }
  const amountInt = Math.round(Number(amount))
  const params = new URLSearchParams({
    acc,
    bank,
    amount: String(amountInt),
    des: paymentCode,
    template,
  })
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-${encodeURIComponent(template)}.png?amount=${amountInt}&addInfo=${encodeURIComponent(paymentCode)}`
}

/** Alternate vietqr.app style used by band-room */
export function buildVietQrAppUrl(paymentCode: string, amount: number) {
  const acc = Deno.env.get('SEPAY_QR_BANK_ACCOUNT') || ''
  const bank = Deno.env.get('SEPAY_QR_BANK_CODE') || ''
  const template = Deno.env.get('SEPAY_QR_TEMPLATE') || 'compact'
  if (!acc || !bank) {
    throw new Error('Chưa cấu hình SEPAY_QR_BANK_ACCOUNT / SEPAY_QR_BANK_CODE')
  }
  const amountInt = Math.round(Number(amount))
  const q = new URLSearchParams({
    acc,
    bank,
    amount: String(amountInt),
    des: paymentCode,
    template,
  })
  return `https://vietqr.app/img?${q.toString()}`
}

export function normalizePaymentCode(raw: string | null | undefined) {
  if (!raw) return null
  const m = String(raw).toUpperCase().match(/PAY-?[A-Z0-9]{16}/)
  if (!m) return null
  return m[0].replace(/-/g, '')
}

export function extractPaymentCodeFromText(...parts: (string | null | undefined)[]) {
  for (const p of parts) {
    const code = normalizePaymentCode(p)
    if (code) return code
  }
  // looser: search PAY + 16 alnum anywhere
  const joined = parts.filter(Boolean).join(' ')
  const m = joined.toUpperCase().match(/PAY[A-Z0-9]{16}/)
  return m ? m[0] : null
}

export async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type SePayIncoming = {
  providerTransactionId: string | null
  amount: number
  content: string
  transferType: string
}

export async function findSePayIncomingPayment(opts: {
  paymentCode: string
  amount: number
  createdAt: string
}): Promise<SePayIncoming | null> {
  const token = Deno.env.get('SEPAY_API_ACCESS_TOKEN')
  if (!token) return null

  const accountNumber =
    Deno.env.get('SEPAY_API_ACCOUNT_NUMBER') || Deno.env.get('SEPAY_QR_BANK_ACCOUNT') || ''
  const bankAccountId = Deno.env.get('SEPAY_API_BANK_ACCOUNT_ID') || ''

  const created = new Date(opts.createdAt)
  const from = new Date(created)
  from.setDate(from.getDate() - 1)
  const to = new Date()
  to.setDate(to.getDate() + 1)

  const format = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  // Try v2 then v1
  const candidates: SePayIncoming[] = []

  try {
    const v2Url = new URL('https://userapi.sepay.vn/v2/transactions')
    if (bankAccountId) v2Url.searchParams.set('bank_account_id', bankAccountId)
    v2Url.searchParams.set('transfer_type', 'in')
    v2Url.searchParams.set('from_date', format(from))
    v2Url.searchParams.set('to_date', format(to))
    v2Url.searchParams.set('limit', '50')

    const v2Res = await fetch(v2Url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (v2Res.ok) {
      const body = await v2Res.json()
      const list = body?.data?.transactions || body?.transactions || body?.data || []
      for (const tx of list) {
        candidates.push(mapTx(tx))
      }
    }
  } catch {
    /* fall through */
  }

  if (candidates.length === 0) {
    try {
      const v1Url = new URL('https://my.sepay.vn/userapi/transactions/list')
      if (accountNumber) v1Url.searchParams.set('account_number', accountNumber)
      v1Url.searchParams.set('transaction_date_min', format(from).slice(0, 10))
      v1Url.searchParams.set('transaction_date_max', format(to).slice(0, 10))
      v1Url.searchParams.set('limit', '50')

      const v1Res = await fetch(v1Url.toString(), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (v1Res.ok) {
        const body = await v1Res.json()
        const list = body?.transactions || body?.data || []
        for (const tx of list) {
          candidates.push(mapTx(tx))
        }
      }
    } catch {
      /* ignore */
    }
  }

  const code = opts.paymentCode.toUpperCase()
  const minAmount = Number(opts.amount)

  for (const tx of candidates) {
    if (tx.transferType && tx.transferType !== 'in') continue
    if (Number(tx.amount) < minAmount) continue
    const content = (tx.content || '').toUpperCase().replace(/-/g, '')
    const codeNorm = code.replace(/-/g, '')
    if (!content.includes(codeNorm)) continue
    return tx
  }
  return null
}

function mapTx(tx: Record<string, unknown>): SePayIncoming {
  const amount = Number(
    tx.amount ?? tx.transfer_amount ?? tx.transaction_amount ?? 0
  )
  const content = String(
    tx.transaction_content ??
      tx.content ??
      tx.description ??
      tx.code ??
      ''
  )
  const id = String(
    tx.id ?? tx.transaction_id ?? tx.reference_number ?? tx.transaction_uuid ?? ''
  )
  const transferType = String(tx.transfer_type ?? tx.transferType ?? 'in').toLowerCase()
  return {
    providerTransactionId: id || null,
    amount,
    content,
    transferType,
  }
}
