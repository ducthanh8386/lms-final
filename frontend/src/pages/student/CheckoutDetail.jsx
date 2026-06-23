import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { studentService } from '../../services/studentService'

import { useToast } from '../../context/ToastContext'

const CheckoutDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const orders = useMemo(() => location.state?.orders || [], [location.state?.orders])

  const [teacherProfiles, setTeacherProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploadingReceipt, setUploadingReceipt] = useState({})

  useEffect(() => {
    if (orders.length === 0) {
      navigate('/courses')
      return
    }

    const fetchTeacherProfiles = async () => {
      const teacherIds = [...new Set(orders.map(o => o.teacher_id))]
      const { data } = await supabase
        .from('profiles')
        .select('id, name, payment_qr_url, bank_info')
        .in('id', teacherIds)
      
      if (data) {
        const profilesMap = {}
        data.forEach(p => { profilesMap[p.id] = p })
        setTeacherProfiles(profilesMap)
      }
      setLoading(false)
    }

    fetchTeacherProfiles()
  }, [orders, navigate])

  const handleReceiptUpload = async (orderId, e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingReceipt(prev => ({ ...prev, [orderId]: true }))
    const { error } = await studentService.uploadReceipt(orderId, file)
    if (error) {
      toast.error("Lỗi tải ảnh: " + error.message)
    } else {
      toast.success("Tải biên lai thành công!")
    }
    setUploadingReceipt(prev => ({ ...prev, [orderId]: false }))
  }

  if (loading) return <div className="p-8">Đang tải thông tin thanh toán...</div>

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 text-left">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Thanh toán Đơn hàng</h1>
      <p className="mb-8 text-slate-600">Vui lòng quét mã QR hoặc chuyển khoản vào các tài khoản dưới đây để hoàn tất.</p>

      <div className="space-y-8">
        {orders.map((order, index) => {
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tải lên Biên lai (Tùy chọn)</label>
                  <input 
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
        <Link 
          to="/learning"
          className="rounded-lg bg-accent px-8 py-3 font-bold text-white hover:bg-purple-600"
        >
          Tôi đã chuyển khoản xong
        </Link>
      </div>
    </div>
  )
}

export default CheckoutDetail
