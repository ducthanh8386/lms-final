import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { studentService } from '../../services/studentService'
import { useToast } from '../../context/ToastContext'

const formatPrice = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

const CheckoutDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const routeOrderIds = useMemo(
    () => searchParams.get('ids')?.split(',').filter(Boolean) || [],
    [searchParams]
  )

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
        const { data: dbOrders, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .in('id', routeOrderIds)

        if (orderErr || !dbOrders || dbOrders.length === 0) {
          toast.error('Không tìm thấy thông tin đơn hàng hoặc bạn không có quyền truy cập.')
          navigate('/courses')
          return
        }
        activeOrders = dbOrders
        setLoadedOrders(dbOrders)
      }

      const teacherIds = [...new Set(activeOrders.map((o) => o.teacher_id))]
      const { data: profiles, error: profErr } = await supabase.rpc('get_teacher_payment_info', {
        p_teacher_ids: teacherIds,
      })

      if (profErr) {
        toast.error('Không tải được thông tin giảng viên: ' + profErr.message)
      } else if (profiles) {
        const profilesMap = {}
        profiles.forEach((p) => {
          profilesMap[p.id] = p
        })
        setTeacherProfiles(profilesMap)
      }
      setLoading(false)
    }

    loadData()
  }, [routeOrderIds, navigate, toast])

  const handleReceiptUpload = async (orderId, e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingReceipt((prev) => ({ ...prev, [orderId]: true }))
    const { error } = await studentService.uploadReceipt(orderId, file)
    if (error) {
      toast.error('Lỗi tải ảnh: ' + error.message)
    } else {
      toast.success('Tải biên lai thành công!')
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      if (updatedOrder) {
        setLoadedOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)))
      }
    }
    setUploadingReceipt((prev) => ({ ...prev, [orderId]: false }))
  }

  const handleConfirmTransfer = async () => {
    setConfirming(true)
    try {
      const orderIds = loadedOrders.map((o) => o.id)
      const { error } = await supabase
        .from('orders')
        .update({ status: 'awaiting_confirmation' })
        .in('id', orderIds)

      if (error) throw error

      toast.success('Xác nhận đã chuyển tiền thành công!')
      setIsConfirmed(true)
    } catch (err) {
      toast.error('Lỗi xác nhận: ' + err.message)
    } finally {
      setConfirming(false)
    }
  }

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`Đã sao chép ${label}`)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  const grandTotal = loadedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#F5F5F5]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    )
  }

  if (isConfirmed) {
    return (
      <div className="min-h-[calc(100vh-66px)] bg-[#F5F5F5]">
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:px-6">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <nav className="mb-4 flex items-center gap-2 text-[12px] font-semibold text-[#999]">
            <span>1. Giỏ hàng</span>
            <span>/</span>
            <span>2. Thanh toán</span>
            <span>/</span>
            <span className="text-primary">3. Hoàn tất</span>
          </nav>

          <h2 className="text-[24px] font-extrabold text-[#242424]">Đăng ký hoàn tất</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#666]">
            Cảm ơn bạn! Đơn hàng đang chờ giảng viên xác nhận thanh toán (thường trong 24h). Bạn sẽ
            nhận thông báo khi khóa học được kích hoạt.
          </p>

          <div className="mt-8 flex w-full flex-col gap-2.5">
            <Link
              to="/learning"
              className="rounded-full bg-primary px-6 py-3.5 text-center text-[14px] font-bold text-white transition hover:bg-brand-orangeHover"
            >
              Vào trang học tập
            </Link>
            <Link
              to="/courses"
              className="rounded-full border border-[#DBDBDB] bg-white px-6 py-3.5 text-center text-[14px] font-bold text-[#242424] transition hover:border-[#242424]"
            >
              Khám phá khóa học khác
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav className="mb-6 flex items-center gap-2 text-[13px] font-semibold text-[#666]">
          <Link to="/cart" className="hover:text-primary">
            1. Giỏ hàng
          </Link>
          <span className="text-[#DBDBDB]">/</span>
          <span className="text-primary">2. Thanh toán</span>
          <span className="text-[#DBDBDB]">/</span>
          <span>3. Hoàn tất</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#242424] sm:text-[30px]">
            Thanh toán đơn hàng
          </h1>
          <p className="mt-1 text-[14px] text-[#666]">
            Quét mã QR hoặc chuyển khoản theo thông tin bên dưới để hoàn tất.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            {loadedOrders.map((order, index) => {
              const teacher = teacherProfiles[order.teacher_id]
              if (!teacher) return null

              const transferCode = order.id.split('-')[0]
              const hasReceipt = Boolean(order.receipt_url)

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F0F0] bg-[#FAFAFA] px-5 py-3.5">
                    <div>
                      <h3 className="text-[15px] font-extrabold text-[#242424]">
                        Đơn hàng #{index + 1}
                      </h3>
                      <p className="mt-0.5 font-mono text-[11px] text-[#999]">
                        {order.id.slice(0, 8)}…
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                      Chờ chuyển khoản
                    </span>
                  </div>

                  <div className="flex flex-col gap-6 p-5 md:flex-row md:p-6">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#999]">
                          Chuyển khoản cho
                        </p>
                        <p className="mt-1 text-[16px] font-extrabold text-[#242424]">
                          {teacher.name}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#E8E8E8] bg-[#F9F9F9] p-4">
                        <p className="mb-2 text-[12px] font-semibold text-[#666]">
                          Thông tin tài khoản
                        </p>
                        <pre className="whitespace-pre-wrap font-sans text-[14px] font-medium leading-relaxed text-[#242424]">
                          {teacher.bank_info || 'Chưa có thông tin số tài khoản.'}
                        </pre>
                        {teacher.bank_info && (
                          <button
                            type="button"
                            onClick={() => copyText(teacher.bank_info, 'thông tin tài khoản')}
                            className="mt-3 text-[12px] font-bold text-primary hover:underline"
                          >
                            Sao chép thông tin TK
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-500">
                            Nội dung chuyển khoản
                          </p>
                          <p className="mt-0.5 font-mono text-[16px] font-extrabold text-red-600">
                            {transferCode}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(transferCode, 'nội dung CK')}
                          className="shrink-0 rounded-lg bg-white px-3 py-2 text-[12px] font-bold text-red-600 shadow-sm ring-1 ring-red-100 transition hover:bg-red-50"
                        >
                          Sao chép
                        </button>
                      </div>

                      <div className="flex items-end justify-between border-t border-[#F0F0F0] pt-4">
                        <span className="text-[13px] font-semibold text-[#666]">Số tiền</span>
                        <span className="text-[24px] font-extrabold text-primary">
                          {formatPrice(order.total_price)}
                        </span>
                      </div>

                      <div>
                        <label
                          htmlFor={`receipt-${order.id}`}
                          className="mb-2 block text-[13px] font-bold text-[#242424]"
                        >
                          Biên lai chuyển khoản{' '}
                          <span className="font-medium text-[#999]">(tuỳ chọn)</span>
                        </label>
                        <label
                          htmlFor={`receipt-${order.id}`}
                          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 transition ${
                            hasReceipt
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-[#DBDBDB] bg-[#FAFAFA] hover:border-primary/40 hover:bg-primary/[0.03]'
                          }`}
                        >
                          {uploadingReceipt[order.id] ? (
                            <span className="text-[13px] font-semibold text-primary">
                              Đang tải lên...
                            </span>
                          ) : hasReceipt ? (
                            <span className="text-[13px] font-semibold text-emerald-700">
                              Đã tải biên lai — bấm để đổi ảnh
                            </span>
                          ) : (
                            <>
                              <span className="text-[13px] font-semibold text-[#242424]">
                                Chọn ảnh biên lai
                              </span>
                              <span className="mt-1 text-[12px] text-[#999]">PNG, JPG · tối đa vài MB</span>
                            </>
                          )}
                          <input
                            id={`receipt-${order.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReceiptUpload(order.id, e)}
                            disabled={uploadingReceipt[order.id]}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center justify-start border-t border-[#F0F0F0] pt-5 md:w-52 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                      <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#666]">
                        Mã QR
                      </p>
                      <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white p-2 shadow-sm">
                        {teacher.payment_qr_url ? (
                          <img
                            src={teacher.payment_qr_url}
                            alt="QR Code"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="px-3 text-center text-[12px] text-[#999]">
                            Giảng viên chưa cập nhật QR
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-center text-[11px] leading-relaxed text-[#999]">
                        Mở app ngân hàng và quét mã để chuyển nhanh
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <aside className="lg:col-span-4">
            <div className="sticky top-[82px] space-y-4">
              <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-[16px] font-extrabold text-[#242424]">Tóm tắt</h2>
                <div className="mt-4 space-y-2.5 text-[14px]">
                  <div className="flex justify-between text-[#666]">
                    <span>{loadedOrders.length} đơn hàng</span>
                    <span className="font-semibold text-[#242424]">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-[#E8E8E8] pt-4">
                  <span className="text-[14px] font-semibold text-[#666]">Tổng thanh toán</span>
                  <span className="text-[24px] font-extrabold text-[#242424]">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  disabled={confirming}
                  className="mt-5 w-full rounded-full bg-primary py-3.5 text-[14px] font-bold text-white transition hover:bg-brand-orangeHover disabled:opacity-50"
                >
                  {confirming ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản xong'}
                </button>

                <p className="mt-3 text-center text-[11px] leading-relaxed text-[#999]">
                  Chỉ bấm khi bạn đã chuyển đủ tiền. Giảng viên sẽ duyệt và mở khóa học cho bạn.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 text-[13px] leading-relaxed text-[#666]">
                <p className="mb-2 font-bold text-[#242424]">Lưu ý</p>
                <ul className="list-disc space-y-1.5 pl-4">
                  <li>Nhập đúng nội dung chuyển khoản để đối soát nhanh.</li>
                  <li>Nếu có nhiều đơn, chuyển riêng từng khoản theo từng mã.</li>
                  <li>Khóa học kích hoạt sau khi giảng viên xác nhận.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default CheckoutDetail
