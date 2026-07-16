import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { teacherService } from '../../services/teacherService'
import { supabase } from '../../lib/supabaseClient'

import TeacherTabs from '../../components/teacher/TeacherTabs'

import { useToast } from '../../context/ToastContext'

const TeacherSettings = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [formData, setFormData] = useState({
    bank_info: '',
    payment_qr_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingQR, setUploadingQR] = useState(false)

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setFormData({
            bank_info: data.bank_info || '',
            payment_qr_url: data.payment_qr_url || ''
          })
        }
        setLoading(false)
      }
      fetchProfile()
    }
  }, [user])

  const handleQRUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingQR(true)
    const { data, error } = await teacherService.uploadQRImage(file, user.id)
    if (error) {
      toast.error("Lỗi tải ảnh: " + error.message)
    } else {
      setFormData(prev => ({ ...prev, payment_qr_url: data }))
    }
    setUploadingQR(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await teacherService.updatePaymentSettings(user.id, formData)
    if (error) {
      toast.error("Lỗi lưu thông tin: " + error.message)
    } else {
      toast.success("Lưu thông tin thành công!")
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8">Đang tải...</div>

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Giảng Viên Dashboard</h1>
          <p className="text-slate-500">Quản lý khóa học, đơn hàng và cài đặt thanh toán.</p>
        </div>
      </header>

      <TeacherTabs />
      
      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm max-w-2xl">
        <div>
          <label htmlFor="settings-bank-info" className="block text-sm font-medium text-slate-700">Thông tin Ngân hàng</label>
          <p className="mb-2 text-xs text-slate-500">Ví dụ: Vietcombank - 123456789 - NGUYEN VAN A</p>
          <textarea
            id="settings-bank-info"
            rows="3"
            className="w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={formData.bank_info}
            onChange={(e) => setFormData({...formData, bank_info: e.target.value})}
            placeholder="Tên Ngân hàng - Số Tài khoản - Tên Chủ Tài khoản"
          />
        </div>

        <div>
          <label htmlFor="settings-qr-file" className="mb-2 block text-sm font-medium text-slate-700">Mã QR Thanh toán</label>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="h-32 w-32 shrink-0 rounded bg-slate-200 overflow-hidden border border-dashed border-slate-400">
              {formData.payment_qr_url ? (
                <img src={formData.payment_qr_url} alt="QR Code" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500 text-center p-2">Chưa có QR</div>
              )}
            </div>
            <div className="flex-1 w-full">
              <input 
                id="settings-qr-file"
                type="file" 
                accept="image/*"
                onChange={handleQRUpload}
                disabled={uploadingQR}
                className="w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-purple-600 disabled:opacity-50"
              />
              {uploadingQR && <div className="mt-2 text-sm text-accent">Đang tải ảnh lên...</div>}
              <label htmlFor="settings-qr-url" className="mt-2 text-xs text-slate-500 block">Hoặc dán URL ảnh QR:</label>
              <input
                id="settings-qr-url"
                type="url"
                placeholder="https://..."
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.payment_qr_url}
                onChange={(e) => setFormData({...formData, payment_qr_url: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu Cài đặt'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TeacherSettings
