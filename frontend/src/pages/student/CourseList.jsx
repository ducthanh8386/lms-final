import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { courseService } from '../../services/courseService'
import CourseCard from '../../components/course/CourseCard'

const coursesCache = new Map()

const CourseList = () => {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const cacheKey = q || '__all__'

  const [courses, setCourses] = useState(() => coursesCache.get(cacheKey) || [])
  const [loading, setLoading] = useState(() => !coursesCache.has(cacheKey))

  useEffect(() => {
    let cancelled = false

    const fetchPublicCourses = async () => {
      if (!coursesCache.has(cacheKey)) setLoading(true)
      const { data } = await courseService.getPublicCourses({ search: q || undefined, limit: 24 })
      if (cancelled) return
      if (data) {
        coursesCache.set(cacheKey, data)
        setCourses(data)
      }
      setLoading(false)
    }

    fetchPublicCourses()
    return () => {
      cancelled = true
    }
  }, [q, cacheKey])

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 text-left">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#242424]">
          {q ? `Kết quả cho “${q}”` : 'Khám phá khóa học'}
        </h1>
        <p className="mt-1 text-sm text-[#666]">Chọn khóa phù hợp và bắt đầu học ngay.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[16/10] rounded-[16px] bg-[#eee]" />
              <div className="mt-3 h-4 w-4/5 rounded bg-[#eee]" />
              <div className="mt-2 h-4 w-1/3 rounded bg-[#eee]" />
            </div>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#ddd] p-12 text-center text-sm text-[#888]">
          {q ? 'Không tìm thấy khóa học phù hợp.' : 'Hiện tại chưa có khóa học nào được duyệt.'}
        </div>
      )}
    </div>
  )
}

export default CourseList
