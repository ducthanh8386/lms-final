import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTeacherCourses } from '../../hooks/useCourses'

const FLOW = [
  {
    step: '1',
    title: 'Nhận khóa được phân công',
    desc: 'Admin tạo khóa Video/Zoom và giao cho bạn. Bạn theo dõi học viên & nội dung quiz.',
    to: '/teacher/courses',
    cta: 'Xem khóa của tôi',
  },
  {
    step: '2',
    title: 'Nhận đăng ký tư vấn',
    desc: 'Học viên để lại SĐT/form — không thanh toán online. Liên hệ & chốt lịch.',
    to: '/teacher/leads',
    cta: 'Xem đăng ký tư vấn',
  },
  {
    step: '3',
    title: 'Xếp lớp',
    desc: 'Tạo lớp, gửi mã mời, quản lý danh sách học viên trong lớp.',
    to: '/teacher/classes',
    cta: 'Quản lý lớp học',
  },
  {
    step: '4',
    title: 'Lịch dạy Zoom',
    desc: 'Tạo buổi học, gắn link Zoom, học viên xem ở Lịch học.',
    to: '/teacher/schedule',
    cta: 'Quản lý lịch dạy',
  },
]

const TeacherDashboard = () => {
  const { user, profile } = useAuth()
  const { courses, loading } = useTeacherCourses(user?.id)
  const approved = courses.filter((c) => c.status === 'approved').length
  const pending = courses.filter((c) => c.status === 'pending').length
  const consultation = courses.filter((c) => c.enrollment_mode === 'consultation').length

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-[12px] font-bold uppercase tracking-wider text-primary">Workspace giảng viên</p>
        <h1 className="mt-1 text-[28px] font-extrabold text-slate-900">
          Xin chào, {profile?.name || 'Giảng viên'}
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-slate-600">
          Đây là khu vực quản lý — khác trang học viên. Dùng menu bên trái theo đúng luồng:
          khóa học → tư vấn → xếp lớp → lịch Zoom.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Tổng khóa học', value: loading ? '…' : courses.length },
          { label: 'Đã duyệt', value: loading ? '…' : approved },
          { label: 'Chờ duyệt', value: loading ? '…' : pending },
          { label: 'Khóa tư vấn Zoom', value: loading ? '…' : consultation },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[12px] font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-[28px] font-extrabold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-[18px] font-bold text-slate-900">Luồng xử lý đề xuất</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FLOW.map((item) => (
            <article
              key={item.step}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[13px] font-extrabold text-white">
                  {item.step}
                </span>
                <h3 className="text-[16px] font-bold text-slate-900">{item.title}</h3>
              </div>
              <p className="flex-1 text-[13px] leading-relaxed text-slate-600">{item.desc}</p>
              <Link
                to={item.to}
                className="mt-4 inline-flex text-[13px] font-bold text-primary hover:underline"
              >
                {item.cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">Thao tác nhanh</h2>
            <p className="text-[13px] text-slate-500">Xem khóa được giao, học viên và tiến độ.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/teacher/courses"
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white"
            >
              Khóa của tôi
            </Link>
            <Link
              to="/teacher/students"
              className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700"
            >
              Học viên
            </Link>
            <Link
              to="/teacher/progress"
              className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700"
            >
              Tiến độ học
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default TeacherDashboard
