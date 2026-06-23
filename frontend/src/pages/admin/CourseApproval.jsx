import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'

const CourseApproval = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPendingCourses = useCallback(async () => {
    setLoading(true)
    const { data } = await adminService.getPendingCourses()
    if (data) setCourses(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPendingCourses()
  }, [fetchPendingCourses])

  const handleApprove = async (courseId) => {
    await adminService.updateCourseStatus(courseId, 'approved')
    fetchPendingCourses()
  }

  const handleReject = async (courseId) => {
    await adminService.updateCourseStatus(courseId, 'rejected')
    fetchPendingCourses()
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 text-left">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-accent hover:underline">← Về Admin Dashboard</Link>
      </div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">Duyệt Khóa Học</h1>

      {loading ? (
        <p>Đang tải danh sách chờ duyệt...</p>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <div key={course.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-bold">{course.title}</h3>
              <p className="mb-4 text-sm text-slate-500">Bởi: {course.profiles?.name}</p>
              <div className="mb-4 text-sm font-medium">Giá: {course.is_free ? 'Miễn phí' : `${course.price}đ`}</div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleApprove(course.id)}
                  className="flex-1 rounded bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600"
                >Duyệt</button>
                <button 
                  onClick={() => handleReject(course.id)}
                  className="flex-1 rounded bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600"
                >Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-8 text-center text-slate-500">
          Không có khóa học nào đang chờ duyệt.
        </div>
      )}
    </div>
  )
}

export default CourseApproval
