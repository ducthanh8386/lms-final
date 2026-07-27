import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTeacherCourses } from '../../hooks/useCourses'
import CourseModeBadge, { getCourseModeMeta } from '../../components/course/CourseModeBadge'

const CourseManage = () => {
  const { user } = useAuth()
  const { courses, loading } = useTeacherCourses(user?.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Khóa được phân công</h1>
          <p className="mt-1 text-[14px] text-slate-500">
            Admin tạo khóa và giao cho bạn. Bạn theo dõi học viên, tiến độ, quiz và bình luận.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải dữ liệu...</p>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const mode = getCourseModeMeta(course.enrollment_mode)
            return (
              <div
                key={course.id}
                className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${mode.barClass}`}
              >
                <div className="relative h-40 w-full bg-slate-200">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      Không có ảnh
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <CourseModeBadge mode={course.enrollment_mode} size="md" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {course.categories?.name || 'Chưa có DM'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        course.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : course.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {course.status}
                    </span>
                  </div>
                  <h3 className="mb-1 text-[16px] font-bold text-slate-900">{course.title}</h3>
                  <p className="mb-4 line-clamp-2 text-[13px] text-slate-500">{course.description}</p>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <span
                      className={`text-[14px] font-bold ${mode.isZoom ? 'text-blue-700' : 'text-teal-700'}`}
                    >
                      {course.enrollment_mode === 'consultation'
                        ? 'Liên hệ'
                        : course.is_free
                          ? 'Miễn phí'
                          : `${Number(course.price || 0).toLocaleString('vi-VN')}đ`}
                    </span>
                    <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
                      <Link
                        to={`/teacher/courses/${course.id}/quizzes`}
                        className="text-slate-600 hover:text-primary"
                      >
                        Quiz
                      </Link>
                      <Link
                        to={`/teacher/progress`}
                        className="text-slate-600 hover:text-primary"
                      >
                        Tiến độ
                      </Link>
                      {course.enrollment_mode === 'consultation' && (
                        <Link to="/teacher/leads" className="text-blue-700 hover:underline">
                          Tư vấn
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
          Chưa được phân công khóa nào. Liên hệ Admin để được giao khóa Video hoặc Zoom.
        </div>
      )}
    </div>
  )
}

export default CourseManage
