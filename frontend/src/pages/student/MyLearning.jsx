import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { studentService } from '../../services/studentService'
import { useAuth } from '../../context/AuthContext'

const MyLearning = () => {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMyCourses = async () => {
      if (user) {
        const { data } = await studentService.getMyEnrollments(user.id)
        if (data) setEnrollments(data)
      }
      setLoading(false)
    }
    fetchMyCourses()
  }, [user])

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 text-left">
      <h1 className="mb-8 text-3xl font-bold text-slate-900">Khóa học của tôi</h1>

      {loading ? (
        <p>Đang tải danh sách khóa học...</p>
      ) : enrollments.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {enrollments.map((en) => {
            const course = en.courses
            if (!course) return null
            return (
              <Link
                key={course.id}
                to={`/learning/${course.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative h-40 w-full bg-slate-200">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      Không có ảnh
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="mb-1 text-base font-bold text-slate-900 group-hover:text-accent line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="mb-4 text-xs text-slate-500">Giảng viên: {course.profiles?.name}</p>

                  <div className="mt-auto">
                    <span className="block w-full rounded bg-primary py-2 text-center text-sm font-bold text-white group-hover:bg-brand-orangeHover">
                      Vào học tiếp
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center text-slate-500">
          Bạn chưa đăng ký khóa học nào.
          <div className="mt-4">
            <Link to="/courses" className="font-semibold text-accent hover:underline">
              Khám phá khóa học →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyLearning
