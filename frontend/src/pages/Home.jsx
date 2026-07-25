import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseService } from '../services/courseService'
import RequireAuthCourseLink from '../components/auth/RequireAuthCourseLink'

const GRADIENTS = [
  'from-[#ff8a3d] via-[#f05123] to-[#c43a12]',
  'from-[#ff6b9d] via-[#e63950] to-[#9b1d3a]',
  'from-[#6a8cff] via-[#4f46e5] to-[#312e81]',
  'from-[#2dd4bf] via-[#0ea5e9] to-[#0369a1]',
  'from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
  'from-[#a78bfa] via-[#7c3aed] to-[#5b21b6]',
]

const BANNERS = [
  {
    title: 'Lớp Fullstack trực tuyến',
    desc: 'Học thực chiến, làm dự án, được review và hỗ trợ trực tiếp từ giảng viên.',
    cta: 'Nhận lộ trình fullstack',
    to: '/courses',
    gradient: 'linear-gradient(90deg, #123a8a 0%, #1d4ed8 45%, #3b82f6 100%)',
    ctaHover: '#123a8a',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'LMS - Học lập trình web FullStack',
  },
  {
    title: 'Học lập trình để đi làm',
    desc: 'Lộ trình từ zero đến junior — HTML, CSS, JavaScript, React và hơn thế nữa.',
    cta: 'Xem lộ trình',
    to: '/courses',
    gradient: 'linear-gradient(90deg, #7c2d12 0%, #c2410c 50%, #f05123 100%)',
    ctaHover: '#7c2d12',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'LMS - Học lập trình để đi làm',
  },
]

// Cache để vào lại trang chủ không flash skeleton
let cachedCourses = null

function CourseCard({ course, index, compact = false }) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const priceLabel = course.is_free
    ? 'Miễn phí'
    : `${Number(course.price || 0).toLocaleString('vi-VN')}đ`
  return (
    <RequireAuthCourseLink
      courseId={course.id}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white transition-transform duration-150 hover:-translate-y-1"
    >
      <div className={`relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br ${gradient}`}>
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-end p-3 sm:p-4">
            <h3 className={`font-extrabold leading-tight text-white drop-shadow line-clamp-3 ${compact ? 'text-[14px]' : 'text-xl'}`}>
              {course.title}
            </h3>
          </div>
        )}
        {!course.is_free && (
          <span className="absolute left-2 top-2 text-sm sm:left-2.5 sm:top-2.5 sm:text-base" title="Pro">
            👑
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col px-0.5 pt-2.5 pb-1 sm:px-1 sm:pt-3`}>
        <h3
          className={`font-bold leading-snug text-[#242424] line-clamp-2 transition-colors group-hover:text-primary ${
            compact ? 'text-[13px] sm:text-[15px]' : 'text-[15px]'
          }`}
        >
          {course.title}
        </h3>

        <div className="mt-1.5 flex items-baseline gap-2 sm:mt-2">
          <span className={`font-bold text-primary ${compact ? 'text-[13px] sm:text-[15px]' : 'text-[15px]'}`}>
            {priceLabel}
          </span>
          {!course.is_free && course.compare_at_price > course.price && (
            <span className="text-[11px] text-[#999] line-through sm:text-xs">
              {Number(course.compare_at_price).toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>

        <div className={`mt-2 items-center gap-1 text-[12px] text-[#666] ${compact ? 'hidden sm:flex' : 'flex'}`}>
          <span className="text-[#f5a623]">★★★★★</span>
          <span className="font-semibold text-[#242424]">
            {Number(course.rating_avg ?? 4.8).toFixed(1)}
          </span>
          <span className="text-[#999]">({course.rating_count || 100}+)</span>
        </div>

        <div
          className={`mt-2.5 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#757575] ${
            compact ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {(course.profiles?.name || 'G').charAt(0)}
            </span>
            <span className="max-w-[110px] truncate">{course.profiles?.name || 'Giảng viên'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-8 2-8 4v1h16v-1c0-2-4-4-8-4Z" />
            </svg>
            {course.student_count || course.enrollments_count || '—'}
          </span>
        </div>
      </div>
    </RequireAuthCourseLink>
  )
}

const Home = () => {
  const [featuredCourses, setFeaturedCourses] = useState(() => cachedCourses || [])
  const [loading, setLoading] = useState(() => !cachedCourses)
  const [bannerIndex, setBannerIndex] = useState(0)

  // Preload ảnh banner để đổi slide không bị trắng
  useEffect(() => {
    BANNERS.forEach((b) => {
      const img = new Image()
      img.src = b.image
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchCourses = async () => {
      const { data, error } = await courseService.getPublicCourses({ limit: 8 })
      if (cancelled) return
      if (!error && data) {
        const list = data.slice(0, 8)
        cachedCourses = list
        setFeaturedCourses(list)
      }
      setLoading(false)
    }
    fetchCourses()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setBannerIndex((i) => (i + 1) % BANNERS.length)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  const banner = BANNERS[bannerIndex]

  return (
    <div className="w-full bg-white">
      <div className="mx-auto w-full max-w-[2400px] px-4 pt-4 pb-8 sm:pr-8 md:pl-[10px] md:pr-8 md:pb-10">
        {/* Hero banner */}
        <section className="relative mb-6 w-full sm:mb-8">
          <div
            className="relative flex w-full overflow-hidden rounded-[16px] max-md:min-h-[220px] max-md:flex-col md:h-[270px] min-[1800px]:h-[300px]"
            style={{ background: banner.gradient }}
          >
            <div className="relative z-10 order-2 flex w-full shrink-0 flex-col justify-center px-5 py-5 text-white md:order-1 md:w-[min(640px,38%)] md:max-w-[640px] md:px-9 md:py-0">
              <h1 className="mb-2 text-[22px] font-bold leading-[1.3] sm:text-[28px] md:text-[32px]">
                {banner.title}
              </h1>
              <p className="mb-4 max-w-[520px] text-[13px] leading-relaxed text-white/95 line-clamp-2 sm:mb-5 sm:text-[14px] md:text-[15px] md:line-clamp-3">
                {banner.desc}
              </p>
              <Link
                to={banner.to}
                className="inline-flex min-h-[40px] w-fit items-center justify-center gap-1.5 rounded-full bg-white px-4 text-[12px] font-bold uppercase tracking-wide text-[#1d4ed8] transition hover:bg-white/90 sm:min-h-[44px] sm:border-2 sm:border-white sm:bg-transparent sm:px-5 sm:text-[13px] sm:text-white sm:hover:bg-white sm:hover:text-[#123a8a]"
              >
                {banner.cta}
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="relative order-1 hidden min-w-0 w-full aspect-[2/1] sm:block md:order-2 md:aspect-auto md:flex md:h-full md:flex-[3] md:justify-end">
              {BANNERS.map((b, i) => (
                <img
                  key={b.image}
                  src={b.image}
                  alt={b.imageAlt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
                    i === bannerIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Banner ${i + 1}`}
                onClick={() => setBannerIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </section>

        {/* Dành cho bạn — mobile: horizontal scroll */}
        <section className="mx-auto w-full max-w-[1600px] md:px-10">
          <div className="mb-4 flex items-end justify-between gap-4 px-0 sm:mb-5 sm:px-6 md:px-0">
            <h2 className="text-[20px] font-extrabold text-[#242424] sm:text-2xl">Dành cho bạn</h2>
            <Link to="/courses" className="text-[13px] font-semibold text-primary hover:underline sm:text-sm">
              Xem tất cả
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-4 sm:px-6 md:px-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/10] rounded-2xl bg-[#eee]" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-[#eee] sm:mt-3 sm:h-4" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-[#eee] sm:h-4" />
                </div>
              ))}
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-4 sm:px-6 md:px-0">
              {featuredCourses.slice(0, 4).map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} compact />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ddd] py-16 text-center text-sm text-[#888]">
              Hiện chưa có khóa học nào. Hãy quay lại sau!
            </div>
          )}
        </section>

        <section className="mx-auto mt-10 w-full max-w-[1600px] sm:mt-14 md:px-10">
          <div className="flex flex-col gap-4 rounded-2xl bg-[#f5f5f5] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
            <div>
              <h3 className="text-[16px] font-extrabold text-[#242424] sm:text-lg">
                Bắt đầu hành trình học tập của bạn
              </h3>
              <p className="mt-1 text-[13px] text-[#666] sm:text-sm">
                Khám phá khóa học phù hợp, học mọi lúc mọi nơi và nâng cao kỹ năng để đi làm.
              </p>
            </div>
            <Link
              to="/courses"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orangeHover"
            >
              Bắt đầu học
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home
