/**
 * Badge phân biệt khóa Video vs Zoom — dùng ở Admin/GV.
 * Video = teal · Zoom = blue
 */
export function getCourseModeMeta(enrollmentMode) {
  const isZoom = enrollmentMode === 'consultation'
  return {
    isZoom,
    key: isZoom ? 'zoom' : 'video',
    label: isZoom ? 'Khóa Zoom' : 'Khóa Video',
    shortLabel: isZoom ? 'Zoom' : 'Video',
    priceHint: isZoom ? 'Liên hệ' : null,
    badgeClass: isZoom
      ? 'bg-[#1d4ed8] text-white shadow-sm shadow-blue-500/25'
      : 'bg-[#0f766e] text-white shadow-sm shadow-teal-500/25',
    softClass: isZoom
      ? 'border border-blue-200 bg-blue-50 text-blue-800'
      : 'border border-teal-200 bg-teal-50 text-teal-800',
    barClass: isZoom ? 'border-l-[4px] border-l-[#1d4ed8]' : 'border-l-[4px] border-l-[#0f766e]',
    ribbonClass: isZoom
      ? 'bg-[#1d4ed8]/95 text-white'
      : 'bg-[#0f766e]/95 text-white',
  }
}

/** Giá hiển thị phía học viên (kiểu F8): Zoom → Liên hệ; Video → giá / Miễn phí */
export function formatCoursePrice(course) {
  if (!course) return '—'
  if (course.enrollment_mode === 'consultation') return 'Liên hệ'
  if (course.is_free) return 'Miễn phí'
  const amount = Number(course.price || 0)
  if (amount > 0) return `${amount.toLocaleString('vi-VN')}đ`
  return 'Miễn phí'
}

export default function CourseModeBadge({
  mode,
  variant = 'solid',
  size = 'sm',
  className = '',
}) {
  const meta = getCourseModeMeta(mode)
  const sizeClass =
    size === 'lg'
      ? 'px-3 py-1 text-[13px]'
      : size === 'md'
        ? 'px-2.5 py-0.5 text-[12px]'
        : 'px-2 py-0.5 text-[10px]'

  const colorClass = variant === 'soft' ? meta.softClass : meta.badgeClass

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tracking-wide ${sizeClass} ${colorClass} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${variant === 'soft' ? (meta.isZoom ? 'bg-blue-500' : 'bg-teal-500') : 'bg-white/90'}`}
        aria-hidden
      />
      {size === 'lg' ? meta.label : meta.shortLabel}
    </span>
  )
}
