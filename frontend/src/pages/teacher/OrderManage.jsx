import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { teacherService } from '../../services/teacherService'
import { supabase } from '../../lib/supabaseClient'

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

  const handleViewReceipt = async (url) => {
    if (!url) return
    try {
      const parts = url.split('/receipts/')
      const fileName = parts[parts.length - 1]
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 3600)
      if (error) throw error
      if (data?.signedUrl) {
        setSelectedReceipt(data.signedUrl)
      }
    } catch (err) {
      toast.error("Không thể xem biên lai: " + err.message)
    }
  }

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
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Giảng Viên Dashboard</h1>
          <p className="text-slate-500">Quản lý khóa học, đơn hàng và cài đặt thanh toán.</p>
        </div>
      </header>

      <TeacherTabs />
      
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{order.id.slice(0, 8).toUpperCase()}</span>
                    {order.status === 'awaiting_confirmation' ? (
                      <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-bold text-yellow-800">Chờ xác nhận</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-800">Chờ thanh toán</span>
                    )}
                  </div>
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
                       onClick={() => handleViewReceipt(order.receipt_url)}
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

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-4">
        {orders.map(order => (
          <div key={order.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Đơn: #{order.id.slice(0, 8).toUpperCase()}</span>
                  {order.status === 'awaiting_confirmation' ? (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800">Chờ xác nhận</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800">Chờ thanh toán</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{new Date(order.created_at).toLocaleString()}</div>
              </div>
              <div className="font-bold text-accent">{order.total_price?.toLocaleString()} đ</div>
            </div>
            
            <div className="border-t border-slate-100 pt-2 text-xs">
              <span className="font-semibold text-slate-600 block">Học viên:</span>
              <span className="text-slate-800 font-medium">{order.profiles?.name || 'Khách'}</span> ({order.profiles?.email || 'N/A'})
            </div>

            <div className="text-xs">
              <span className="font-semibold text-slate-600 block">Khóa học:</span>
              <ul className="list-disc pl-4 text-slate-700 space-y-1 mt-1">
                {order.order_items?.map((item, idx) => (
                  <li key={idx}>{item.courses?.title}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <div>
                {order.receipt_url ? (
                  <button 
                    onClick={() => handleViewReceipt(order.receipt_url)}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Xem ảnh biên lai
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic">Chưa tải biên lai</span>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleApprove(order.id)}
                  className="rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
                >
                  Duyệt
                </button>
                <button 
                  onClick={() => handleReject(order.id)}
                  className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-slate-500 text-sm">
            Không có đơn hàng nào chờ duyệt.
          </div>
        )}
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
