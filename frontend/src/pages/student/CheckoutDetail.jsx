import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { studentService } from '../../services/studentService'
import { useToast } from '../../context/ToastContext'

const CheckoutDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  
  // 1. Durability: Read query param IDs
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const routeOrderIds = useMemo(() => searchParams.get('ids')?.split(',').filter(Boolean) || [], [searchParams])

  const [loadedOrders, setLoadedOrders] = useState(location.state?.orders || [])
  const [teacherProfiles, setTeacherProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploadingReceipt, setUploadingReceipt] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      let activeOrders = loadedOrders

      if (activeOrders.length === 0) {
        if (routeOrderIds.length === 0) {
          navigate('/courses')
          return
        }
        // Fetch from DB
        const { data: dbOrders, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .in('id', routeOrderIds)

        if (orderErr || !dbOrders || dbOrders.length === 0) {
          toast.error("Không tìm thấy thông tin đơn hàng hoặc bạn không có quyền truy cập.")
          navigate('/courses')
          return
        }
        activeOrders = dbOrders
        setLoadedOrders(dbOrders)
      }

      // Fetch teacher profiles using secure RPC
      const teacherIds = [...new Set(activeOrders.map(o => o.teacher_id))]
      const { data: profiles, error: profErr } = await supabase
        .rpc('get_teacher_payment_info', { p_teacher_ids: teacherIds })

      if (profErr) {
        toast.error("Không tải được thông tin giảng viên: " + profErr.message)
      } else if (profiles) {
        const profilesMap = {}
        profiles.forEach(p => { profilesMap[p.id] = p })
        setTeacherProfiles(profilesMap)
      }
      setLoading(false)
    }

    loadData()
  }, [routeOrderIds, navigate, toast])

  const handleReceiptUpload = async (orderId, e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingReceipt(prev => ({ ...prev, [orderId]: true }))
    const { error } = await studentService.uploadReceipt(orderId, file)
    if (error) {
      toast.error("Lỗi tải ảnh: " + error.message)
    } else {
      toast.success("Tải biên lai thành công!")
      // Fetch latest order details to update local UI status if needed
      const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (updatedOrder) {
        setLoadedOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o))
      }
    }
    setUploadingReceipt(prev => ({ ...prev, [orderId]: false }))
  }

  const handleConfirmTransfer = async () => {
    setConfirming(true)
    try {
      const orderIds = loadedOrders.map(o => o.id)
      const { error } = await supabase
        .from('orders')
        .update({ status: 'awaiting_confirmation' })
        .in('id', orderIds)

      if (error) throw error

      toast.success("Xác nhận đã chuyển tiền thành công!")
      setIsConfirmed(true)
    } catch (err) {
      toast.error("Lỗi xác nhận: " + err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <div className="p-8">Đang tải thông tin thanh toán...</div>

  if (isConfirmed) {
    return (
      <div className="mx-auto max-w-md p-6 my-12 text-center bg-white rounded-xl border shadow-sm space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Đăng ký hoàn tất</h2>
          <p className="text-sm text-slate-500">
            Cảm ơn bạn! Đơn hàng của bạn đang chờ giáo viên xác nhận thanh toán (thường trong vòng 24h).
            Hệ thống sẽ gửi thông báo cho bạn ngay khi khóa học được kích hoạt.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Link 
            to="/learning"
            className="rounded-lg bg-accent px-6 py-2.5 font-bold text-white hover:bg-purple-600 transition block text-center"
          >
            Vào trang học tập
          </Link>
          <Link 
            to="/courses"
            className="rounded-lg border border-slate-200 bg-white px-6 py-2.5 font-bold text-slate-700 hover:bg-slate-50 transition block text-center"
          >
            Khám phá khóa học khác
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 text-left">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Thanh toán Đơn hàng</h1>
      <p className="mb-8 text-slate-600">Vui lòng quét mã QR hoặc chuyển khoản vào các tài khoản dưới đây để hoàn tất.</p>

      <div className="space-y-8">
        {loadedOrders.map((order, index) => {
          const teacher = teacherProfiles[order.teacher_id]
          if (!teacher) return null

          return (
            <div key={order.id} className="rounded-xl border bg-white p-6 shadow-sm flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Đơn hàng #{index + 1}</h3>
                <p className="text-sm text-slate-500">Mã đơn: <span className="font-mono">{order.id}</span></p>
                <div className="rounded bg-slate-50 p-4 border border-slate-100">
                  <p className="mb-2 text-sm text-slate-500">Chuyển khoản cho giảng viên:</p>
                  <p className="font-bold text-slate-900">{teacher.name}</p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700 font-sans">
                    {teacher.bank_info || "Chưa có thông tin số tài khoản."}
                  </pre>
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm text-slate-500">Số tiền cần thanh toán:</p>
                    <p className="text-2xl font-bold text-accent">{order.total_price.toLocaleString()} đ</p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-red-500">Nội dung chuyển khoản: {order.id.split('-')[0]}</p>
                </div>

                <div>
                  <label htmlFor={`receipt-${order.id}`} className="mb-2 block text-sm font-medium text-slate-700">Tải lên Biên lai (Tùy chọn)</label>
                  <input 
                    id={`receipt-${order.id}`}
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleReceiptUpload(order.id, e)}
                    disabled={uploadingReceipt[order.id]}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {uploadingReceipt[order.id] && <p className="mt-1 text-sm text-accent">Đang tải...</p>}
                </div>
              </div>

              <div className="w-full md:w-64 shrink-0 flex flex-col items-center justify-center border-t pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-8">
                <p className="mb-2 text-sm font-medium text-slate-700">Mã QR Thanh toán</p>
                <div className="h-48 w-48 rounded-xl border bg-slate-50 p-2 overflow-hidden flex items-center justify-center">
                  {teacher.payment_qr_url ? (
                    <img src={teacher.payment_qr_url} alt="QR Code" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 text-center">Giảng viên chưa cập nhật QR</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleConfirmTransfer}
          disabled={confirming}
          className="rounded-lg bg-accent px-8 py-3 font-bold text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {confirming ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản xong'}
        </button>
      </div>
    </div>
  )
}

export default CheckoutDetail
