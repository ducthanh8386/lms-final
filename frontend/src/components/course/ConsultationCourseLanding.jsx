import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConsultationLeadForm from './ConsultationLeadForm'

const PAIN_POINTS = [
  {
    title: 'Chương trình học không theo kịp thực tế',
    desc: 'Kiến thức rời rạc khiến người học khó nối nền tảng với cách giải quyết vấn đề trong sản phẩm thật.',
    icon: '⏱',
    tint: 'from-amber-500/20 to-orange-600/10',
  },
  {
    title: 'Thiếu kinh nghiệm thực tế',
    desc: 'Tốt nghiệp mà chưa từng làm một dự án hoàn chỉnh từ đầu đến cuối.',
    icon: '🔧',
    tint: 'from-sky-500/20 to-blue-600/10',
  },
  {
    title: 'Không biết bắt đầu từ đâu',
    desc: 'Quá nhiều công nghệ và roadmap khiến người mới dễ bị choáng ngợp.',
    icon: '📍',
    tint: 'from-violet-500/20 to-fuchsia-600/10',
  },
  {
    title: 'Áp lực so sánh với người khác',
    desc: 'Thấy bạn bè có việc làm trong khi mình vẫn đang loay hoay tìm hướng đi.',
    icon: '⚖',
    tint: 'from-emerald-500/20 to-teal-600/10',
  },
]

const OUTCOMES = [
  {
    title: 'Có kỹ năng thực tế để bắt đầu',
    desc: 'Portfolio dự án thật, biết trình bày năng lực trong CV và phỏng vấn.',
  },
  {
    title: 'Công nghệ hiện đại',
    desc: 'Làm việc với React, NodeJS, TypeScript và công cụ dùng trong dự án thực tế.',
  },
  {
    title: 'Tư duy Fullstack Developer',
    desc: 'Hiểu bức tranh từ database, backend, frontend đến triển khai và debug.',
  },
  {
    title: 'Mở rộng con đường nghề nghiệp',
    desc: 'Có thể freelance, làm remote, tự xây sản phẩm hoặc ứng tuyển đúng mục tiêu.',
  },
]

const ConsultationCourseLanding = ({ course }) => {
  const [formOpen, setFormOpen] = useState(false)
  const months = course.duration_months || 8
  const plainDesc =
    (course.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240) ||
    'Học React, NodeJS, TypeScript — làm dự án thật, được review và hỗ trợ trực tiếp. Để lại thông tin để được tư vấn lộ trình phù hợp.'

  // Khóa scroll body khi landing full-bleed (kiểu F8)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[#0b0b0f] text-white">
      {/* Atmospheric glows — full viewport */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-[10%] -top-[10%] h-[55vh] w-[55vw] rounded-full bg-[#4f46e5]/25 blur-[120px]" />
        <div className="absolute -bottom-[15%] -left-[10%] h-[50vh] w-[50vw] rounded-full bg-[#a855f7]/20 blur-[130px]" />
        <div className="absolute left-1/2 top-[35%] h-[30vh] w-[40vw] -translate-x-1/2 rounded-full bg-[#6366f1]/10 blur-[100px]" />
      </div>

      {/* Top bar */}
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

      {/* Hero — full-bleed section, content centered */}
      <section className="relative w-full px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="relative mx-auto w-full max-w-[900px]">
          <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-tight sm:text-[44px] lg:text-[52px]">
            Lộ trình{' '}
            <span className="bg-[linear-gradient(90deg,#7dd3fc_0%,#a78bfa_45%,#e879f9_100%)] bg-clip-text text-transparent">
              {course.title || 'Fullstack Web'}
            </span>{' '}
            từ zero đến có kỹ năng thực tế
          </h1>

          <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-relaxed text-white/60 sm:text-[16px]">
            {plainDesc}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex h-12 min-w-[220px] items-center justify-center rounded-xl bg-[linear-gradient(90deg,#6366f1_0%,#8b5cf6_50%,#a855f7_100%)] px-7 text-[13px] font-extrabold uppercase tracking-wide text-white shadow-[0_12px_40px_-8px_rgba(99,102,241,0.55)] transition hover:brightness-110"
            >
              Đăng ký tư vấn
            </button>
            <a
              href="#chuong-trinh"
              className="inline-flex h-12 min-w-[220px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-7 text-[13px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm transition hover:bg-white/10"
            >
              Xem chương trình học
            </a>
          </div>

          {/* Stats row — F8 style */}
          <div className="mx-auto mt-14 grid max-w-[720px] grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
            {[
              { k: '12 modules', v: 'Từ cơ bản đến nâng cao' },
              { k: `~${months} tháng`, v: 'Thời gian hoàn thành' },
              { k: '3 dự án', v: 'Demo deploy được' },
            ].map((item) => (
              <div key={item.k} className="text-center">
                <p className="text-[22px] font-extrabold text-white sm:text-[24px]">{item.k}</p>
                <p className="mt-1 text-[13px] text-white/45">{item.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain points — full width bg, constrained content */}
      <section className="relative w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <h2 className="text-center text-[26px] font-extrabold sm:text-[30px]">
            Những khó khăn thường gặp
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-white/50">
            Khi học lập trình web, bạn có thể gặp phải những vấn đề này
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_POINTS.map((p) => (
              <article
                key={p.title}
                className="rounded-2xl border border-white/[0.08] bg-[#14141c]/90 p-5 shadow-xl shadow-black/20 backdrop-blur-sm"
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${p.tint} text-lg`}
                >
                  {p.icon}
                </div>
                <h3 className="text-[15px] font-bold leading-snug text-white">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section id="chuong-trinh" className="relative w-full px-4 py-16 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto w-full max-w-[1100px]">
          <h2 className="text-center text-[26px] font-extrabold sm:text-[30px]">
            Sau khi hoàn thành chương trình
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-white/50">
            Bạn sẽ có kỹ năng thực tế và portfolio để bắt đầu tìm kiếm cơ hội nghề nghiệp
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OUTCOMES.map((o) => (
              <article
                key={o.title}
                className="rounded-2xl border border-white/[0.08] bg-[#14141c]/90 p-5 backdrop-blur-sm"
              >
                <h3 className="text-[15px] font-bold text-white">{o.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">{o.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[linear-gradient(90deg,#6366f1_0%,#a855f7_100%)] px-10 text-[13px] font-extrabold uppercase tracking-wide text-white shadow-[0_12px_40px_-8px_rgba(168,85,247,0.45)] transition hover:brightness-110"
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </section>

      <ConsultationLeadForm
        courseId={course.id}
        courseTitle={course.title}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  )
}

export default ConsultationCourseLanding
