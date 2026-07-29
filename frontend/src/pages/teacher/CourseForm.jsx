import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { courseService } from '../../services/courseService'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import { courseSchema } from '../../schemas'
import { useToast } from '../../context/ToastContext'
import CourseModeBadge from '../../components/course/CourseModeBadge'
import { zodFirstMessage } from '../../utils/zodError'

/**
 * Form tạo/sửa khóa học.
 * - Admin: tạo khóa (video/Zoom), chọn GV, duyệt ngay
 * - Teacher: chỉ sửa khóa được phân công (không tạo mới)
 */
const CourseForm = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin' || location.pathname.startsWith('/admin')

  const modeParam = searchParams.get('mode')
  const lockedMode =
    modeParam === 'consultation' || modeParam === 'purchase' ? modeParam : null

  const [categories, setCategories] = useState([])
  const [teachers, setTeachers] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    is_free: false,
    enrollment_mode: lockedMode || 'purchase',
    duration_months: '',
    category_id: '',
    thumbnail: '',
    teacher_id: '',
    status: 'approved',
  })
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAdmin && !isEdit) {
      navigate('/teacher/courses', { replace: true })
    }
  }, [isAdmin, isEdit, navigate])

  // Tạo mới: khóa loại theo ?mode= (không cho đổi Video ↔ Zoom trên form)
  useEffect(() => {
    if (isEdit || !lockedMode) return
    setFormData((prev) =>
      prev.enrollment_mode === lockedMode ? prev : { ...prev, enrollment_mode: lockedMode }
    )
  }, [isEdit, lockedMode])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*')
      if (data) setCategories(data)
    }
    fetchCategories()

    if (isAdmin) {
      adminService.getTeachers().then(({ data }) => setTeachers(data || []))
    }

    if (isEdit) {
      const fetchCourse = async () => {
        const { data } = await supabase.from('courses').select('*').eq('id', id).single()
        if (data) {
          if (!isAdmin && data.teacher_id !== user?.id) {
            toast.error('Bạn không được sửa khóa này')
            navigate('/teacher/courses')
            return
          }
          setFormData({
            title: data.title || '',
            description: data.description || '',
            price: data.price != null ? String(data.price) : '0',
            is_free: Boolean(data.is_free),
            enrollment_mode: data.enrollment_mode || 'purchase',
            duration_months: data.duration_months != null ? String(data.duration_months) : '',
            category_id: data.category_id != null ? String(data.category_id) : '',
            thumbnail: data.thumbnail || '',
            teacher_id: data.teacher_id || '',
            status: data.status || 'approved',
          })
        }
      }
      fetchCourse()
    }
  }, [id, isEdit, isAdmin, user?.id, navigate, toast])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ảnh quá lớn (tối đa 8MB). Chọn ảnh nhỏ hơn.')
      e.target.value = ''
      return
    }
    setUploadingImage(true)
    try {
      const { data, error: upErr } = await courseService.uploadThumbnail(file)
      if (upErr) {
        toast.error('Lỗi tải ảnh: ' + upErr.message)
        return
      }
      setFormData((prev) => ({ ...prev, thumbnail: data }))

      // Khi đang sửa khóa: ghi luôn URL ảnh vào DB để avatar đổi ngay
      if (isEdit && id) {
        const { error: saveErr } = await courseService.updateCourse(id, { thumbnail: data })
        if (saveErr) {
          toast.error('Ảnh đã tải nhưng chưa lưu được: ' + saveErr.message)
          return
        }
        toast.success('Đã đổi ảnh khóa học')
      } else {
        toast.success('Đã tải ảnh — bấm Lưu khóa học để hoàn tất.')
      }
    } catch (err) {
      toast.error(err?.message || 'Tải ảnh thất bại / hết thời gian chờ')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const backPath = isAdmin
    ? formData.enrollment_mode === 'consultation'
      ? '/admin/zoom-courses'
      : '/admin/courses'
    : '/teacher/courses'

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (loading || uploadingImage) {
      if (uploadingImage) toast.error('Đang tải ảnh — đợi xong rồi lưu.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isAdmin && !isEdit && !formData.teacher_id) {
        setError('Vui lòng phân công giáo viên phụ trách')
        return
      }

      const validationResult = courseSchema.safeParse({
        title: String(formData.title ?? ''),
        description: formData.description ? String(formData.description) : undefined,
        price: formData.is_free ? 0 : formData.price,
        is_free: Boolean(formData.is_free),
        category_id: formData.category_id == null ? '' : String(formData.category_id),
      })

      if (!validationResult.success) {
        setError(zodFirstMessage(validationResult.error))
        return
      }

      const teacherId = isAdmin ? formData.teacher_id || null : user.id

      const payload = {
        title: formData.title,
        description: formData.description,
        price: formData.is_free ? 0 : parseFloat(formData.price) || 0,
        is_free: formData.enrollment_mode === 'consultation' ? false : formData.is_free,
        enrollment_mode: formData.enrollment_mode,
        duration_months:
          formData.duration_months === '' || formData.duration_months == null
            ? null
            : Number(formData.duration_months),
        category_id:
          formData.category_id === '' || formData.category_id == null
            ? null
            : Number(formData.category_id),
        thumbnail: formData.thumbnail || null,
        teacher_id: teacherId,
      }

      if (isAdmin) {
        payload.status = formData.status || 'approved'
      }

      let response
      if (isEdit) {
        response = await courseService.updateCourse(id, payload)
      } else {
        if (!isAdmin) {
          setError('Chỉ Admin được tạo khóa học mới')
          return
        }
        response = await courseService.createCourse(payload)
      }

      if (response.error) {
        const aborted =
          response.error.name === 'AbortError' ||
          /abort|timed out|failed to fetch/i.test(response.error.message || '')
        const msg = aborted ? 'Lưu quá lâu / mất kết nối. Thử lại.' : response.error.message
        setError(msg)
        toast.error(msg)
        return
      }

      toast.success(isEdit ? 'Đã cập nhật khóa học' : 'Đã tạo khóa học')
      navigate(backPath)
    } catch (err) {
      const aborted =
        err?.name === 'AbortError' || /abort|timed out|failed to fetch/i.test(err?.message || '')
      const msg = aborted ? 'Lưu quá lâu / mất kết nối. Thử lại.' : err?.message || 'Lưu thất bại'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin && !isEdit) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8 text-left">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit
            ? formData.enrollment_mode === 'consultation'
              ? 'Sửa khóa Zoom'
              : 'Sửa khóa Video'
            : formData.enrollment_mode === 'consultation'
              ? 'Tạo khóa Zoom'
              : 'Tạo khóa Video'}
        </h1>
        <CourseModeBadge mode={formData.enrollment_mode} size="md" />
      </div>
      {isAdmin && (
        <p className="mb-4 text-sm text-slate-500">
          {formData.enrollment_mode === 'consultation'
            ? 'Khóa Zoom tách riêng khỏi Video: form tư vấn → xếp lớp → lịch Zoom.'
            : 'Khóa Video: học viên mua SePay, học bài / tài liệu theo tiến độ.'}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
        noValidate
      >
        {error && <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>}

        <div>
          <label htmlFor="course-title" className="block text-sm font-medium text-slate-700">
            Tên khóa học *
          </label>
          <input
            id="course-title"
            type="text"
            name="title"
            required
            className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="course-description" className="block text-sm font-medium text-slate-700">
            Mô tả ngắn
          </label>
          <textarea
            id="course-description"
            name="description"
            rows="3"
            className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="course-thumbnail-file" className="mb-2 block text-sm font-medium text-slate-700">
            Ảnh khóa học (avatar / thumbnail)
          </label>
          <p className="mb-2 text-xs text-slate-500">
            Chọn ảnh JPG/PNG (tối đa 8MB). Khi sửa khóa, ảnh được lưu ngay sau khi tải lên.
          </p>
          <div className="flex items-center gap-4">
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded border border-dashed border-slate-400 bg-slate-200">
              {formData.thumbnail ? (
                <img src={formData.thumbnail} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Chưa có ảnh
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                id="course-thumbnail-file"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-orangeHover disabled:opacity-50"
              />
              {uploadingImage && <div className="mt-2 text-sm text-accent">Đang tải ảnh lên...</div>}
              <label htmlFor="course-thumbnail-url" className="mt-2 block text-xs text-slate-500">
                Hoặc dán URL:
              </label>
              <input
                id="course-thumbnail-url"
                type="url"
                placeholder="https://..."
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.thumbnail}
                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg border p-4 ${
            formData.enrollment_mode === 'consultation'
              ? 'border-blue-200 bg-blue-50/70'
              : 'border-teal-200 bg-teal-50/70'
          }`}
        >
          <label htmlFor="enrollment_mode" className="block text-sm font-medium text-slate-700">
            Hình thức đăng ký
          </label>
          <select
            id="enrollment_mode"
            name="enrollment_mode"
            className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-slate-100 disabled:text-slate-600"
            value={formData.enrollment_mode}
            onChange={handleChange}
            disabled={Boolean(lockedMode) || isEdit}
          >
            <option value="purchase">Khóa Video — mua online / SePay</option>
            <option value="consultation">Khóa Zoom — tư vấn · xếp lớp</option>
          </select>
          {(lockedMode || isEdit) && (
            <p className="mt-1 text-[11px] text-slate-500">
              Loại khóa đã cố định — tạo Video và Zoom ở hai mục riêng trong Admin.
            </p>
          )}
          <p className="mt-2 text-xs font-semibold">
            {formData.enrollment_mode === 'consultation' ? (
              <span className="text-blue-800">Zoom live: form tư vấn → xếp lớp.</span>
            ) : (
              <span className="text-teal-800">Video: học viên mua SePay, học theo tiến độ.</span>
            )}
          </p>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Thời lượng (tháng)
            <input
              type="number"
              name="duration_months"
              min="0"
              placeholder="VD: 3"
              value={formData.duration_months}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2"
            />
          </label>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Phân công giáo viên *
              </label>
              <select
                name="teacher_id"
                required
                value={formData.teacher_id}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border p-2 text-sm"
              >
                <option value="">— Chọn giáo viên —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Trạng thái</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border p-2 text-sm"
              >
                <option value="approved">Đã duyệt (hiện public)</option>
                <option value="pending">Chờ duyệt</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="course-category" className="block text-sm font-medium text-slate-700">
              Danh mục
            </label>
            <select
              id="course-category"
              name="category_id"
              className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              value={formData.category_id}
              onChange={handleChange}
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {formData.enrollment_mode === 'purchase' && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="is_free"
                  id="is_free"
                  checked={formData.is_free}
                  onChange={handleChange}
                  className="rounded text-accent focus:ring-accent"
                />
                <label htmlFor="is_free" className="text-sm font-medium text-slate-700">
                  Khóa học miễn phí
                </label>
              </div>
            )}
            {(formData.enrollment_mode === 'consultation' || !formData.is_free) && (
              <div className={formData.enrollment_mode === 'consultation' ? 'pt-2' : ''}>
                <label htmlFor="course-price" className="block text-sm font-medium text-slate-700">
                  {formData.enrollment_mode === 'consultation'
                    ? 'Học phí hiển thị (VNĐ)'
                    : 'Giá (VNĐ)'}
                </label>
                <input
                  id="course-price"
                  type="number"
                  name="price"
                  min="0"
                  className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  value={formData.price}
                  onChange={handleChange}
                />
                {formData.enrollment_mode === 'consultation' && (
                  <p className="mt-1 text-xs text-slate-500">
                    Hiện trên trang học viên. Học viên vẫn đăng ký qua form tư vấn (không SePay).
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="rounded-md px-4 py-2 text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploadingImage}
            className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-brand-orangeHover disabled:opacity-50"
          >
            {uploadingImage ? 'Đang tải ảnh...' : loading ? 'Đang lưu...' : 'Lưu khóa học'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CourseForm
