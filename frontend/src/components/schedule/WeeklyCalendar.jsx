import React, { useEffect, useState } from 'react'

const colorMap = {
  blue: 'bg-[#E3F0FF] text-[#0B4A99] border-[#B6D4FE]',
  green: 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]',
  red: 'bg-[#FFEBEE] text-[#B71C1C] border-[#EF9A9A]',
  purple: 'bg-primary-container text-on-primary-container border-[#FFCCBC]',
  orange: 'bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]',
}

const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const dayNamesShort = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const WeeklyCalendar = ({ schedules = [], isStudent = false, onDeleteSchedule }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [mobileActiveDay, setMobileActiveDay] = useState(new Date())

  useEffect(() => {
    setMobileActiveDay(currentDate)
  }, [currentDate])

  useEffect(() => {
    if (!selectedEvent) return
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedEvent(null)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [selectedEvent])

  const getStartOfWeek = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const startOfWeek = getStartOfWeek(currentDate)
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })

  const navigateWeek = (weeks) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + weeks * 7)
    setCurrentDate(newDate)
  }

  const goToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setMobileActiveDay(now)
  }

  const getEventsForDay = (day) =>
    schedules.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getFullYear() === day.getFullYear() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getDate() === day.getDate()
      )
    })

  const formatTime = (isoString) =>
    new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  const formatDateShort = (date) =>
    date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

  const isToday = (date) => new Date().toDateString() === date.toDateString()

  const isSameDay = (a, b) => a.toDateString() === b.toDateString()

  const getMeetingStatus = (event) => {
    if (!event.meeting_url) return { active: false, label: 'Không có link họp' }
    const startTime = new Date(event.start_time)
    const endTime = new Date(event.end_time)
    const now = new Date()
    const startOffsetMs = 30 * 60 * 1000
    const isActive =
      startTime.getTime() - now.getTime() <= startOffsetMs && now.getTime() < endTime.getTime()

    if (now.getTime() >= endTime.getTime()) {
      return { active: false, label: 'Buổi học đã kết thúc' }
    }
    if (isActive) return { active: true, label: 'Vào học ngay' }
    return { active: false, label: 'Link mở trước 30 phút' }
  }

  const weekLabel = `${formatDateShort(daysOfWeek[0])} – ${formatDateShort(daysOfWeek[6])}`
  const weekYear = daysOfWeek[0].getFullYear()

  return (
    <div className="w-full select-none overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-[#f0f0f0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateWeek(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e8e8] text-[#555] transition hover:bg-[#f5f5f5] hover:text-[#242424]"
            aria-label="Tuần trước"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToday}
            className="inline-flex h-9 items-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_100%)] px-4 text-[13px] font-bold text-white shadow-sm transition hover:brightness-105"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => navigateWeek(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e8e8] text-[#555] transition hover:bg-[#f5f5f5] hover:text-[#242424]"
            aria-label="Tuần sau"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-[15px] font-extrabold text-[#242424]">Tuần {weekLabel}</p>
          <p className="text-[12px] text-[#888]">Năm {weekYear}</p>
        </div>
      </div>

      {/* Mobile day strip */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-[#f0f0f0] px-3 py-3 sm:hidden scrollbar-none">
        {daysOfWeek.map((day, idx) => {
          const active = isSameDay(day, mobileActiveDay)
          const today = isToday(day)
          const count = getEventsForDay(day).length
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setMobileActiveDay(day)}
              className={`flex min-w-[52px] flex-col items-center rounded-xl px-2 py-2 transition ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : today
                    ? 'bg-[#FFE8E0] text-primary'
                    : 'bg-[#f5f5f5] text-[#555] hover:bg-[#eee]'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase opacity-80">{dayNamesShort[idx]}</span>
              <span className="text-[16px] font-extrabold leading-tight">{day.getDate()}</span>
              {count > 0 && (
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : 'bg-primary'}`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Desktop week grid */}
      <div className="hidden sm:grid grid-cols-7 divide-x divide-[#f0f0f0]">
        {daysOfWeek.map((day, idx) => {
          const events = getEventsForDay(day)
          const today = isToday(day)

          return (
            <div
              key={idx}
              className={`flex min-h-[340px] flex-col ${today ? 'bg-[#FFF8F5]' : 'bg-white'}`}
            >
              <div
                className={`border-b px-2 py-3 text-center ${
                  today ? 'border-primary/20' : 'border-[#f0f0f0]'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#999]">
                  {dayNames[idx]}
                </div>
                <div
                  className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-extrabold ${
                    today ? 'bg-primary text-white' : 'text-[#242424]'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {events.map((event) => {
                  const colorClass =
                    colorMap[event.color_tag] || 'bg-[#f5f5f5] border-[#e8e8e8] text-[#292929]'
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full rounded-xl border p-2 text-left transition hover:-translate-y-px hover:shadow-sm ${colorClass}`}
                    >
                      <div className="text-[11px] font-bold opacity-80">
                        {formatTime(event.start_time)} – {formatTime(event.end_time)}
                      </div>
                      <div className="mt-0.5 text-[12px] font-bold leading-snug line-clamp-2">
                        {event.title}
                      </div>
                      {event.classes?.name && (
                        <div className="mt-1 truncate text-[10px] opacity-70">{event.classes.name}</div>
                      )}
                    </button>
                  )
                })}

                {events.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f5] text-[#bbb]">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M3 10h18M8 3v4M16 3v4" />
                      </svg>
                    </div>
                    <span className="text-[11px] text-[#bbb]">Trống</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile day list */}
      <div className="space-y-3 p-4 sm:hidden">
        {(() => {
          const events = getEventsForDay(mobileActiveDay)
          if (events.length === 0) {
            return (
              <div className="rounded-2xl border border-dashed border-[#e0e0e0] bg-[#fafafa] px-4 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#ccc] shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-[#666]">Không có buổi học</p>
                <p className="mt-1 text-[12px] text-[#999]">Ngày này chưa có lịch nào được xếp.</p>
              </div>
            )
          }

          return events.map((event) => {
            const colorClass =
              colorMap[event.color_tag] || 'bg-[#f5f5f5] border-[#e8e8e8] text-[#292929]'
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEvent(event)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition hover:shadow-sm ${colorClass}`}
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-bold opacity-80">
                    {formatTime(event.start_time)} – {formatTime(event.end_time)}
                  </div>
                  <div className="mt-1 truncate text-[15px] font-extrabold">{event.title}</div>
                  {event.classes?.name && (
                    <div className="mt-0.5 text-[12px] opacity-70">Lớp: {event.classes.name}</div>
                  )}
                </div>
                <span className="shrink-0 text-[12px] font-bold text-primary">Chi tiết →</span>
              </button>
            )
          })
        })()}
      </div>

      {/* Detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setSelectedEvent(null)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-[440px] overflow-hidden rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#ffc9b8]/40 blur-3xl" />

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#888] hover:bg-[#f5f5f5]"
              aria-label="Đóng"
            >
              ✕
            </button>

            <div className="relative z-10">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  colorMap[selectedEvent.color_tag] || 'bg-[#f5f5f5] border-[#e8e8e8] text-[#666]'
                }`}
              >
                Buổi học
              </span>

              <h3 className="mt-3 text-[20px] font-extrabold leading-snug text-[#242424]">
                {selectedEvent.title}
              </h3>

              <div className="mt-5 space-y-3 text-[14px]">
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-[#888]">Thời gian</span>
                  <span className="font-semibold text-[#242424]">
                    {formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}
                    <span className="mt-0.5 block text-[12px] font-normal text-[#888]">
                      {new Date(selectedEvent.start_time).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                </div>

                {selectedEvent.classes?.name && (
                  <div className="flex gap-3">
                    <span className="w-24 shrink-0 text-[#888]">Lớp học</span>
                    <span className="font-semibold text-[#242424]">{selectedEvent.classes.name}</span>
                  </div>
                )}

                {selectedEvent.profiles?.name && (
                  <div className="flex gap-3">
                    <span className="w-24 shrink-0 text-[#888]">Giảng viên</span>
                    <span className="font-semibold text-[#242424]">{selectedEvent.profiles.name}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-[#888]">Địa điểm</span>
                  <span className="text-[#242424]">{selectedEvent.location || 'Online'}</span>
                </div>

                {selectedEvent.description && (
                  <div className="flex gap-3">
                    <span className="w-24 shrink-0 text-[#888]">Mô tả</span>
                    <span className="whitespace-pre-wrap text-[#555]">{selectedEvent.description}</span>
                  </div>
                )}
              </div>

              {selectedEvent.meeting_url && (
                <div className="mt-5 rounded-xl border border-dashed border-[#e8e8e8] bg-[#fafafa] p-3.5">
                  <p className="text-[12px] font-semibold text-[#888]">Link họp trực tuyến</p>
                  <p className="mt-1 truncate font-mono text-[12px] text-primary">
                    {selectedEvent.meeting_url}
                  </p>
                  <div className="mt-3">
                    {getMeetingStatus(selectedEvent).active ? (
                      <a
                        href={selectedEvent.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white hover:bg-brand-orangeHover"
                      >
                        Vào học ngay
                      </a>
                    ) : (
                      <div className="rounded-full bg-[#eee] px-3 py-2 text-center text-[12px] font-semibold text-[#666]">
                        {getMeetingStatus(selectedEvent).label}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isStudent && onDeleteSchedule && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSchedule(selectedEvent.id)
                    setSelectedEvent(null)
                  }}
                  className="mt-4 w-full rounded-full bg-red-50 py-2.5 text-[13px] font-bold text-red-600 transition hover:bg-red-100"
                >
                  Xóa buổi học này
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyCalendar
