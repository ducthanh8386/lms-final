import React, { useCallback, useEffect, useState } from 'react'
import { scheduleService } from '../../services/scheduleService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import WeeklyCalendar from '../../components/schedule/WeeklyCalendar'

const MySchedule = () => {
  const { user } = useAuth()
  const toast = useToast()

  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState([])

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    const today = new Date()
    const startRange = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString()
    const endRange = new Date(today.getFullYear() + 1, today.getMonth(), 1).toISOString()

    const { data, error } = await scheduleService.getStudentSchedules(startRange, endRange)
    if (error) {
      toast.error('Lỗi tải lịch học: ' + error.message)
    } else if (data) {
      setSchedules(data)
      const now = new Date()
      const upcomingSessions = data
        .filter((event) => new Date(event.start_time) > now)
        .slice(0, 5)
      setUpcoming(upcomingSessions)
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    if (user) fetchSchedules()
  }, [user, fetchSchedules])

  const formatUpcoming = (isoString) => {
    const date = new Date(isoString)
    return {
      day: date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  }

  const getMeetingReady = (event) => {
    if (!event.meeting_url) return false
    const start = new Date(event.start_time)
    const end = new Date(event.end_time)
    const now = new Date()
    return start.getTime() - now.getTime() <= 30 * 60 * 1000 && now < end
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight text-[#242424] sm:text-[28px]">
          Lịch học của tôi
        </h1>
        <p className="mt-1 text-[14px] text-[#666]">
          Theo dõi thời khóa biểu và tham gia buổi học trực tuyến.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-8 xl:col-span-9">
          {loading ? (
            <div className="h-[420px] animate-pulse rounded-2xl border border-[#e8e8e8] bg-white">
              <div className="flex h-full flex-col items-center justify-center gap-3 text-[#bbb]">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
                <span className="text-[13px]">Đang tải lịch học...</span>
              </div>
            </div>
          ) : (
            <WeeklyCalendar schedules={schedules} isStudent />
          )}
        </div>

        <aside className="space-y-4 lg:col-span-4 xl:col-span-3">
          {/* Upcoming */}
          <section className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white">
            <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFE8E0] text-primary">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
              </span>
              <div>
                <h2 className="text-[14px] font-extrabold text-[#242424]">Buổi học sắp tới</h2>
                <p className="text-[11px] text-[#999]">Tối đa 5 buổi gần nhất</p>
              </div>
            </div>

            <div className="p-3">
              {upcoming.length > 0 ? (
                <ul className="space-y-2">
                  {upcoming.map((event) => {
                    const { day, time } = formatUpcoming(event.start_time)
                    const ready = getMeetingReady(event)
                    return (
                      <li
                        key={event.id}
                        className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3 transition hover:border-[#ffd4c4] hover:bg-[#FFF8F5]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                              {day} · {time}
                            </p>
                            <h3 className="mt-1 truncate text-[13px] font-bold text-[#242424]">
                              {event.title}
                            </h3>
                            {event.classes?.name && (
                              <p className="mt-0.5 truncate text-[11px] text-[#888]">
                                {event.classes.name}
                                {event.profiles?.name ? ` · ${event.profiles.name}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        {event.meeting_url && (
                          ready ? (
                            <a
                              href={event.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2.5 flex h-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white hover:bg-brand-orangeHover"
                            >
                              Vào học ngay
                            </a>
                          ) : (
                            <div className="mt-2.5 rounded-full bg-[#eee] px-2 py-1.5 text-center text-[10px] font-semibold text-[#888]">
                              Link mở trước 30 phút
                            </div>
                          )
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-[#e8e8e8] px-3 py-8 text-center">
                  <p className="text-[13px] font-semibold text-[#666]">Chưa có buổi sắp tới</p>
                  <p className="mt-1 text-[11px] text-[#999]">
                    Khi có lịch mới, buổi học sẽ hiện ở đây.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Tips */}
          <section className="rounded-2xl border border-[#e8e8e8] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E3F0FF] text-[#1473E6]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
              </span>
              <h2 className="text-[14px] font-extrabold text-[#242424]">Hướng dẫn nhanh</h2>
            </div>
            <ol className="space-y-2.5 text-[12px] leading-relaxed text-[#666]">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[10px] font-bold text-[#555]">
                  1
                </span>
                <span>Nhấn vào buổi học trên lịch để xem chi tiết và link Zoom/Meet.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[10px] font-bold text-[#555]">
                  2
                </span>
                <span>Nút vào học chỉ mở trong vòng 30 phút trước giờ bắt đầu.</span>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default MySchedule
