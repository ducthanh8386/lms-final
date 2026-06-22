import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { teacherService } from '../../services/teacherService'

import TeacherTabs from '../../components/teacher/TeacherTabs'

import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

const OrderManage = () => {
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal xem ảnh
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const fetchOrders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await teacherService.getPendingOrders(user.id)
    if (data) setOrders(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleApprove = async (orderId) => {
    if (!(await confirm("Xác nhận duyệt đơn hàng này? Học viên sẽ được vào học ngay."))) return
    const { error } = await teacherService.approveOrder(orderId)
    if (error) {
      toast.error("Lỗi duyệt đơn: " + error.message)
    } else {
      toast.success("Duyệt thành công!")
      fetchOrders()
    }
  }

  const handleReject = async (orderId) => {
    if (!(await confirm("Từ chối đơn hàng này?"))) return
    const { error } = await teacherService.rejectOrder(orderId)
    if (error) {
      toast.error("Lỗi: " + error.message)
    } else {
      fetchOrders()
    }
  }

  if (loading) return <div className="p-8">Đang tải danh sách đơn hàng...</div>

  return (
    <div className="mx-auto max-w-5xl p-8 text-left">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Giảng Viên Dashboard</h1>
          <p className="text-slate-500">Quản lý khóa học, đơn hàng và cài đặt thanh toán.</p>
        </div>
      </header>

      <TeacherTabs />
      
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-medium text-slate-600">Mã Đơn / Ngày</th>
              <th className="p-4 font-medium text-slate-600">Học viên</th>
              <th className="p-4 font-medium text-slate-600">Khóa học</th>
              <th className="p-4 font-medium text-slate-600">Tổng tiền</th>
              <th className="p-4 font-medium text-slate-600">Biên lai</th>
              <th className="p-4 font-medium text-slate-600">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{order.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium">{order.profiles?.name || 'Khách'}</div>
                  <div className="text-xs text-slate-500">{order.profiles?.email}</div>
                </td>
                <td className="p-4">
                  <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                    {order.order_items?.map((item, idx) => (
                      <li key={idx}>{item.courses?.title}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-4 font-bold text-slate-900">
                  {order.total_price?.toLocaleString()} đ
                </td>
                <td className="p-4">
                  {order.receipt_url ? (
                    <button 
                      onClick={() => setSelectedReceipt(order.receipt_url)}
                      className="text-accent hover:underline font-medium"
                    >
                      Xem ảnh
                    </button>
                  ) : (
                    <span className="text-slate-400 italic">Chưa tải lên</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(order.id)}
                      className="rounded bg-green-500 px-3 py-1 font-medium text-white hover:bg-green-600"
                    >
                      Duyệt
                    </button>
                    <button 
                      onClick={() => handleReject(order.id)}
                      className="rounded bg-red-500 px-3 py-1 font-medium text-white hover:bg-red-600"
                    >
                      Từ chối
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  Không có đơn hàng nào chờ duyệt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Xem Biên lai */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-full max-w-3xl overflow-auto rounded-lg bg-white p-2">
            <button 
              onClick={() => setSelectedReceipt(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300"
            >
              ✕
            </button>
            <img src={selectedReceipt} alt="Receipt" className="max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderManage
