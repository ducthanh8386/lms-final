import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTeacherCourses } from '../../hooks/useCourses'

import TeacherTabs from '../../components/teacher/TeacherTabs'

const CourseManage = () => {
  const { user } = useAuth()
  const { courses, loading } = useTeacherCourses(user?.id)

  return (
    <div className="mx-auto max-w-5xl p-8 text-left">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Giảng Viên Dashboard</h1>
          <p className="text-slate-500">Quản lý khóa học, đơn hàng và cài đặt thanh toán.</p>
        </div>
        <Link 
          to="/teacher/courses/new" 
          className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600"
        >
          + Tạo khóa học mới
        </Link>
      </header>

      <TeacherTabs />

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md">
              <div className="h-40 w-full bg-slate-200">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">Không có ảnh</div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {course.categories?.name || 'Không có DM'}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    course.status === 'approved' ? 'bg-green-100 text-green-700' :
                    course.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {course.status}
                  </span>
                </div>
                <h3 className="mb-1 text-lg font-bold text-slate-900">{course.title}</h3>
                <p className="mb-4 text-sm text-slate-500 line-clamp-2">{course.description}</p>
                
                <div className="mt-auto flex items-center justify-between border-t pt-4">
                  <span className="font-semibold text-accent">
                    {course.is_free ? 'Miễn phí' : `${course.price?.toLocaleString()}đ`}
                  </span>
                  <div className="flex gap-2">
                    <Link to={`/teacher/courses/${course.id}/edit`} className="text-sm font-medium text-slate-600 hover:text-accent">Sửa</Link>
                    <Link to={`/teacher/courses/${course.id}/lessons`} className="text-sm font-medium text-slate-600 hover:text-accent">Bài học</Link>
                    <Link to={`/teacher/courses/${course.id}/assignments`} className="text-sm font-medium text-slate-600 hover:text-accent">Bài tập</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          Bạn chưa tạo khóa học nào. Hãy bắt đầu tạo khóa học đầu tiên của mình!
        </div>
      )}
    </div>
  )
}

export default CourseManage
