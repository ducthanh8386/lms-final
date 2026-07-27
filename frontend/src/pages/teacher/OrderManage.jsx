import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { teacherService } from '../../services/teacherService'

const statusLabel = {
  pending: { text: 'Chờ SePay', className: 'bg-amber-50 text-amber-700' },
  awaiting_confirmation: { text: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-700' },
  completed: { text: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { text: 'Từ chối', className: 'bg-red-50 text-red-600' },
  cancelled: { text: 'Hết hạn / hủy', className: 'bg-slate-100 text-slate-600' },
}

const OrderManage = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await teacherService.getRecentOrders(user.id)
    if (data) setOrders(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  if (loading) return <div className="p-8">Đang tải danh sách đơn hàng...</div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Đơn hàng SePay</h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Khóa video thanh toán tự động qua SePay — theo dõi lịch sử, không duyệt tay.
        </p>
      </header>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Thanh toán nền tảng SePay: khi học viên chuyển khoản đúng mã, hệ thống tự enroll. Bạn chỉ
          theo dõi lịch sử đơn tại đây.
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-white text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Học viên</th>
                <th className="px-4 py-3">Khóa học</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Mã TT</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => {
                const st = statusLabel[order.status] || statusLabel.pending
                const titles =
                  order.order_items?.map((i) => i.courses?.title).filter(Boolean).join(', ') || '—'
                return (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.profiles?.name || 'Khách'}</div>
                      <div className="text-xs text-slate-500">{order.profiles?.email}</div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <span className="line-clamp-2">{titles}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {Number(order.total_price || 0).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{order.payment_code || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.className}`}>
                        {st.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {order.paid_at
                        ? new Date(order.paid_at).toLocaleString('vi-VN')
                        : new Date(order.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {orders.map((order) => {
            const st = statusLabel[order.status] || statusLabel.pending
            const titles =
              order.order_items?.map((i) => i.courses?.title).filter(Boolean).join(', ') || '—'
            return (
              <div key={order.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{order.profiles?.name || 'Khách'}</p>
                    <p className="text-xs text-slate-500">{order.profiles?.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.className}`}>
                    {st.text}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{titles}</p>
                <p className="mt-1 text-lg font-extrabold text-primary">
                  {Number(order.total_price || 0).toLocaleString('vi-VN')}đ
                </p>
                {order.payment_code && (
                  <p className="mt-1 font-mono text-xs text-slate-500">{order.payment_code}</p>
                )}
              </div>
            )
          })}
        </div>

        {orders.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-slate-500">Chưa có đơn hàng nào.</p>
        )}
      </div>
    </div>
  )
}

export default OrderManage
