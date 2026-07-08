import React, { useEffect, useState, useCallback } from 'react'
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
    // Lấy lịch trong khoảng rộng +/- 12 tháng để thoải mái chuyển đổi tuần
    const startRange = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString()
    const endRange = new Date(today.getFullYear() + 1, today.getMonth(), 1).toISOString()

    const { data, error } = await scheduleService.getStudentSchedules(startRange, endRange)
    if (error) {
      toast.error("Lỗi tải lịch học: " + error.message)
    } else if (data) {
      setSchedules(data)
      
      // Lọc các buổi học sắp tới trong vòng 7 ngày tới
      const now = new Date()
      const upcomingSessions = data
        .filter(event => new Date(event.start_time) > now)
        .slice(0, 3) // Lấy tối đa 3 buổi học gần nhất
      
      setUpcoming(upcomingSessions)
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    if (user) {
      fetchSchedules()
    }
  }, [user, fetchSchedules])

  const formatDateTimeShort = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left bg-slate-50 min-h-screen">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-slate-900">Lịch Học Của Tôi</h1>
        <p className="text-slate-500 text-sm">Xem thời khóa biểu các lớp học gia sư trực tuyến.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid - Cột chính chiếm 3 phần */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="h-96 w-full rounded-xl bg-white border animate-pulse flex items-center justify-center text-slate-400">
              Đang tải lịch học cá nhân...
            </div>
          ) : (
            <WeeklyCalendar
              schedules={schedules}
              isStudent={true}
            />
          )}
        </div>

        {/* Sidebar - Danh sách buổi học sắp tới */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 border-b pb-3 mb-4 flex items-center gap-2">
              <span>📅</span> Buổi học sắp tới
            </h3>

            {upcoming.length > 0 ? (
              <div className="space-y-4">
                {upcoming.map(event => (
                  <div key={event.id} className="p-3.5 rounded-lg border bg-slate-50/50 hover:bg-slate-50 transition text-xs flex flex-col gap-1.5">
                    <span className="font-bold text-slate-500 text-[10px] uppercase">
                      {formatDateTimeShort(event.start_time)}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{event.title}</h4>
                    {event.classes && (
                      <span className="text-slate-600">Lớp: <strong>{event.classes.name}</strong></span>
                    )}
                    {event.profiles?.name && (
                      <span className="text-slate-500 text-[10px]">GV: {event.profiles.name}</span>
                    )}
                    {event.meeting_url && (
                      <a 
                        href={event.meeting_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-2 text-center rounded bg-accent py-1.5 font-bold text-white hover:bg-purple-600 transition block text-[10px]"
                      >
                        Vào học trực tuyến
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-8">
                Không có lịch học nào sắp diễn ra trong thời gian tới.
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm text-xs text-slate-400 leading-relaxed space-y-2">
            <h4 className="font-bold text-slate-700">💡 Hướng dẫn sử dụng:</h4>
            <p>1. Nhấp vào buổi học trên lịch để xem liên kết phòng học trực tuyến Zoom/Google Meet và nội dung chi tiết.</p>
            <p>2. Đường dẫn cuộc họp (Zoom/Meet) sẽ mở trước buổi học 30 phút.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MySchedule
