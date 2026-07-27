import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { usePendingPayment } from '../../context/PendingPaymentContext'

const formatCountdown = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

const formatPrice = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

/**
 * Banner toàn app: còn phiên SePay chưa trả thì nhắc + link tiếp tục.
 * Ẩn trên chính trang checkout.
 */
const PendingPaymentBanner = ({ className = '' }) => {
  const { pending, hasPendingPayment } = usePendingPayment()
  const location = useLocation()
  const [remainingSec, setRemainingSec] = useState(null)

  const onCheckout =
    location.pathname.startsWith('/checkout/detail') ||
    location.search.includes('payment=')

  useEffect(() => {
    if (!pending?.expiresAt) {
      setRemainingSec(null)
      return
    }
    const tick = () => {
      setRemainingSec(Math.ceil((new Date(pending.expiresAt).getTime() - Date.now()) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pending?.expiresAt])

  if (!hasPendingPayment || onCheckout || remainingSec == null || remainingSec <= 0) {
    return null
  }

  return (
    <div
      className={`border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 ${className}`}
      role="status"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-[13px] sm:text-[14px]">
          <p className="font-bold">Bạn còn đơn chưa thanh toán</p>
          <p className="mt-0.5 text-amber-800/90">
            Số tiền {formatPrice(pending.amount)} · còn {formatCountdown(remainingSec)}. Hoàn tất
            trước khi mua khóa khác.
          </p>
        </div>
        <Link
          to={`/checkout/detail?payment=${encodeURIComponent(pending.paymentCode)}`}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-orangeHover"
        >
          Tiếp tục thanh toán
        </Link>
      </div>
    </div>
  )
}

export default PendingPaymentBanner
