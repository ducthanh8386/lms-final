import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import { studentService } from '../../services/studentService'
import { paymentService } from '../../services/paymentService'
import { useToast } from '../../context/ToastContext'
import { usePendingPayment } from '../../context/PendingPaymentContext'
import { supabase } from '../../lib/supabaseClient'

const formatPrice = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

const Cart = () => {
  const { cart, setCart, removeFromCart, clearCart, totalPrice } = useCart()
  const { user } = useAuth()
  const { openLogin } = useAuthModal()
  const { hasPendingPayment, pending, setPendingFromSession, refreshPending } = usePendingPayment()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (cart.length === 0 || verifying) return

    const verifyPrices = async () => {
      setVerifying(true)
      const courseIds = cart.map((item) => item.id)
      const { data: dbCourses, error: dbErr } = await supabase
        .from('courses')
        .select('id, title, price, is_free, status')
        .in('id', courseIds)

      if (dbErr || !dbCourses) {
        setVerifying(false)
        return
      }

      const dbMap = dbCourses.reduce((acc, c) => {
        acc[c.id] = c
        return acc
      }, {})

      const newWarnings = []
      let cartUpdated = false
      const updatedCart = []

      for (const item of cart) {
        const dbItem = dbMap[item.id]
        if (!dbItem || dbItem.status !== 'approved') {
          newWarnings.push(
            `Khóa học "${item.title}" không còn khả dụng và đã được xóa khỏi giỏ hàng.`
          )
          cartUpdated = true
        } else {
          const dbPrice = dbItem.is_free ? 0 : Number(dbItem.price || 0)
          const cartPrice = item.is_free ? 0 : Number(item.price || 0)

          if (dbPrice !== cartPrice) {
            newWarnings.push(
              `Giá khóa học "${item.title}" đã thay đổi từ ${formatPrice(cartPrice)} thành ${formatPrice(dbPrice)}.`
            )
            updatedCart.push({
              ...item,
              price: dbItem.price,
              is_free: dbItem.is_free,
            })
            cartUpdated = true
          } else {
            updatedCart.push(item)
          }
        }
      }

      if (cartUpdated) setCart(updatedCart)
      if (newWarnings.length > 0) setWarnings(newWarnings)
      setVerifying(false)
    }

    verifyPrices()
  }, [cart.length])

  const handleCheckout = async () => {
    if (!user) {
      openLogin('/cart')
      return
    }
    if (cart.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Còn phiên SePay chưa trả → không tạo đơn mới, quay lại thanh toán
      const active = (await refreshPending()) || pending
      if (active?.paymentCode) {
        toast.error('Bạn còn đơn chưa thanh toán. Hãy hoàn tất trước khi mua khóa khác.')
        navigate(`/checkout/detail?payment=${encodeURIComponent(active.paymentCode)}`, {
          state: { payment: active },
        })
        return
      }

      const { data, error: checkoutError } = await studentService.checkout(cart, user)
      if (checkoutError) throw new Error(checkoutError.message || 'Lỗi tạo đơn hàng')

      clearCart()

      const paidOrders = (data || []).filter((o) => Number(o.total_price) > 0)
      if (paidOrders.length === 0) {
        toast.success('Đăng ký thành công! Bạn có thể bắt đầu học.')
        navigate('/learning')
        return
      }

      const orderIds = paidOrders.map((o) => o.id)
      const { data: session, error: payErr } = await paymentService.createSession(orderIds)
      if (payErr) throw new Error(payErr.message || 'Không tạo được phiên thanh toán SePay')

      setPendingFromSession(session)
      navigate(`/checkout/detail?payment=${encodeURIComponent(session.paymentCode)}`, {
        state: { payment: session, orders: paidOrders },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Steps */}
        <nav className="mb-6 flex items-center gap-2 text-[13px] font-semibold text-[#666]">
          <span className="text-primary">1. Giỏ hàng</span>
          <span className="text-[#DBDBDB]">/</span>
          <span>2. Thanh toán</span>
          <span className="text-[#DBDBDB]">/</span>
          <span>3. Hoàn tất</span>
        </nav>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-[#242424] sm:text-[30px]">
              Giỏ hàng
            </h1>
            <p className="mt-1 text-[14px] text-[#666]">
              {cart.length > 0
                ? `${cart.length} khóa học đang chờ thanh toán`
                : 'Chưa có khóa học nào trong giỏ'}
            </p>
          </div>
          {cart.length > 0 && (
            <Link
              to="/courses"
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              + Thêm khóa học
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
            {error}
          </div>
        )}

        {hasPendingPayment && pending?.paymentCode && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-amber-900">
              Bạn còn đơn chưa thanh toán. Hoàn tất trước khi mua thêm khóa học.
            </p>
            <Link
              to={`/checkout/detail?payment=${encodeURIComponent(pending.paymentCode)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white"
            >
              Tiếp tục thanh toán
            </Link>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mb-5 space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            {warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        )}

        {cart.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-8">
              {cart.map((course) => (
                <article
                  key={course.id}
                  className="flex gap-4 rounded-2xl border border-[#E8E8E8] bg-white p-4 shadow-sm transition hover:border-[#DBDBDB] sm:p-5"
                >
                  <Link
                    to={`/courses/${course.id}`}
                    className="h-[88px] w-[120px] shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5] sm:h-[100px] sm:w-[140px]"
                  >
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary to-[#7c2d12] p-2 text-center text-[11px] font-bold text-white">
                        {course.title}
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div>
                      <Link
                        to={`/courses/${course.id}`}
                        className="line-clamp-2 text-[15px] font-bold text-[#242424] transition hover:text-primary sm:text-[16px]"
                      >
                        {course.title}
                      </Link>
                      <p className="mt-1 text-[13px] text-[#666]">
                        GV: {course.profiles?.name || 'Giảng viên'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[17px] font-extrabold text-primary">
                        {course.is_free ? 'Miễn phí' : formatPrice(course.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(course.id)}
                        className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[#666] transition hover:bg-red-50 hover:text-red-600"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="lg:col-span-4">
              <div className="sticky top-[82px] rounded-2xl border border-[#E8E8E8] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-[16px] font-extrabold text-[#242424]">Tóm tắt đơn hàng</h2>

                <div className="mt-4 space-y-2.5 border-b border-[#E8E8E8] pb-4 text-[14px]">
                  <div className="flex justify-between text-[#666]">
                    <span>Tạm tính ({cart.length} khóa)</span>
                    <span className="font-semibold text-[#242424]">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-[#666]">
                    <span>Giảm giá</span>
                    <span className="font-semibold text-[#242424]">0đ</span>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-2">
                  <span className="text-[14px] font-semibold text-[#666]">Tổng cộng</span>
                  <span className="text-[26px] font-extrabold leading-none text-[#242424]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading}
                  className="mt-5 w-full rounded-full bg-primary py-3.5 text-[14px] font-bold text-white transition hover:bg-brand-orangeHover disabled:opacity-50"
                >
                  {loading
                    ? 'Đang xử lý...'
                    : hasPendingPayment
                      ? 'Tiếp tục thanh toán đơn đang chờ'
                      : 'Thanh toán ngay'}
                </button>

                <Link
                  to="/courses"
                  className="mt-3 block w-full rounded-full border border-[#DBDBDB] py-3 text-center text-[13px] font-bold text-[#242424] transition hover:border-[#242424]"
                >
                  Tiếp tục mua sắm
                </Link>

                <p className="mt-4 text-center text-[11px] leading-relaxed text-[#999]">
                  Thanh toán tự động qua SePay (VietQR). Khóa học mở ngay sau khi hệ thống nhận
                  chuyển khoản đúng nội dung.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#DBDBDB] bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F5F5] text-[#999]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 22a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </div>
            <h2 className="text-[18px] font-extrabold text-[#242424]">Giỏ hàng trống</h2>
            <p className="mx-auto mt-2 max-w-sm text-[14px] text-[#666]">
              Hãy chọn khóa học phù hợp và thêm vào giỏ để bắt đầu hành trình học tập.
            </p>
            <Link
              to="/courses"
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-[14px] font-bold text-white transition hover:bg-brand-orangeHover"
            >
              Khám phá khóa học
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cart
