import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { leadService, STATUS_OPTIONS, GOAL_OPTIONS } from '../../services/leadService'

const ConsultationLeadForm = ({ courseId, courseTitle, open, onClose }) => {
  const { user } = useAuth()
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: user?.email || '',
    currentStatus: 'sinh_vien_it',
    learningGoal: 'chuyen_nganh',
    preferredSchedule: '',
    notes: '',
  })

  if (!open) return null

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.phone.trim()) {
      toast.error('Vui lòng nhập họ tên và số điện thoại')
      return
    }
    setSubmitting(true)
    const { error } = await leadService.submitLead({
      courseId,
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      currentStatus: form.currentStatus,
      learningGoal: form.learningGoal,
      preferredSchedule: form.preferredSchedule,
      notes: form.notes,
    })
    setSubmitting(false)
    if (error) {
      const msg = error.message || 'Gửi thông tin thất bại'
      toast.error(
        msg.includes('không nhận đăng ký')
          ? 'Khóa học chưa được duyệt hoặc không phải khóa Zoom tư vấn.'
          : msg
      )
      return
    }
    toast.success('Đã gửi thông tin. Trung tâm sẽ liên hệ tư vấn sớm.')
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 max-h-[min(92vh,760px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#15151c] p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/50 hover:text-white"
          aria-label="Đóng"
        >
          ✕
        </button>

        <h2 className="pr-8 text-[24px] font-extrabold text-white">Để lại thông tin</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/65">
          Tư vấn viên sẽ liên hệ để trao đổi chương trình{courseTitle ? ` “${courseTitle}”` : ''},
          lịch học Zoom và lộ trình phù hợp với bạn.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-white/80">
              Tên đầy đủ <span className="text-red-400">*</span>
            </span>
            <input
              required
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1e1e28] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-indigo-400"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-white/80">
              Số điện thoại <span className="text-red-400">*</span>
            </span>
            <input
              required
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="0912345678"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1e1e28] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-indigo-400"
            />
            <span className="mt-1 block text-[12px] text-white/45">
              Nên dùng SĐT có Zalo để trung tâm liên hệ dễ hơn.
            </span>
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-white/80">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="nguyenvana@gmail.com"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1e1e28] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-indigo-400"
            />
          </label>

          <fieldset>
            <legend className="text-[13px] font-semibold text-white/80">
              Bạn đang là? <span className="text-red-400">*</span>
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${
                    form.currentStatus === opt.value
                      ? 'border-indigo-400 bg-indigo-500/15 text-white'
                      : 'border-white/10 bg-[#1e1e28] text-white/75'
                  }`}
                >
                  <input
                    type="radio"
                    name="currentStatus"
                    checked={form.currentStatus === opt.value}
                    onChange={() => setField('currentStatus', opt.value)}
                    className="accent-indigo-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-semibold text-white/80">
              Mục tiêu học của bạn? <span className="text-red-400">*</span>
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {GOAL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${
                    form.learningGoal === opt.value
                      ? 'border-indigo-400 bg-indigo-500/15 text-white'
                      : 'border-white/10 bg-[#1e1e28] text-white/75'
                  }`}
                >
                  <input
                    type="radio"
                    name="learningGoal"
                    checked={form.learningGoal === opt.value}
                    onChange={() => setField('learningGoal', opt.value)}
                    className="accent-indigo-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-[13px] font-semibold text-white/80">Ca học mong muốn</span>
            <input
              value={form.preferredSchedule}
              onChange={(e) => setField('preferredSchedule', e.target.value)}
              placeholder="VD: T2-T4-T6 tối, cuối tuần..."
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1e1e28] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-indigo-400"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-white/80">Ghi chú</span>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              placeholder="Mong muốn thêm, thời gian liên hệ..."
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1e1e28] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-indigo-400"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-[linear-gradient(90deg,#6366f1_0%,#a855f7_100%)] py-3.5 text-[14px] font-extrabold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
          >
            {submitting ? 'Đang gửi...' : 'Gửi thông tin'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ConsultationLeadForm
