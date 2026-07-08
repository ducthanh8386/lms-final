import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { studentService } from '../../services/studentService'

import { useToast } from '../../context/ToastContext'

const Cart = () => {
  const { cart, removeFromCart, clearCart, totalPrice } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (cart.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await studentService.checkout(cart, user)

      if (error) throw new Error(error.message || "Lỗi tạo đơn hàng")
      
      clearCart()

      if (totalPrice === 0) {
        toast.success("Đăng ký thành công! Bạn có thể bắt đầu học.")
        navigate('/learning')
      } else {
        // Chuyển sang trang thanh toán chi tiết
        navigate('/checkout/detail', { state: { orders: data } })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 text-left">
      <h1 className="mb-8 text-3xl font-bold text-slate-900">Giỏ Hàng</h1>

      {error && <div className="mb-6 rounded bg-red-50 p-4 text-red-600">{error}</div>}

      {cart.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {cart.map(course => (
              <div key={course.id} className="flex gap-4 rounded-xl border bg-white p-4 shadow-sm">
                <div className="h-24 w-32 shrink-0 rounded bg-slate-200 overflow-hidden">
                  {course.thumbnail && <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-slate-500">{course.profiles?.name || 'Giảng viên'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent">
                      {course.is_free ? 'Miễn phí' : `${course.price?.toLocaleString()}đ`}
                    </span>
                    <button 
                      onClick={() => removeFromCart(course.id)}
                      className="text-sm font-medium text-red-500 hover:text-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Tổng cộng</h2>
            <div className="mb-6 text-3xl font-bold text-slate-900">
              {totalPrice.toLocaleString()}đ
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full rounded-lg bg-accent py-3 font-bold text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Thanh toán & Đăng ký'}
            </button>
            <p className="mt-4 text-center text-xs text-slate-500">
              * Sau khi đặt hàng, bạn sẽ nhận thông tin chuyển khoản. Đơn hàng sẽ được kích hoạt sau khi giáo viên xác nhận thanh toán.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="mb-4 text-slate-500">Giỏ hàng của bạn đang trống.</p>
          <Link to="/courses" className="rounded bg-slate-900 px-6 py-2 font-medium text-white hover:bg-slate-800">
            Khám phá khóa học
          </Link>
        </div>
      )}
    </div>
  )
}

export default Cart
