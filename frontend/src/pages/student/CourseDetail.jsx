import React, { useEffect, useState } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { courseService } from '../../services/courseService'
import { studentService } from '../../services/studentService'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabaseClient'
import DOMPurify from 'dompurify'
import { useToast } from '../../context/ToastContext'

const AUDIENCE = [
  {
    n: '1',
    title: 'Người mới bắt đầu',
    desc: 'Muốn có lộ trình rõ ràng, học từ nền tảng đến thực chiến để tự tin làm dự án.',
  },
  {
    n: '2',
    title: 'Sinh viên / người học IT',
    desc: 'Cần kiến thức thực tế, bổ sung những gì nhà trường chưa dạy đủ để đi làm.',
  },
  {
    n: '3',
    title: 'Người đang đi làm',
    desc: 'Muốn nâng cấp kỹ năng, học thêm để thăng tiến hoặc chuyển hướng công việc.',
  },
]

const CourseDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { openLogin } = useAuthModal()
  const toast = useToast()
  const { addToCart, cart } = useCart()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const inCart = cart.find((c) => c.id === id)

  useEffect(() => {
    if (authLoading) return
    if (!user) openLogin(location.pathname)
  }, [user, authLoading, openLogin, location.pathname])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchCourseData = async () => {
      setLoading(true)
      const { data: cData } = await courseService.getCourseDetail(id)
      if (cData) setCourse(cData)

      const { data: lData } = await courseService.getCourseLessons(id)
      if (lData) setLessons(lData)

      const { data: rData } = await courseService.getCourseReviews(id)
      if (rData) setReviews(rData)

      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .maybeSingle()
      if (enrollData) setIsEnrolled(true)

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
      toast.error('Lỗi đăng đánh giá: ' + error.message)
    } else {
      setReviewComment('')
      const { data: rData } = await courseService.getCourseReviews(id)
      if (rData) setReviews(rData)
      toast.success('Đăng đánh giá thành công!')
    }
    setIsSubmittingReview(false)
  }

  const handleBuy = () => {
    if (!course) return
    if (isEnrolled) {
      navigate(`/learning/${course.id}`)
      return
    }
    if (inCart) {
      navigate('/cart')
      return
    }
    addToCart(course)
    toast.success('Đã thêm khóa học vào giỏ hàng')
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f12] p-8 text-sm text-white/50">
        Vui lòng đăng nhập để xem khóa học
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f12]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f0f12] p-8 text-white/60">
        <p>Không tìm thấy khóa học!</p>
        <Link to="/courses" className="text-sm font-semibold text-primary hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    )
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0'

  const priceLabel = course.is_free
    ? 'Miễn phí'
    : `${Number(course.price || 0).toLocaleString('vi-VN')}đ`

  const primaryCta = isEnrolled
    ? { label: 'Vào học ngay', action: () => navigate(`/learning/${course.id}`), variant: 'learn' }
    : inCart
      ? { label: 'Xem giỏ hàng', action: () => navigate('/cart'), variant: 'cart' }
      : course.is_free
        ? { label: 'Học miễn phí', action: handleBuy, variant: 'buy' }
        : { label: 'Mua ngay', action: handleBuy, variant: 'buy' }

  const secondaryCta = !isEnrolled && !course.is_free
    ? {
        label: inCart ? 'Đã trong giỏ' : 'Thêm vào giỏ',
        action: () => {
          if (!inCart) {
            addToCart(course)
            toast.success('Đã thêm vào giỏ hàng')
          } else navigate('/cart')
        },
      }
    : null

  const plainDesc =
    (course.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Khóa học chất lượng, học để đi làm.'

  return (
    <div className="relative min-h-screen bg-[#0f0f12] text-white">
      {/* Top bar tối giản — thoát về app */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0b0b0e]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[10px] font-extrabold text-white">
              LMS
            </span>
            <span className="hidden text-[11px] font-bold uppercase tracking-wider text-white/70 sm:inline">
              Học lập trình để đi làm
            </span>
          </Link>
          <Link
            to="/courses"
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            ← Thoát
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(240,81,35,0.22),transparent_55%)]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#4f46e5]/20 blur-3xl" />

        <div className="relative mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {course.categories?.name && (
                <span className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/80">
                  {course.categories.name}
                </span>
              )}
              <h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-[36px]">
                {course.title}
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70 line-clamp-3">
                {plainDesc}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/65">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#f5a623]">★</span>
                  <strong className="text-white">{avgRating}</strong>
                  <span>({reviews.length || 0} đánh giá)</span>
                </span>
                <span>·</span>
                <span>{lessons.length} bài học</span>
                <span>·</span>
                <span>GV: {course.profiles?.name || 'Giảng viên'}</span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
                <div className="aspect-[16/10] bg-[#1a1a22]">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f05123] to-[#7c2d12] p-6 text-center text-xl font-extrabold">
                      {course.title}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[12px] text-white/50">Học phí</p>
                    <p className="text-[22px] font-extrabold text-primary">{priceLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={primaryCta.action}
                    className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-orangeHover"
                  >
                    {primaryCta.label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-10 pb-36 sm:px-6 lg:px-8">
        {/* Who is this for */}
        <section className="overflow-hidden rounded-3xl bg-[#181821] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <h2 className="text-[26px] font-extrabold leading-snug sm:text-[32px]">
                Khoá học này
                <br />
                dành cho ai?
              </h2>
              <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#242430] to-[#15151c] p-6">
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#6366f1]/25 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-[#14b8a6]/20 blur-2xl" />
                <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-28 rounded-[2rem] bg-[#14b8a6]/90 shadow-lg shadow-teal-500/20" />
                    <div className="absolute -right-10 -top-6 w-28 overflow-hidden rounded-lg border border-white/10 bg-[#0f172a] p-2 shadow-xl">
                      <div className="mb-1.5 flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="h-1.5 w-16 rounded bg-cyan-400/80" />
                        <div className="h-1.5 w-20 rounded bg-amber-400/70" />
                        <div className="h-1.5 w-12 rounded bg-orange-400/70" />
                        <div className="h-1.5 w-18 rounded bg-violet-400/70" />
                      </div>
                    </div>
                    <div className="absolute left-1/2 top-2 h-10 w-10 -translate-x-1/2 rounded-full bg-[#fcd34d]" />
                    <div className="absolute left-1/2 top-10 h-12 w-16 -translate-x-1/2 rounded-t-2xl bg-[#38bdf8]" />
                  </div>
                  <p className="text-[13px] font-semibold text-white/70">Học mọi lúc, mọi nơi</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-7">
              {AUDIENCE.map((item) => (
                <div key={item.n} className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366f1_0%,#a855f7_100%)] text-[16px] font-extrabold text-white shadow-lg shadow-indigo-500/20">
                    {item.n}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-extrabold text-white">{item.title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-white/65">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="rounded-3xl bg-[#181821] p-6 sm:p-8">
          <h2 className="mb-4 text-[22px] font-extrabold">Mô tả khóa học</h2>
          {course.description ? (
            <div
              className="course-desc max-w-none text-[15px] leading-relaxed text-white/75 [&_a]:text-primary [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:font-bold [&_h3]:text-white [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description) }}
            />
          ) : (
            <p className="text-[15px] text-white/55">
              Khóa học được thiết kế bài bản, giúp bạn nắm vững kiến thức và áp dụng ngay vào thực tế.
            </p>
          )}
        </section>

        {/* Lessons */}
        <section className="rounded-3xl bg-[#181821] p-6 sm:p-8">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="text-[22px] font-extrabold">Nội dung khóa học</h2>
            <span className="text-[13px] text-white/50">{lessons.length} bài học</span>
          </div>
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/8">
            {lessons.length > 0 ? (
              lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[0.03]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-[12px] font-bold text-white/60">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[14px] font-semibold text-white">{lesson.title}</h4>
                    <p className="text-[12px] text-white/40">
                      {lesson.content_type === 'video' ? 'Video bài giảng' : 'Bài đọc'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-[14px] text-white/40">Chưa có bài học.</p>
            )}
          </div>
        </section>

        {/* Reviews */}
        <section className="rounded-3xl bg-[#181821] p-6 sm:p-8">
          <h2 className="mb-5 text-[22px] font-extrabold">Đánh giá từ học viên</h2>

          {user && isEnrolled && (
            <form
              onSubmit={handleSubmitReview}
              className="mb-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5"
            >
              <h3 className="mb-3 text-[14px] font-bold">Viết đánh giá của bạn</h3>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl ${star <= reviewRating ? 'text-[#f5a623]' : 'text-white/20'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                required
                rows={3}
                className="mb-3 w-full rounded-xl border border-white/10 bg-[#121218] px-3 py-2.5 text-[14px] text-white outline-none focus:border-primary"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn..."
              />
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-orangeHover disabled:opacity-50"
              >
                {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-bold text-white">{review.profiles?.name || 'Học viên'}</span>
                  <span className="text-[#f5a623] text-sm">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
                <div
                  className="text-[14px] text-white/65"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(review.comment || ''),
                  }}
                />
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="py-4 text-center text-[14px] text-white/40">Chưa có đánh giá nào.</p>
            )}
          </div>
        </section>
      </div>

      {/* Sticky bottom CTA — F8 style */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b0b0e]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-extrabold text-white sm:flex">
              LMS
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold text-[#7dd3fc] sm:text-[16px]">
                {course.title}
              </p>
              <p className="truncate text-[12px] text-white/55">{plainDesc}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="mr-1 hidden text-[16px] font-extrabold text-primary sm:inline">
              {priceLabel}
            </span>
            {secondaryCta && (
              <button
                type="button"
                onClick={secondaryCta.action}
                className="h-10 rounded-lg bg-[#1e293b] px-4 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#334155] sm:px-5"
              >
                {secondaryCta.label}
              </button>
            )}
            <button
              type="button"
              onClick={primaryCta.action}
              className="h-10 rounded-lg bg-[linear-gradient(90deg,#6366f1_0%,#a855f7_100%)] px-4 text-[12px] font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 sm:px-5"
            >
              {primaryCta.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail
