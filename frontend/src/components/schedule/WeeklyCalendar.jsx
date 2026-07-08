import React, { useState, useEffect } from 'react'

const colorMap = {
  blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200',
  purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'
}

const WeeklyCalendar = ({ schedules = [], isStudent = false, onConfirmAttendance, onDeleteSchedule }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [mobileActiveDay, setMobileActiveDay] = useState(new Date())

  // Đồng bộ ngày hoạt động trên mobile khi thay đổi tuần chính
  useEffect(() => {
    setMobileActiveDay(currentDate)
  }, [currentDate])

  const getStartOfWeek = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lấy Thứ Hai
    return new Date(d.setDate(diff))
  }

  const startOfWeek = getStartOfWeek(currentDate)
  const daysOfWeek = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    daysOfWeek.push(day)
  }

  const navigateWeek = (weeks) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + weeks * 7)
    setCurrentDate(newDate)
  }

  const navigateDay = (days) => {
    const newDate = new Date(mobileActiveDay)
    newDate.setDate(mobileActiveDay.getDate() + days)
    setMobileActiveDay(newDate)
    
    // Nếu ngày mobile nhảy ra ngoài tuần hiện tại, đồng bộ lại currentDate của lịch tuần
    const mondayOfNewDate = getStartOfWeek(newDate)
    const mondayOfCurrentDate = getStartOfWeek(currentDate)
    if (mondayOfNewDate.toDateString() !== mondayOfCurrentDate.toDateString()) {
      setCurrentDate(newDate)
    }
  }

  const getEventsForDay = (day) => {
    return schedules.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.getFullYear() === day.getFullYear() &&
             eventDate.getMonth() === day.getMonth() &&
             eventDate.getDate() === day.getDate()
    })
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const formatDateShort = (date) => {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const isToday = (date) => {
    return new Date().toDateString() === date.toDateString()
  }

  // Xem đường link meeting có thể click không (trước 30 phút buổi học và trong buổi học)
  const getMeetingStatus = (event) => {
    if (!event.meeting_url) return { active: false, label: 'Không có URL họp' }
    const startTime = new Date(event.start_time)
    const endTime = new Date(event.end_time)
    const now = new Date()
    
    // Kiểm tra xem thời điểm hiện tại cách giờ học <= 30 phút
    const startOffsetMs = 30 * 60 * 1000
    const isActive = (startTime.getTime() - now.getTime() <= startOffsetMs) && (now.getTime() < endTime.getTime())
    
    if (now.getTime() >= endTime.getTime()) {
      return { active: false, label: 'Buổi học đã kết thúc' }
    }
    if (isActive) {
      return { active: true, label: 'Vào học ngay' }
    }
    return { active: false, label: 'Link mở trước 30p học' }
  }

  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

  return (
    <div className="w-full select-none bg-white rounded-xl border shadow-sm p-4 text-left">
      {/* Lịch Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b pb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigateWeek(-1)}
            className="rounded border bg-white p-2 text-slate-600 hover:bg-slate-50 text-xs font-bold"
          >
            &larr; Tuần trước
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="rounded border bg-white px-3 py-2 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
          >
            Hôm nay
          </button>
          <button 
            onClick={() => navigateWeek(1)}
            className="rounded border bg-white p-2 text-slate-600 hover:bg-slate-50 text-xs font-bold"
          >
            Tuần sau &rarr;
          </button>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-slate-800">
          Tuần: {formatDateShort(daysOfWeek[0])} - {formatDateShort(daysOfWeek[6])} (Năm {daysOfWeek[0].getFullYear()})
        </h3>
      </div>

      {/* MOBILE VIEW NAVIGATION */}
      <div className="flex justify-between items-center sm:hidden mb-4 bg-slate-50 p-2 rounded border">
        <button onClick={() => navigateDay(-1)} className="p-1 text-slate-600 font-bold">&larr;</button>
        <span className="text-sm font-bold text-slate-800">
          {dayNames[mobileActiveDay.getDay() === 0 ? 6 : mobileActiveDay.getDay() - 1]} - {formatDateShort(mobileActiveDay)}
          {isToday(mobileActiveDay) && <span className="ml-2 text-xs bg-accent text-white px-1.5 py-0.5 rounded font-medium">Hôm nay</span>}
        </span>
        <button onClick={() => navigateDay(1)} className="p-1 text-slate-600 font-bold">&rarr;</button>
      </div>

      {/* CALENDAR WEEK GRID (DESKTOP) */}
      <div className="hidden sm:grid grid-cols-7 gap-3 divide-x divide-slate-100">
        {daysOfWeek.map((day, idx) => {
          const events = getEventsForDay(day)
          const today = isToday(day)
          
          return (
            <div key={idx} className={`px-2 min-h-[300px] flex flex-col ${today ? 'bg-accent/5 rounded-lg border border-accent/20' : ''}`}>
              <div className="text-center pb-2 border-b mb-3">
                <div className="text-xs font-bold text-slate-400 uppercase">{dayNames[idx]}</div>
                <div className={`text-lg font-black ${today ? 'text-accent' : 'text-slate-800'}`}>{day.getDate()}</div>
              </div>
              
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[350px] pr-0.5 scrollbar-thin">
                {events.map(event => {
                  const colorClass = colorMap[event.color_tag] || 'bg-slate-50 border-slate-200 text-slate-700'
                  return (
                    <div 
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-2 rounded-lg border cursor-pointer text-xs transition duration-200 shadow-sm ${colorClass}`}
                    >
                      <div className="font-bold mb-0.5">{formatTime(event.start_time)} - {formatTime(event.end_time)}</div>
                      <div className="font-bold line-clamp-1">{event.title}</div>
                      {event.classes && <div className="text-[10px] opacity-75 truncate">Lớp: {event.classes.name}</div>}
                    </div>
                  )
                })}
                {events.length === 0 && (
                  <div className="text-[10px] text-slate-400 italic text-center py-6">Trống</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MOBILE DAY VIEW */}
      <div className="sm:hidden block">
        {(() => {
          const events = getEventsForDay(mobileActiveDay)
          return (
            <div className="space-y-3">
              {events.map(event => {
                const colorClass = colorMap[event.color_tag] || 'bg-slate-50 border-slate-200 text-slate-700'
                return (
                  <div 
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-xl border cursor-pointer text-sm shadow-sm transition duration-200 flex justify-between items-center ${colorClass}`}
                  >
                    <div>
                      <div className="font-bold text-xs mb-1">{formatTime(event.start_time)} - {formatTime(event.end_time)}</div>
                      <div className="font-extrabold text-slate-900">{event.title}</div>
                      {event.classes && <div className="text-xs opacity-75 mt-0.5">Lớp: {event.classes.name}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-semibold text-accent underline">Chi tiết &rarr;</span>
                    </div>
                  </div>
                )
              })}
              {events.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic border rounded-xl bg-slate-50/50">
                  Không có buổi học nào vào ngày này.
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border text-left">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              ✕
            </button>
            
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 border ${
              colorMap[selectedEvent.color_tag] || 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              Lịch Học
            </span>
            
            <h3 className="text-xl font-extrabold text-slate-900 mb-2 leading-snug">{selectedEvent.title}</h3>
            
            <div className="space-y-3 my-4 border-y py-4 text-sm text-slate-700">
              <div className="flex gap-2">
                <span className="font-semibold text-slate-500 w-24">Thời gian:</span>
                <span className="font-bold text-slate-800">
                  {formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)} ({new Date(selectedEvent.start_time).toLocaleDateString('vi-VN')})
                </span>
              </div>

              {selectedEvent.classes && (
                <div className="flex gap-2">
                  <span className="font-semibold text-slate-500 w-24">Lớp học:</span>
                  <span className="font-bold text-slate-800">{selectedEvent.classes.name}</span>
                </div>
              )}

              {selectedEvent.profiles?.name && (
                <div className="flex gap-2">
                  <span className="font-semibold text-slate-500 w-24">Giảng viên:</span>
                  <span className="font-bold text-slate-800">{selectedEvent.profiles.name}</span>
                </div>
              )}

              <div className="flex gap-2">
                <span className="font-semibold text-slate-500 w-24">Địa điểm:</span>
                <span className="text-slate-800">{selectedEvent.location || 'Online'}</span>
              </div>

              {selectedEvent.description && (
                <div className="flex gap-2">
                  <span className="font-semibold text-slate-500 w-24">Mô tả:</span>
                  <span className="text-slate-600 whitespace-pre-wrap">{selectedEvent.description}</span>
                </div>
              )}

              {selectedEvent.meeting_url && (
                <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-lg border border-dashed">
                  <span className="text-xs font-semibold text-slate-500">Đường dẫn cuộc họp trực tuyến:</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-accent truncate max-w-[250px]">{selectedEvent.meeting_url}</span>
                    {getMeetingStatus(selectedEvent).active ? (
                      <a 
                        href={selectedEvent.meeting_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="rounded bg-accent px-3 py-1 text-xs font-bold text-white hover:bg-purple-600 transition text-center whitespace-nowrap"
                      >
                        Vào học ngay
                      </a>
                    ) : (
                      <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-500 font-semibold whitespace-nowrap">
                        {getMeetingStatus(selectedEvent).label}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>



            {/* Điều khiển Giáo viên */}
            {!isStudent && onDeleteSchedule && (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    onDeleteSchedule(selectedEvent.id)
                    setSelectedEvent(null)
                  }}
                  className="rounded bg-red-50 hover:bg-red-100 px-4 py-2 text-xs font-bold text-red-600 transition"
                >
                  Xóa buổi học này
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyCalendar
