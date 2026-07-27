import RequireAuthCourseLink from '../auth/RequireAuthCourseLink'
import { formatCoursePrice } from './CourseModeBadge'

const GRADIENTS = [
  'from-[#7c3aed] via-[#4f46e5] to-[#1d4ed8]',
  'from-[#ff8a3d] via-[#f05123] to-[#c43a12]',
  'from-[#2dd4bf] via-[#0ea5e9] to-[#0369a1]',
  'from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
  'from-[#a78bfa] via-[#7c3aed] to-[#5b21b6]',
  'from-[#ff6b9d] via-[#e63950] to-[#9b1d3a]',
]

function StarRow({ rating }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0))
  return (
    <span className="inline-flex items-center gap-0.5 text-[#f5a623]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <span key={i} className="relative inline-block h-[12px] w-[12px] text-[12px] leading-none">
            <span className="absolute inset-0 text-[#e0e0e0]">★</span>
            <span
              className="absolute inset-0 overflow-hidden text-[#f5a623]"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        )
      })}
    </span>
  )
}

function formatDuration(course) {
  if (course.duration_label) return course.duration_label
  if (course.duration_months) return `${course.duration_months} tháng`
  const lessons = Number(course.lesson_count || 0)
  if (lessons > 0) return `${lessons} bài`
  return null
}

/**
 * Course card kiểu F8: thumbnail · title · giá/Liên hệ · sao · GV · sĩ số · thời lượng
 */
export default function CourseCard({ course, index = 0, compact = false }) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const priceLabel = formatCoursePrice(course)
  const rating = Number(course.rating_avg ?? 4.6)
  const ratingCount = Number(course.rating_count || 0)
  const studentCount = Number(course.student_count || course.enrollments_count || 0)
  const duration = formatDuration(course)
  const teacherName = course.profiles?.name || course.teacher_name || 'Giảng viên'

  return (
    <RequireAuthCourseLink
      courseId={course.id}
      className="group flex flex-col overflow-hidden rounded-[16px] bg-white transition-transform duration-150 hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div
        className={`relative aspect-[16/10] overflow-hidden rounded-[16px] bg-gradient-to-br ${gradient}`}
      >
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4">
            <h3
              className={`text-center font-extrabold leading-tight text-white drop-shadow line-clamp-3 ${
                compact ? 'text-[15px]' : 'text-xl'
              }`}
            >
              {course.title}
            </h3>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-0.5 pt-2.5 pb-1 sm:px-1 sm:pt-3">
        <h3
          className={`font-bold leading-snug text-[#242424] line-clamp-2 transition-colors group-hover:text-primary ${
            compact ? 'text-[13px] sm:text-[15px]' : 'text-[15px]'
          }`}
        >
          {course.title}
        </h3>

        <div className="mt-1.5 sm:mt-2">
          <span
            className={`font-bold text-primary ${compact ? 'text-[14px] sm:text-[16px]' : 'text-[16px]'}`}
          >
            {priceLabel}
          </span>
        </div>

        <div
          className={`mt-1.5 items-center gap-1.5 text-[12px] text-[#666] ${
            compact ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <StarRow rating={rating} />
          <span className="font-semibold text-[#242424]">{rating.toFixed(1)}</span>
          <span className="text-[#999]">
            ({ratingCount > 0 ? ratingCount : '100+'})
          </span>
        </div>

        <div
          className={`mt-2.5 flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[#757575] ${
            compact ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eee] text-[10px] font-bold text-[#666]">
              {teacherName.charAt(0)}
            </span>
            <span className="max-w-[100px] truncate">{teacherName}</span>
          </span>

          <span className="inline-flex items-center gap-1" title="Số bài / học viên">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#999]" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm-1.5 14.5v-9L17 12l-6.5 4.5Z" />
            </svg>
            {Number(course.lesson_count || 0) > 0
              ? course.lesson_count
              : studentCount > 0
                ? studentCount
                : '—'}
          </span>

          {duration && (
            <span className="inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#999]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              {duration}
            </span>
          )}
        </div>
      </div>
    </RequireAuthCourseLink>
  )
}
