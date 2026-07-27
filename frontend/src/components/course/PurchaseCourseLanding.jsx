import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import PendingPaymentBanner from '../payment/PendingPaymentBanner'
import { formatCoursePrice } from './CourseModeBadge'

const AUDIENCE = [
  {
    n: '1',
    title: 'Người mới bắt đầu',
    desc: 'Muốn có lộ trình rõ ràng, học từ nền tảng đến thực chiến để tự tin làm dự án.',
    tint: 'from-amber-400 to-orange-500',
  },
  {
    n: '2',
    title: 'Sinh viên / người học IT',
    desc: 'Cần kiến thức thực tế, bổ sung những gì nhà trường chưa dạy đủ để đi làm.',
    tint: 'from-sky-400 to-blue-500',
  },
  {
    n: '3',
    title: 'Người đang đi làm',
    desc: 'Muốn nâng cấp kỹ năng, học thêm để thăng tiến hoặc chuyển hướng công việc.',
    tint: 'from-violet-400 to-fuchsia-500',
  },
]

/**
 * Landing khóa Video (purchase) — full-bleed kiểu F8, tối + glow + CTA mua.
 */
export default function PurchaseCourseLanding({
  course,
  lessons = [],
  reviews = [],
  avgRating = '5.0',
  isEnrolled = false,
  buying = false,
  primaryCta,
  priceLabel,
  // review form
  user,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  isSubmittingReview,
  onSubmitReview,
}) {
  const plainDesc =
    (course.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Khóa học chất lượng, học để đi làm.'

  const displayPrice = priceLabel || formatCoursePrice(course)
  const months = course.duration_months

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[#0b0b0f] text-white">
      {/* Atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-[12%] -top-[8%] h-[50vh] w-[50vw] rounded-full bg-[#f05123]/20 blur-[110px]" />
        <div className="absolute -bottom-[12%] -left-[8%] h-[45vh] w-[45vw] rounded-full bg-[#6366f1]/22 blur-[120px]" />
        <div className="absolute left-1/2 top-[40%] h-[28vh] w-[35vw] -translate-x-1/2 rounded-full bg-[#a855f7]/12 blur-[100px]" />
      </div>

      <PendingPaymentBanner className="relative z-40 border-amber-500/30 bg-amber-500/15 text-amber-50 [&_a]:bg-primary [&_p]:text-amber-100/90" />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0b0b0f]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[11px] font-extrabold text-white shadow-lg shadow-primary/30">
              LMS
            </span>
            <span className="hidden text-[11px] font-bold tracking-[0.08em] text-white/75 sm:inline">
              HỌC LẬP TRÌNH ĐỂ ĐI LÀM
            </span>
          </Link>
          <Link
            to="/courses"
            className="rounded-full border border-white/12 px-3.5 py-1.5 text-[12px] font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
          >
            ← Thoát
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="relative mx-auto grid w-full max-w-[1100px] items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            {course.categories?.name && (
              <span className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white/75">
                {course.categories.name}
              </span>
            )}
            <h1 className="text-[30px] font-extrabold leading-[1.12] tracking-tight sm:text-[40px] lg:text-[46px]">
              {course.title}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-[16px] line-clamp-4">
              {plainDesc}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#f5a623]">★</span>
                <strong className="text-white">{avgRating}</strong>
                <span className="text-white/45">({reviews.length || 0} đánh giá)</span>
              </span>
              <span className="text-white/25">·</span>
              <span>{lessons.length} bài học</span>
              {months ? (
                <>
                  <span className="text-white/25">·</span>
                  <span>{months} tháng</span>
                </>
              ) : null}
              <span className="text-white/25">·</span>
              <span>GV: {course.profiles?.name || 'Giảng viên'}</span>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={primaryCta.action}
                disabled={buying}
                className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-xl bg-[linear-gradient(90deg,#f05123_0%,#ea580c_50%,#c2410c_100%)] px-7 text-[13px] font-extrabold uppercase tracking-wide text-white shadow-[0_12px_40px_-8px_rgba(240,81,35,0.5)] transition hover:brightness-110 disabled:opacity-60"
              >
                {primaryCta.label}
              </button>
              <a
                href="#noi-dung"
                className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-6 text-[13px] font-bold uppercase tracking-wide text-white/90 transition hover:bg-white/10"
              >
                Xem nội dung
              </a>
            </div>
          </div>

          {/* Preview card */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-sm">
              <div className="aspect-[16/10] bg-[#16161e]">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f05123] via-[#c2410c] to-[#7c2d12] p-6 text-center text-xl font-extrabold">
                    {course.title}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                    Học phí
                  </p>
                  <p className="text-[26px] font-extrabold text-primary">{displayPrice}</p>
                </div>
                <button
                  type="button"
                  onClick={primaryCta.action}
                  disabled={buying}
                  className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-orangeHover disabled:opacity-60"
                >
                  {isEnrolled ? 'Vào học' : course.is_free ? 'Học ngay' : 'Mua ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mx-auto mt-14 grid w-full max-w-[900px] grid-cols-3 gap-4 text-center">
          {[
            { k: `${lessons.length || '—'}`, v: 'Bài học' },
            { k: avgRating, v: 'Đánh giá' },
            { k: months ? `${months} tháng` : 'Tự học', v: 'Thời lượng' },
          ].map((s) => (
            <div key={s.v}>
              <p className="text-[22px] font-extrabold text-white sm:text-[26px]">{s.k}</p>
              <p className="mt-1 text-[12px] text-white/45 sm:text-[13px]">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-[1100px] space-y-8 px-4 pb-36 sm:px-6 lg:px-8">
        {/* Audience */}
        <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14141c]/90 p-6 sm:p-8 lg:p-10">
          <h2 className="text-[26px] font-extrabold leading-snug sm:text-[30px]">
            Khoá học này dành cho ai?
          </h2>
          <div className="mt-8 space-y-6">
            {AUDIENCE.map((item) => (
              <div key={item.n} className="flex gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.tint} text-[16px] font-extrabold text-white shadow-lg`}
                >
                  {item.n}
                </span>
                <div>
                  <h3 className="text-[17px] font-extrabold text-white">{item.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-white/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Description */}
        <section className="rounded-3xl border border-white/[0.07] bg-[#14141c]/90 p-6 sm:p-8">
          <h2 className="mb-4 text-[22px] font-extrabold">Mô tả khóa học</h2>
          {course.description ? (
            <div
              className="course-desc max-w-none text-[15px] leading-relaxed text-white/70 [&_a]:text-primary [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:font-bold [&_h3]:text-white [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description) }}
            />
          ) : (
            <p className="text-[15px] text-white/50">
              Khóa học được thiết kế bài bản, giúp bạn nắm vững kiến thức và áp dụng ngay vào thực tế.
            </p>
          )}
        </section>

        {/* Lessons */}
        <section
          id="noi-dung"
          className="rounded-3xl border border-white/[0.07] bg-[#14141c]/90 p-6 sm:p-8"
        >
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="text-[22px] font-extrabold">Nội dung khóa học</h2>
            <span className="text-[13px] text-white/45">{lessons.length} bài học</span>
          </div>
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/8">
            {lessons.length > 0 ? (
              lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[0.03]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-[12px] font-bold text-white/55">
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
        <section className="rounded-3xl border border-white/[0.07] bg-[#14141c]/90 p-6 sm:p-8">
          <h2 className="mb-5 text-[22px] font-extrabold">Đánh giá từ học viên</h2>

          {user && isEnrolled && (
            <form
              onSubmit={onSubmitReview}
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
                  <span className="text-sm text-[#f5a623]">
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
                {review.teacher_reply && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-300">
                      Phản hồi giảng viên
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] text-white/75">
                      {review.teacher_reply}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="py-4 text-center text-[14px] text-white/40">Chưa có đánh giá nào.</p>
            )}
          </div>
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b0b0f]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold text-white sm:text-[16px]">
              {course.title}
            </p>
            <p className="truncate text-[12px] text-white/50">{plainDesc}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-[18px] font-extrabold text-primary sm:inline">
              {displayPrice}
            </span>
            <button
              type="button"
              onClick={primaryCta.action}
              disabled={buying}
              className="h-11 rounded-xl bg-[linear-gradient(90deg,#f05123_0%,#ea580c_100%)] px-5 text-[12px] font-bold uppercase tracking-wide text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110 disabled:opacity-60 sm:px-6"
            >
              {primaryCta.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
