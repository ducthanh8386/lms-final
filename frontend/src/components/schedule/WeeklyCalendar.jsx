import React, { useEffect, useMemo, useState } from 'react'

const colorMap = {
  blue: 'bg-[#E3F0FF] text-[#0B4A99] border-[#B6D4FE]',
  green: 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]',
  red: 'bg-[#FFEBEE] text-[#B71C1C] border-[#EF9A9A]',
  purple: 'bg-primary-container text-on-primary-container border-[#FFCCBC]',
  orange: 'bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]',
}

const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const dayNamesShort = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS_VI = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
]

const pad = (n) => String(n).padStart(2, '0')

const formatDayMonth = (date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`

const formatFullDate = (date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`

const getStartOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

const WeeklyCalendar = ({ schedules = [], isStudent = false, onDeleteSchedule, onAttendance }) => {
  const [viewMode, setViewMode] = useState('week') // week | month
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

  const startOfWeek = getStartOfWeek(currentDate)
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })

  const monthCells = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const first = new Date(year, month, 1)
    const start = getStartOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [currentDate])

  const navigateWeek = (weeks) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + weeks * 7)
    setCurrentDate(newDate)
  }

  const navigateMonth = (months) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + months, 1)
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

  const isToday = (date) => new Date().toDateString() === date.toDateString()
  const isSameDay = (a, b) => a.toDateString() === b.toDateString()
  const isSameMonth = (date) =>
    date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()

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

  // Nhãn dễ đọc: "27/02 → 08/03/2026" thay vì "27-02-08"
  const weekTitle = (() => {
    const a = daysOfWeek[0]
    const b = daysOfWeek[6]
    const sameYear = a.getFullYear() === b.getFullYear()
    const sameMonth = sameYear && a.getMonth() === b.getMonth()
    if (sameMonth) {
      return `${pad(a.getDate())} – ${pad(b.getDate())}/${pad(a.getMonth() + 1)}/${a.getFullYear()}`
    }
    if (sameYear) {
      return `${formatDayMonth(a)} → ${formatDayMonth(b)}/${a.getFullYear()}`
    }
    return `${formatFullDate(a)} → ${formatFullDate(b)}`
  })()

  const monthTitle = `${MONTHS_VI[currentDate.getMonth()]} năm ${currentDate.getFullYear()}`

  const selectedDayEvents = getEventsForDay(mobileActiveDay)

  const approvalBadge = (status) => {
    if (isStudent || !status || status === 'approved') return null
    if (status === 'pending') {
      return (
        <span className="mt-0.5 inline-block rounded bg-amber-100 px-1 text-[9px] font-bold uppercase tracking-wide text-amber-800">
          Chờ duyệt
        </span>
      )
    }
    if (status === 'rejected') {
      return (
        <span className="mt-0.5 inline-block rounded bg-red-100 px-1 text-[9px] font-bold uppercase tracking-wide text-red-700">
          Từ chối
        </span>
      )
    }
    return null
  }

  const renderEventChip = (event, compact = false) => {
    const pending = !isStudent && event.approval_status === 'pending'
    const rejected = !isStudent && event.approval_status === 'rejected'
    const colorClass = rejected
      ? 'bg-red-50 text-red-800 border-red-200 opacity-80'
      : pending
        ? 'bg-amber-50 text-amber-900 border-amber-200 opacity-90'
        : colorMap[event.color_tag] || 'bg-[#f5f5f5] border-[#e8e8e8] text-[#292929]'
    return (
      <button
        key={event.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setSelectedEvent(event)
        }}
        className={`w-full rounded-lg border text-left transition hover:shadow-sm ${colorClass} ${
          compact ? 'px-1.5 py-1' : 'rounded-xl p-2'
        }`}
      >
        <div className={`font-bold opacity-80 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {formatTime(event.start_time)}
          {!compact && ` – ${formatTime(event.end_time)}`}
        </div>
        <div
          className={`font-bold leading-snug line-clamp-2 ${compact ? 'text-[11px]' : 'mt-0.5 text-[12px]'}`}
        >
          {event.title}
        </div>
        {approvalBadge(event.approval_status)}
      </button>
    )
  }

  return (
    <div className="w-full select-none overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-[#f0f0f0] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (viewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e8e8] text-[#555] transition hover:bg-[#f5f5f5]"
              aria-label={viewMode === 'week' ? 'Tuần trước' : 'Tháng trước'}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToday}
              className="inline-flex h-9 items-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_100%)] px-4 text-[13px] font-bold text-white shadow-sm"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => (viewMode === 'week' ? navigateWeek(1) : navigateMonth(1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e8e8] text-[#555] transition hover:bg-[#f5f5f5]"
              aria-label={viewMode === 'week' ? 'Tuần sau' : 'Tháng sau'}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="ml-1 flex rounded-full border border-[#e8e8e8] bg-[#f7f7f7] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                  viewMode === 'week' ? 'bg-white text-[#242424] shadow-sm' : 'text-[#777]'
                }`}
              >
                Tuần
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                  viewMode === 'month' ? 'bg-white text-[#242424] shadow-sm' : 'text-[#777]'
                }`}
              >
                Tháng
              </button>
            </div>
          </div>

          <div className="text-left sm:text-right">
            {viewMode === 'week' ? (
              <>
                <p className="text-[15px] font-extrabold text-[#242424]">Tuần {weekTitle}</p>
                <p className="text-[12px] text-[#888]">
                  {MONTHS_VI[daysOfWeek[0].getMonth()]}
                  {daysOfWeek[0].getMonth() !== daysOfWeek[6].getMonth()
                    ? ` – ${MONTHS_VI[daysOfWeek[6].getMonth()]}`
                    : ''}{' '}
                  · Năm {daysOfWeek[6].getFullYear()}
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-extrabold text-[#242424]">{monthTitle}</p>
                <p className="text-[12px] text-[#888]">Xem lịch theo tháng · bấm ngày để xem buổi học</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== WEEK VIEW ===== */}
      {viewMode === 'week' && (
        <>
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
                  <span className="text-[10px] font-semibold uppercase opacity-80">
                    {dayNamesShort[idx]}
                  </span>
                  <span className="text-[16px] font-extrabold leading-tight">{day.getDate()}</span>
                  <span className="text-[9px] opacity-70">{pad(day.getMonth() + 1)}</span>
                  {count > 0 && (
                    <span
                      className={`mt-1 h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : 'bg-primary'}`}
                    />
                  )}
                </button>
              )
            })}
          </div>

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
                    <div className="mt-0.5 text-[10px] text-[#999]">
                      {pad(day.getMonth() + 1)}/{day.getFullYear()}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-2">
                    {events.map((event) => renderEventChip(event))}
                    {events.length === 0 && (
                      <div className="flex flex-1 flex-col items-center justify-center py-8 text-[11px] text-[#bbb]">
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-3 p-4 sm:hidden">
            {selectedDayEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#e0e0e0] bg-[#fafafa] px-4 py-12 text-center">
                <p className="text-[14px] font-semibold text-[#666]">Không có buổi học</p>
                <p className="mt-1 text-[12px] text-[#999]">
                  {formatFullDate(mobileActiveDay)} chưa có lịch.
                </p>
              </div>
            ) : (
              selectedDayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left ${
                    colorMap[event.color_tag] || 'bg-[#f5f5f5] border-[#e8e8e8]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold opacity-80">
                      {formatTime(event.start_time)} – {formatTime(event.end_time)}
                    </div>
                    <div className="mt-1 truncate text-[15px] font-extrabold">{event.title}</div>
                  </div>
                  <span className="shrink-0 text-[12px] font-bold text-primary">Chi tiết →</span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* ===== MONTH VIEW ===== */}
      {viewMode === 'month' && (
        <div className="p-3 sm:p-4">
          <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wide text-[#999]">
            {dayNamesShort.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-[#eee] bg-[#eee]">
            {monthCells.map((day, idx) => {
              const inMonth = isSameMonth(day)
              const today = isToday(day)
              const active = isSameDay(day, mobileActiveDay)
              const events = getEventsForDay(day)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMobileActiveDay(day)
                    setCurrentDate(day)
                  }}
                  className={`min-h-[72px] sm:min-h-[96px] p-1.5 text-left transition sm:p-2 ${
                    !inMonth ? 'bg-[#fafafa] text-[#ccc]' : 'bg-white text-[#242424]'
                  } ${active ? 'ring-2 ring-inset ring-primary' : ''} ${
                    today && inMonth ? 'bg-[#FFF8F5]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-extrabold ${
                        today ? 'bg-primary text-white' : ''
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {events.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                        {events.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {events.slice(0, 2).map((ev) => renderEventChip(ev, true))}
                    {events.length > 2 && (
                      <div className="text-[10px] font-semibold text-[#888]">+{events.length - 2}</div>
                    )}
                  </div>
                  <div className="mt-1 flex gap-0.5 sm:hidden">
                    {events.slice(0, 3).map((ev) => (
                      <span key={ev.id} className="h-1.5 w-1.5 rounded-full bg-primary" />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-[13px] font-bold text-[#242424]">
              Buổi học ngày {formatFullDate(mobileActiveDay)}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e0e0e0] px-4 py-6 text-center text-[13px] text-[#888]">
                Không có buổi học trong ngày này.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left ${
                      colorMap[event.color_tag] || 'bg-[#f5f5f5] border-[#e8e8e8]'
                    }`}
                  >
                    <div>
                      <div className="text-[12px] font-bold opacity-80">
                        {formatTime(event.start_time)} – {formatTime(event.end_time)}
                      </div>
                      <div className="mt-0.5 text-[14px] font-extrabold">{event.title}</div>
                      {event.classes?.name && (
                        <div className="text-[12px] opacity-70">Lớp: {event.classes.name}</div>
                      )}
                    </div>
                    <span className="text-[12px] font-bold text-primary">Chi tiết →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div
                  className={`mb-2 inline-flex rounded-lg border px-2 py-1 text-[11px] font-bold ${
                    colorMap[selectedEvent.color_tag] || 'bg-[#f5f5f5]'
                  }`}
                >
                  {formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}
                </div>
                <h3 className="text-[18px] font-extrabold text-[#242424]">{selectedEvent.title}</h3>
                <p className="mt-1 text-[13px] text-[#666]">
                  {new Date(selectedEvent.start_time).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                {!isStudent && selectedEvent.approval_status === 'pending' && (
                  <p className="mt-2 text-[12px] font-semibold text-amber-700">
                    Đang chờ Admin duyệt — học viên chưa thấy buổi này.
                  </p>
                )}
                {!isStudent && selectedEvent.approval_status === 'rejected' && (
                  <p className="mt-2 text-[12px] font-semibold text-red-600">
                    Đã bị từ chối
                    {selectedEvent.rejection_reason ? `: ${selectedEvent.rejection_reason}` : '.'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-full p-1 text-[#999] hover:bg-[#f5f5f5]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[13px] text-[#555]">
              {selectedEvent.classes?.name && (
                <div>
                  <span className="text-[#999]">Lớp: </span>
                  <span className="font-semibold text-[#242424]">{selectedEvent.classes.name}</span>
                </div>
              )}
              {selectedEvent.profiles?.name && (
                <div>
                  <span className="text-[#999]">Giáo viên: </span>
                  <span className="font-semibold text-[#242424]">{selectedEvent.profiles.name}</span>
                </div>
              )}
              <div>
                <span className="text-[#999]">Địa điểm: </span>
                <span className="text-[#242424]">{selectedEvent.location || 'Online'}</span>
              </div>
              {selectedEvent.description && (
                <div>
                  <span className="text-[#999]">Mô tả: </span>
                  <span className="whitespace-pre-wrap text-[#555]">{selectedEvent.description}</span>
                </div>
              )}
            </div>

            {selectedEvent.meeting_url && (
              <div className="mt-4 rounded-xl border border-[#eee] bg-[#fafafa] p-3">
                <div className="mb-2 truncate text-[12px] text-[#666]">{selectedEvent.meeting_url}</div>
                <div className="flex flex-wrap gap-2">
                  {getMeetingStatus(selectedEvent).active ? (
                    <a
                      href={selectedEvent.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
                    >
                      {getMeetingStatus(selectedEvent).label}
                    </a>
                  ) : (
                    <span className="rounded-full bg-[#eee] px-3 py-1.5 text-[12px] font-semibold text-[#666]">
                      {getMeetingStatus(selectedEvent).label}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!isStudent && onAttendance && selectedEvent.class_id && (
              <button
                type="button"
                onClick={() => {
                  onAttendance(selectedEvent)
                  setSelectedEvent(null)
                }}
                className="mt-4 w-full rounded-full bg-primary py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-orangeHover"
              >
                Điểm danh buổi học
              </button>
            )}
            {!isStudent && onDeleteSchedule && (
              <button
                type="button"
                onClick={() => {
                  onDeleteSchedule(selectedEvent.id)
                  setSelectedEvent(null)
                }}
                className="mt-2 w-full rounded-full bg-red-50 py-2.5 text-[13px] font-bold text-red-600 transition hover:bg-red-100"
              >
                Xóa buổi học này
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyCalendar
