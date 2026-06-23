import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { courseService } from '../../services/courseService'
import { useAuth } from '../../context/AuthContext'
import { courseSchema } from '../../schemas'

import { useToast } from '../../context/ToastContext'

const CourseForm = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    is_free: false,
    category_id: '',
    thumbnail: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Lấy danh mục
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*')
      if (data) setCategories(data)
    }
    fetchCategories()

    // Lấy data course nếu là edit
    if (isEdit) {
      const fetchCourse = async () => {
        const { data } = await supabase.from('courses').select('*').eq('id', id).single()
        if (data) {
          setFormData({
            title: data.title,
            description: data.description || '',
            price: data.price || 0,
            is_free: data.is_free || false,
            category_id: data.category_id || '',
            thumbnail: data.thumbnail || ''
          })
        }
      }
      fetchCourse()
    }
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingImage(true)
    const { data, error } = await courseService.uploadThumbnail(file)
    if (error) {
      toast.error("Lỗi tải ảnh: " + error.message)
    } else {
      setFormData({ ...formData, thumbnail: data })
    }
    setUploadingImage(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Zod Validation
    const validationResult = courseSchema.safeParse({
      title: formData.title,
      description: formData.description || undefined,
      price: formData.is_free ? 0 : Number(formData.price || 0),
      is_free: formData.is_free,
      category_id: formData.category_id
    })

    if (!validationResult.success) {
      setError(validationResult.error.errors[0].message)
      setLoading(false)
      return
    }

    const payload = {
      ...formData,
      price: formData.is_free ? 0 : parseFloat(formData.price),
      teacher_id: user.id
    }

    let response;
    if (isEdit) {
      response = await courseService.updateCourse(id, payload)
    } else {
      response = await courseService.createCourse(payload)
    }

    if (response.error) {
      setError(response.error.message)
      setLoading(false)
    } else {
      navigate('/teacher/courses')
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 text-left">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEdit ? 'Sửa Khóa Học' : 'Tạo Khóa Học Mới'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
        {error && <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>}
        
        <div>
          <label className="block text-sm font-medium text-slate-700">Tên khóa học *</label>
          <input
            type="text"
            name="title"
            required
            className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Mô tả ngắn</label>
          <textarea
            name="description"
            rows="3"
            className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        {/* Ảnh thu nhỏ */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Ảnh thu nhỏ (Thumbnail)</label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-32 shrink-0 rounded bg-slate-200 overflow-hidden border border-dashed border-slate-400">
              {formData.thumbnail ? (
                <img src={formData.thumbnail} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">Chưa có ảnh</div>
              )}
            </div>
            <div className="flex-1">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-purple-600 disabled:opacity-50"
              />
              {uploadingImage && <div className="mt-2 text-sm text-accent">Đang tải ảnh lên...</div>}
              <div className="mt-2 text-xs text-slate-500">Hoặc dán URL:</div>
              <input
                type="url"
                placeholder="https://..."
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.thumbnail}
                onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Danh mục</label>
          <select
            name="category_id"
            className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={formData.category_id}
            onChange={handleChange}
          >
            <option value="">-- Chọn danh mục --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_free"
            id="is_free"
            checked={formData.is_free}
            onChange={handleChange}
            className="rounded text-accent focus:ring-accent"
          />
          <label htmlFor="is_free" className="text-sm text-slate-700">Khóa học miễn phí</label>
        </div>

        {!formData.is_free && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Giá (VNĐ)</label>
            <input
              type="number"
              name="price"
              min="0"
              className="mt-1 block w-full rounded-md border p-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              value={formData.price}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/teacher/courses')}
            className="rounded-md px-4 py-2 text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu khóa học'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CourseForm
