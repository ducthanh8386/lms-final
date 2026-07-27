import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { paymentService } from '../../services/paymentService'
import { useToast } from '../../context/ToastContext'
import { usePendingPayment } from '../../context/PendingPaymentContext'

const formatPrice = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

const formatCountdown = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

const CheckoutDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { setPendingFromSession, clearPending } = usePendingPayment()

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const paymentCodeFromUrl = searchParams.get('payment') || location.state?.payment?.paymentCode || ''

  const [session, setSession] = useState(location.state?.payment || null)
  const [status, setStatus] = useState(location.state?.payment?.status || 'pending')
  const [loading, setLoading] = useState(!location.state?.payment)
  const [copied, setCopied] = useState(false)
  const [remainingSec, setRemainingSec] = useState(null)

  const loadSession = useCallback(async () => {
    if (!paymentCodeFromUrl) {
      navigate('/courses')
      return
    }
    setLoading(true)
    const { data, error } = await paymentService.getSessionByCode(paymentCodeFromUrl)
    if (error || !data) {
      toast.error('Không tìm thấy phiên thanh toán')
      clearPending()
      navigate('/courses')
      return
    }
    const mapped = {
      paymentCode: data.payment_code,
      qrUrl: data.qr_url,
      amount: Number(data.amount),
      expiresAt: data.expires_at,
      status: data.status,
      orderIds: data.order_ids,
    }
    setSession(mapped)
    setStatus(data.status)
    if (data.status === 'pending') setPendingFromSession(mapped)
    else clearPending()
    setLoading(false)
  }, [paymentCodeFromUrl, navigate, toast, setPendingFromSession, clearPending])

  useEffect(() => {
    if (!session && paymentCodeFromUrl) {
      loadSession()
    } else if (!paymentCodeFromUrl) {
      if (searchParams.get('ids')) {
        toast.error('Vui lòng mua lại khóa học để thanh toán qua SePay.')
      }
      navigate('/courses')
    } else {
      if (session?.status === 'pending' || (!session?.status && status === 'pending')) {
        setPendingFromSession(session)
      }
      setLoading(false)
    }
  }, [])

  const syncOnce = useCallback(async () => {
    if (!paymentCodeFromUrl || status === 'succeeded' || status === 'cancelled') return
    const { data, error } = await paymentService.syncPayment(paymentCodeFromUrl)
    if (error) {
      console.warn(error.message)
      return
    }
    if (!data) return
    setStatus(data.status)
    setSession((prev) => {
      const next = prev
        ? {
            ...prev,
            status: data.status,
            qrUrl: data.qrUrl || prev.qrUrl,
            amount: data.amount ?? prev.amount,
            expiresAt: data.expiresAt || prev.expiresAt,
          }
        : prev
      if (data.status === 'pending') setPendingFromSession(next)
      else clearPending()
      return next
    })
    if (data.status === 'succeeded') {
      clearPending()
      toast.success('Thanh toán thành công! Đã mở khóa học.')
    }
    if (data.status === 'cancelled') {
      clearPending()
    }
  }, [paymentCodeFromUrl, status, toast, setPendingFromSession, clearPending])

  useEffect(() => {
    if (status !== 'pending' || !paymentCodeFromUrl) return
    syncOnce()
    const id = setInterval(syncOnce, 10000)
    return () => clearInterval(id)
  }, [status, paymentCodeFromUrl, syncOnce])

  useEffect(() => {
    if (status === 'succeeded') {
      const t = setTimeout(() => navigate('/learning'), 1800)
      return () => clearTimeout(t)
    }
  }, [status, navigate])

  useEffect(() => {
    if (status !== 'pending' || !session?.expiresAt) {
      setRemainingSec(null)
      return
    }
    let expiredHandled = false
    const tick = () => {
      const left = Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
      setRemainingSec(left)
      if (left <= 0 && !expiredHandled) {
        expiredHandled = true
        syncOnce()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status, session?.expiresAt, syncOnce])

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Đã sao chép nội dung chuyển khoản')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#F5F5F5]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === 'succeeded') {
    return (
      <div className="min-h-[calc(100vh-66px)] bg-[#F5F5F5]">
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[24px] font-extrabold text-[#242424]">Thanh toán thành công</h2>
          <p className="mt-3 text-[14px] text-[#666]">
            Khóa học đã được kích hoạt. Đang chuyển tới trang học tập…
          </p>
          <Link
            to="/learning"
            className="mt-8 rounded-full bg-primary px-6 py-3.5 text-[14px] font-bold text-white hover:bg-brand-orangeHover"
          >
            Vào học ngay
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="min-h-[calc(100vh-66px)] bg-[#F5F5F5]">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h2 className="text-[22px] font-extrabold text-[#242424]">Phiên thanh toán đã hết hạn</h2>
          <p className="mt-2 text-[14px] text-[#666]">Vui lòng mua lại khóa học để tạo phiên mới.</p>
          <Link
            to="/courses"
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-[14px] font-bold text-white"
          >
            Xem khóa học
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-6 lg:py-10">
        <nav className="mb-6 flex items-center gap-2 text-[13px] font-semibold text-[#666]">
          <Link to="/courses" className="hover:text-primary">
            1. Chọn khóa
          </Link>
          <span className="text-[#DBDBDB]">/</span>
          <span className="text-primary">2. Thanh toán SePay</span>
          <span className="text-[#DBDBDB]">/</span>
          <span>3. Hoàn tất</span>
        </nav>

        <h1 className="text-[26px] font-extrabold text-[#242424]">Thanh toán chuyển khoản</h1>
        <p className="mt-1 text-[14px] text-[#666]">
          Quét mã VietQR hoặc chuyển khoản đúng số tiền và nội dung. Hệ thống tự xác nhận qua SePay.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-sm">
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
            <div className="flex shrink-0 flex-col items-center">
              <div className="flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white p-2">
                {session.qrUrl ? (
                  <img src={session.qrUrl} alt="VietQR" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[12px] text-[#999]">Không tạo được QR</span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[#999]">Mở app ngân hàng và quét mã</p>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#999]">Số tiền</p>
                <p className="text-[28px] font-extrabold text-primary">{formatPrice(session.amount)}</p>
              </div>

              {remainingSec != null && (
                <div
                  className={`rounded-xl px-4 py-3 ${
                    remainingSec <= 60
                      ? 'border border-red-200 bg-red-50'
                      : 'border border-amber-200 bg-amber-50'
                  }`}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      remainingSec <= 60 ? 'text-red-500' : 'text-amber-700'
                    }`}
                  >
                    Thời gian còn lại
                  </p>
                  <p
                    className={`mt-0.5 font-mono text-[32px] font-extrabold tabular-nums ${
                      remainingSec <= 60 ? 'text-red-600' : 'text-amber-800'
                    }`}
                  >
                    {formatCountdown(remainingSec)}
                  </p>
                  <p className={`mt-1 text-[12px] ${remainingSec <= 60 ? 'text-red-500' : 'text-amber-700'}`}>
                    Phiên thanh toán hết hạn sau 5 phút
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-500">
                  Nội dung chuyển khoản
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[18px] font-extrabold text-red-600">
                    {session.paymentCode}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyText(session.paymentCode)}
                    className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-red-600 ring-1 ring-red-100"
                  >
                    {copied ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-[#666]">
                <li>Nhập đúng nội dung để hệ thống đối soát tự động.</li>
                <li>Trang tự kiểm tra mỗi 10 giây — không cần bấm xác nhận.</li>
                <li>Hết giờ sẽ hủy phiên — mua lại khóa nếu cần thanh toán tiếp.</li>
              </ul>

              <div className="flex items-center gap-2 text-[13px] text-[#888]">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Đang chờ thanh toán…
                <button
                  type="button"
                  onClick={syncOnce}
                  className="ml-auto font-semibold text-primary hover:underline"
                >
                  Kiểm tra lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutDetail
