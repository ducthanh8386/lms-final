import React, { useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'

const statusLabel = {
  pending: 'Chờ TT',
  awaiting_confirmation: 'Chờ xác nhận',
  completed: 'Đã thanh toán',
  rejected: 'Từ chối',
  cancelled: 'Hết hạn / hủy',
}

const AdminPayments = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await adminService.getAllOrders()
      setOrders(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Quản lý thanh toán</h1>
        <p className="mt-1 text-sm text-slate-500">Đơn hàng SePay / khóa video trên toàn hệ thống.</p>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Học viên</th>
                <th className="px-4 py-3">Khóa</th>
                <th className="px-4 py-3">GV</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {new Date(o.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.profiles?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{o.profiles?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {(o.order_items || []).map((i) => i.courses?.title).filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">{o.teacher?.name || '—'}</td>
                  <td className="px-4 py-3 font-semibold">
                    {Number(o.total_price || 0).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3">{statusLabel[o.status] || o.status}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    Chưa có đơn hàng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPayments
