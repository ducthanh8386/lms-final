import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { courseService } from '../../services/courseService'
import { studentService } from '../../services/studentService'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabaseClient'
import DOMPurify from 'dompurify'

import { useToast } from '../../context/ToastContext'

const CourseDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { addToCart, cart } = useCart()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)

  // Review Form
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const inCart = cart.find(c => c.id === id)

  useEffect(() => {
    const fetchCourseData = async () => {
      const { data: cData } = await courseService.getCourseDetail(id)
      if (cData) setCourse(cData)

      const { data: lData } = await courseService.getCourseLessons(id)
      if (lData) setLessons(lData)

      const { data: rData } = await courseService.getCourseReviews(id)
      if (rData) setReviews(rData)

      if (user) {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .maybeSingle()
        if (enrollData) {
          setIsEnrolled(true)
        }
      }

      setLoading(false)
    }
    fetchCourseData()
  }, [id, user])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!user) return
    setIsSubmittingReview(true)
    const { error } = await studentService.addReview(id, user.id, reviewRating, reviewComment)
    if (error) {
      toast.error("Lỗi đăng đánh giá: " + error.message)
    } else {
      setReviewComment('')
      const { data: rData } = await courseService.getCourseReviews(id)
      if (rData) setReviews(rData)
      toast.success("Đăng đánh giá thành công!")
    }
    setIsSubmittingReview(false)
  }

  if (loading) return <div className="p-8">Đang tải chi tiết khóa học...</div>
  if (!course) return <div className="p-8">Không tìm thấy khóa học!</div>

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left">
      <div className="mb-6">
        <Link to="/courses" className="text-sm font-medium text-accent hover:underline">← Quay lại danh sách</Link>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Cột trái: Chi tiết khóa học */}
        <div className="md:col-span-2">
          <h1 className="mb-4 text-3xl font-bold text-slate-900">{course.title}</h1>
          <div 
            className="mb-6 text-lg text-slate-600"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description || '') }}
          />
          
          <div className="mb-8 flex items-center gap-4 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              {course.categories?.name}
            </span>
            <span>Giảng viên: <strong className="text-slate-900">{course.profiles?.name}</strong></span>
            {reviews.length > 0 && (
              <span className="flex items-center text-yellow-500">
                ★ {avgRating} ({reviews.length} đánh giá)
              </span>
            )}
          </div>

          <h2 className="mb-4 text-xl font-bold text-slate-900">Nội dung khóa học ({lessons.length} bài)</h2>
          <div className="mb-12 divide-y rounded-xl border bg-white">
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                  <span className="text-xs text-slate-500">{lesson.content_type === 'video' ? '📺 Video' : '📄 Văn bản'}</span>
                </div>
              </div>
            ))}
            {lessons.length === 0 && <div className="p-4 text-slate-500">Chưa có bài học nào.</div>}
          </div>

          {/* Reviews Section */}
          <h2 className="mb-4 text-xl font-bold text-slate-900">Đánh giá từ học viên</h2>
          
          {user && isEnrolled && (
            <form onSubmit={handleSubmitReview} className="mb-8 rounded-xl border bg-slate-50 p-6">
              <h3 className="mb-4 font-bold text-slate-900">Viết đánh giá của bạn</h3>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">Đánh giá của bạn</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-colors focus:outline-none hover:scale-110 ${star <= reviewRating ? 'text-yellow-400' : 'text-slate-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">Nhận xét</label>
                <textarea required rows="3" className="w-full rounded border p-2" value={reviewComment} onChange={e => setReviewComment(e.target.value)}></textarea>
              </div>
              <button type="submit" disabled={isSubmittingReview} className="rounded bg-accent px-4 py-2 font-bold text-white">
                {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </form>
          )}

          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="rounded-xl border bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-bold text-slate-900">{review.profiles?.name || 'Học viên'}</span>
                  <span className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                </div>
                <div 
                  className="text-slate-600"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(review.comment || '') }}
                />
              </div>
            ))}
            {reviews.length === 0 && <p className="text-slate-500">Chưa có đánh giá nào.</p>}
          </div>

        </div>

        {/* Cột phải: Card mua khóa học */}
        <div>
          <div className="sticky top-8 rounded-xl border bg-white p-6 shadow-lg">
            <div className="mb-4 aspect-video w-full rounded-lg bg-slate-200 overflow-hidden">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">Không có ảnh</div>
              )}
            </div>
            
            <div className="mb-6 text-3xl font-bold text-slate-900">
              {course.is_free ? 'Miễn phí' : `${course.price?.toLocaleString()} đ`}
            </div>

            {user ? (
              isEnrolled ? (
                <Link to={`/learning/${course.id}`} className="block w-full text-center rounded-lg bg-green-500 py-3 font-bold text-white hover:bg-green-600">
                  Vào học ngay
                </Link>
              ) : inCart ? (
                <Link to="/cart" className="block w-full text-center rounded-lg bg-green-500 py-3 font-bold text-white hover:bg-green-600">
                  Xem giỏ hàng
                </Link>
              ) : (
                <button 
                  onClick={() => addToCart(course)}
                  className="w-full rounded-lg bg-accent py-3 font-bold text-white hover:bg-purple-600"
                >
                  Thêm vào giỏ hàng
                </button>
              )
            ) : (
              <Link to="/login" className="block w-full text-center rounded-lg bg-slate-800 py-3 font-bold text-white hover:bg-slate-700">
                Đăng nhập để mua
              </Link>
            )}
            
            <ul className="mt-6 space-y-2 text-sm text-slate-600">
              <li>✓ Học mọi lúc mọi nơi</li>
              <li>✓ Truy cập trọn đời</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail
