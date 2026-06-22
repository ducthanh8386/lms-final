import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseService } from '../services/courseService'

const Home = () => {
  const [featuredCourses, setFeaturedCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await courseService.getPublicCourses()
      if (!error && data) {
        setFeaturedCourses(data.slice(0, 4))
      }
      setLoading(false)
    }
    fetchCourses()
  }, [])

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 py-24 sm:py-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Nền tảng học tập <span className="text-accent">trực tuyến</span> hàng đầu
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Phát triển kỹ năng của bạn với các khóa học chất lượng cao từ những chuyên gia thực chiến. Học mọi lúc, mọi nơi, không giới hạn.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              to="/courses"
              className="rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 transition-all duration-200"
            >
              Khám phá khóa học
            </Link>
            <Link to="/register" className="text-sm font-semibold leading-6 text-white hover:text-slate-200 transition-all">
              Đăng ký ngay <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-left">
          <div className="mb-12 md:flex md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Khóa học nổi bật</h2>
              <p className="mt-2 text-lg text-slate-600">Những khóa học được học viên yêu thích nhất hiện nay.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link to="/courses" className="text-sm font-bold text-accent hover:text-purple-600">Xem tất cả khóa học <span aria-hidden="true">→</span></Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCourses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="h-40 w-full bg-slate-200 overflow-hidden relative">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 bg-slate-100">Không có ảnh</div>
                    )}
                    <div className="absolute top-2 right-2 rounded-md bg-white/90 backdrop-blur-sm px-2 py-1 text-xs font-bold text-slate-800 shadow-sm">
                      {course.categories?.name || 'Chưa phân loại'}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-2 text-base font-bold text-slate-900 group-hover:text-accent line-clamp-2 transition-colors">{course.title}</h3>
                    <p className="mb-4 text-xs text-slate-500">Bởi: <span className="font-medium text-slate-700">{course.profiles?.name || 'Giảng viên'}</span></p>
                    
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="font-bold text-accent text-base">
                        {course.is_free ? 'Miễn phí' : `${course.price?.toLocaleString()}đ`}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Hiện tại chưa có khóa học nào.
            </div>
          )}
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-y-16 md:grid-cols-3 md:gap-x-12">
            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-6">
                <span className="text-3xl">👨‍🏫</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Học từ chuyên gia</h3>
              <p className="text-slate-600 leading-relaxed">Đội ngũ giảng viên giàu kinh nghiệm thực tế, mang đến những kiến thức và kỹ năng cập nhật nhất.</p>
            </div>
            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-6">
                <span className="text-3xl">⏰</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Học mọi lúc mọi nơi</h3>
              <p className="text-slate-600 leading-relaxed">Tự do sắp xếp thời gian học tập phù hợp với lịch trình cá nhân của bạn, trên mọi thiết bị.</p>
            </div>
            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-6">
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Chứng chỉ hoàn thành</h3>
              <p className="text-slate-600 leading-relaxed">Nhận chứng chỉ sau khi hoàn thành khóa học, giúp nâng cao profile và cơ hội nghề nghiệp.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="bg-slate-900 py-12 text-center text-slate-400">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p>© {new Date().getFullYear()} E-Learning Platform. Đồ án môn học.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home
