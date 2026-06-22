import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseService } from '../../services/courseService'

const CourseList = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPublicCourses = async () => {
      const { data } = await courseService.getPublicCourses()
      if (data) setCourses(data)
      setLoading(false)
    }
    fetchPublicCourses()
  }, [])

  return (
    <div className="mx-auto max-w-6xl p-8 text-left">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Khám phá Khóa Học</h1>
        <p className="text-slate-500">Tìm kiếm và đăng ký các khóa học chất lượng cao.</p>
      </header>

      {loading ? (
        <p>Đang tải danh sách khóa học...</p>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md">
              <div className="h-40 w-full bg-slate-200">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">Không có ảnh</div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">
                  {course.categories?.name || 'Chưa phân loại'}
                </div>
                <h3 className="mb-1 text-base font-bold text-slate-900 group-hover:text-accent line-clamp-2">{course.title}</h3>
                <p className="mb-2 text-xs text-slate-500">Bởi: {course.profiles?.name || 'Giảng viên'}</p>
                
                <div className="mt-auto pt-4 font-bold text-accent">
                  {course.is_free ? 'Miễn phí' : `${course.price?.toLocaleString()}đ`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          Hiện tại chưa có khóa học nào được duyệt.
        </div>
      )}
    </div>
  )
}

export default CourseList
