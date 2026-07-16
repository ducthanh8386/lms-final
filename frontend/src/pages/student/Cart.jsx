import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { studentService } from '../../services/studentService'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'

const Cart = () => {
  const { cart, setCart, removeFromCart, clearCart, totalPrice } = useCart()
  const { user } = useAuth()
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
      const courseIds = cart.map(item => item.id)
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
          newWarnings.push(`Khóa học "${item.title}" không còn khả dụng và đã được xóa khỏi giỏ hàng.`)
          cartUpdated = true
        } else {
          const dbPrice = dbItem.is_free ? 0 : Number(dbItem.price || 0)
          const cartPrice = item.is_free ? 0 : Number(item.price || 0)

          if (dbPrice !== cartPrice) {
            newWarnings.push(`Giá khóa học "${item.title}" đã thay đổi từ ${cartPrice.toLocaleString()}đ thành ${dbPrice.toLocaleString()}đ.`)
            updatedCart.push({
              ...item,
              price: dbItem.price,
              is_free: dbItem.is_free
            })
            cartUpdated = true
          } else {
            updatedCart.push(item)
          }
        }
      }

      if (cartUpdated) {
        setCart(updatedCart)
      }
      if (newWarnings.length > 0) {
        setWarnings(newWarnings)
      }
      setVerifying(false)
    }

    verifyPrices()
  }, [cart.length])

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
        // Chuyển sang trang thanh toán chi tiết, truyền IDs vào query params để F5 không mất
        const orderIds = data.map(o => o.id).join(',')
        navigate(`/checkout/detail?ids=${orderIds}`, { state: { orders: data } })
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

      {warnings.length > 0 && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800 space-y-1">
          {warnings.map((w, idx) => (
            <p key={idx}>⚠️ {w}</p>
          ))}
        </div>
      )}

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
