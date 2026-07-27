import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { studentService } from '../../services/studentService'
import { preloadRoute } from '../../utils/routePreload'

const formatRelativeStudy = (iso) => {
  if (!iso) return null
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return null
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Học vừa xong'
  if (mins < 60) return `Học cách đây ${mins} phút`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Học cách đây ${hours} giờ`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Học cách đây ${days} ngày trước`
  const months = Math.floor(days / 30)
  if (months < 12) return `Học cách đây ${months} tháng trước`
  return `Học cách đây ${Math.floor(months / 12)} năm trước`
}

const MyCoursesMenu = () => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const ref = useRef(null)
  const loadedRef = useRef(false)

  const loadCourses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: enrollments } = await studentService.getMyEnrollments(user.id)
      const list = (enrollments || []).filter((en) => en.courses)
      if (list.length === 0) {
        setItems([])
        return
      }

      const { data: summaries } = await studentService.getMyLearningProgressSummary(user.id)
      const byCourse = new Map((summaries || []).map((row) => [row.course_id, row]))

      setItems(
        list.map((en) => {
          const course = en.courses
          const summary = byCourse.get(course.id)
          return {
            id: course.id,
            title: course.title,
            thumbnail: course.thumbnail,
            percent: summary?.progress_percent ?? 0,
            lastStudiedAt: summary?.last_studied_at || null,
            enrolledAt: en.enrolled_at,
          }
        })
      )
    } finally {
      setLoading(false)
      loadedRef.current = true
    }
  }, [user])

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) loadCourses()
  }

  if (!user) return null

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => preloadRoute('/learning')}
        className="inline-flex items-center whitespace-nowrap bg-transparent p-0 text-[14px] font-semibold leading-none text-[#292929] transition hover:text-primary"
        style={{
          fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
          fontSize: '14px',
          fontWeight: 600,
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Khóa học của tôi
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[380px] overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3
              className="text-[16px] font-bold text-[#242424]"
              style={{
                fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
                fontWeight: 700,
              }}
            >
              Khóa học của tôi
            </h3>
            <Link
              to="/learning"
              onClick={() => setOpen(false)}
              onMouseEnter={() => preloadRoute('/learning')}
              className="text-[14px] font-semibold text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto px-3 pb-3">
            {loading && !loadedRef.current ? (
              <p className="px-2 py-8 text-center text-[13px] text-[#888]">Đang tải...</p>
            ) : items.length === 0 ? (
              <div className="px-2 py-8 text-center">
                <p className="text-[13px] text-[#888]">Bạn chưa có khóa học nào.</p>
                <Link
                  to="/courses"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex text-[13px] font-semibold text-primary hover:underline"
                >
                  Khám phá khóa học
                </Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {items.map((course) => {
                  const started = course.percent > 0 || course.lastStudiedAt
                  const relative = formatRelativeStudy(course.lastStudiedAt)
                  return (
                    <li key={course.id}>
                      <Link
                        to={`/learning/${course.id}`}
                        onClick={() => setOpen(false)}
                        className="flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[#f5f5f5]"
                      >
                        <div className="h-[54px] w-[86px] shrink-0 overflow-hidden rounded-lg bg-[#f0f0f0]">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary to-[#7c2d12] px-1 text-center text-[9px] font-bold leading-tight text-white">
                              {course.title}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[14px] font-bold leading-snug text-[#242424]">
                            {course.title}
                          </p>
                          {started ? (
                            <>
                              <p className="mt-1 text-[12px] text-[#888]">
                                {relative || 'Đã bắt đầu học'}
                              </p>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ebebeb]">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${course.percent}%` }}
                                />
                              </div>
                            </>
                          ) : (
                            <p className="mt-1 text-[12px] text-[#888]">
                              Bạn chưa học khóa này ·{' '}
                              <span className="font-semibold text-primary">Bắt đầu học</span>
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MyCoursesMenu
