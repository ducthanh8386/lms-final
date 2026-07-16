import React, { useEffect, useState, useCallback } from 'react'
import { classService } from '../../services/classService'
import { scheduleService } from '../../services/scheduleService'
import { notificationService } from '../../services/notificationService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { scheduleSchema } from '../../schemas'
import TeacherTabs from '../../components/teacher/TeacherTabs'
import WeeklyCalendar from '../../components/schedule/WeeklyCalendar'

const ScheduleManage = () => {
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [schedules, setSchedules] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  // State Modal Tạo Buổi Học
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    class_id: '',
    start_time: '',
    end_time: '',
    meeting_url: '',
    location: '',
    recurrence_type: 'none',
    recurrence_days: [], // [0,1,2...]
    recurrence_end_date: '',
    color_tag: 'blue'
  })
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState(null)

  // Fetch lịch (lấy khoảng rộng +/- 12 tháng để thoải mái chuyển đổi tuần)
  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    const today = new Date()
    const startRange = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString()
    const endRange = new Date(today.getFullYear() + 1, today.getMonth(), 1).toISOString()
    
    const { data, error } = await scheduleService.getTeacherSchedules(startRange, endRange)
    if (error) {
      toast.error("Lỗi tải lịch dạy: " + error.message)
    } else if (data) {
      setSchedules(data)
    }
    setLoading(false)
  }, [toast])

  const fetchClasses = useCallback(async () => {
    const { data } = await classService.getTeacherClasses()
    if (data) setClasses(data)
  }, [])

  useEffect(() => {
    if (user) {
      fetchSchedules()
      fetchClasses()
    }
  }, [user, fetchSchedules, fetchClasses])

  const handleDeleteSchedule = async (id) => {
    if (!(await confirm("Bạn có chắc chắn muốn xóa buổi học này khỏi lịch dạy không?"))) return

    const { error } = await scheduleService.deleteSchedule(id)
    if (error) {
      toast.error("Lỗi xóa buổi học: " + error.message)
    } else {
      toast.success("Đã xóa buổi học!")
      fetchSchedules()
    }
  }

  const handleDayCheckbox = (dayValue) => {
    setFormData(prev => {
      const days = [...prev.recurrence_days]
      const idx = days.indexOf(dayValue)
      if (idx > -1) {
        days.splice(idx, 1)
      } else {
        days.push(dayValue)
      }
      return { ...prev, recurrence_days: days }
    })
  }

  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    setValidationError(null)

    // Validate Zod
    const payload = {
      title: formData.title,
      class_id: formData.class_id || null,
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location || undefined,
      meeting_url: formData.meeting_url || undefined,
      recurrence_type: formData.recurrence_type,
      recurrence_days: formData.recurrence_type === 'weekly' ? formData.recurrence_days : undefined,
      recurrence_end_date: formData.recurrence_type === 'weekly' ? formData.recurrence_end_date : undefined,
      color_tag: formData.color_tag
    }

    const result = scheduleSchema.safeParse(payload)
    if (!result.success) {
      setValidationError(result.error.errors[0].message)
      setSaving(false)
      return
    }

    // Call service tạo lịch
    const { data: createdSchedules, error: createErr } = await scheduleService.createSchedule(payload)
    
    if (createErr) {
      toast.error("Lỗi tạo buổi học: " + createErr.message)
      setSaving(false)
      return
    }

    toast.success("Đã thêm buổi học mới thành công!")
    setShowModal(false)

    // Thực hiện gán học viên và gửi thông báo trong nền để không chặn UI
    const handleBackgroundTasks = async () => {
      try {
        if (formData.class_id && createdSchedules) {
          const scheduleList = Array.isArray(createdSchedules) ? createdSchedules : [createdSchedules]
          
          for (const sched of scheduleList) {
            if (!sched || !sched.id) continue
            // Gán học viên trong lớp
            const { data: participants, error: partErr } = await scheduleService.addParticipantsFromClass(sched.id, formData.class_id)
            if (partErr) {
              console.error("Lỗi gán học viên vào lịch học:", partErr)
              continue
            }
            
            // Gửi thông báo cho từng học sinh
            if (participants && participants.length > 0) {
              const selectedClass = classes.find(c => c.id === formData.class_id)
              const className = selectedClass ? selectedClass.name : 'lớp học'
              const formattedDate = new Date(sched.start_time).toLocaleDateString('vi-VN')
              const formattedTime = new Date(sched.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

              for (const part of participants) {
                if (!part.student_id) continue
                try {
                  await notificationService.createNotification(
                    part.student_id,
                    'schedule_reminder',
                    `Lịch học mới: Lớp ${className}`,
                    `Bạn có lịch học mới vào ngày ${formattedDate} lúc ${formattedTime}.`,
                    sched.id,
                    'schedule'
                  )
                } catch (notifErr) {
                  console.error("Gửi thông báo thất bại:", notifErr)
                }
              }
            }
          }
        }
      } catch (bgErr) {
        console.error("Lỗi tác vụ nền (gán học viên/gửi thông báo):", bgErr)
      }
    }

    // Chạy tác vụ nền không đồng bộ
    handleBackgroundTasks()

    // Reset Form & Reload
    setFormData({
      title: '',
      class_id: '',
      start_time: '',
      end_time: '',
      meeting_url: '',
      location: '',
      recurrence_type: 'none',
      recurrence_days: [],
      recurrence_end_date: '',
      color_tag: 'blue'
    })
    fetchSchedules()
    setSaving(false)
  }

  const daysLabels = [
    { value: 1, label: 'T2' },
    { value: 2, label: 'T3' },
    { value: 3, label: 'T4' },
    { value: 4, label: 'T5' },
    { value: 5, label: 'T6' },
    { value: 6, label: 'T7' },
    { value: 0, label: 'CN' }
  ]

  const colorOptions = [
    { value: 'blue', label: 'Xanh dương', class: 'bg-blue-500' },
    { value: 'green', label: 'Xanh lá', class: 'bg-green-500' },
    { value: 'red', label: 'Đỏ', class: 'bg-red-500' },
    { value: 'purple', label: 'Tím', class: 'bg-purple-500' },
    { value: 'orange', label: 'Cam', class: 'bg-orange-500' }
  ]

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 text-left bg-slate-50 min-h-screen">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Lịch Dạy</h1>
          <p className="text-slate-500">Xem và phân bổ lịch dạy kèm, cuộc họp Zoom/Meet của bạn.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-purple-600 transition shadow-sm"
        >
          + Thêm buổi học
        </button>
      </header>

      <TeacherTabs />

      {loading ? (
        <div className="h-96 w-full rounded-xl bg-white border border-slate-200 animate-pulse flex items-center justify-center text-slate-400">
          Đang tải thời khóa biểu...
        </div>
      ) : (
        <WeeklyCalendar 
          schedules={schedules} 
          isStudent={false} 
          onDeleteSchedule={handleDeleteSchedule} 
        />
      )}

      {/* Modal Thêm Buổi Học */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border text-left my-8">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-slate-900">Thêm Buổi Học Mới</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              {validationError && (
                <div className="rounded bg-red-50 p-3 text-sm text-red-600 font-medium">{validationError}</div>
              )}

              <div>
                <label htmlFor="schedule-title" className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề buổi học *</label>
                <input 
                  id="schedule-title"
                  type="text" 
                  required 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
                  placeholder="Ví dụ: Toán lớp 10A - Đại số chương 2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="schedule-class" className="block text-sm font-medium text-slate-700 mb-1">Gán vào Lớp học</label>
                  <select 
                    id="schedule-class"
                    value={formData.class_id}
                    onChange={e => setFormData({...formData, class_id: e.target.value})}
                    className="w-full rounded-md border p-2 bg-white focus:border-accent focus:outline-none text-sm text-slate-700"
                  >
                    <option value="">-- Chọn lớp học (tùy chọn) --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Màu nhãn lịch</label>
                  <div className="flex gap-2 items-center mt-1.5">
                    {colorOptions.map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setFormData({...formData, color_tag: opt.value})}
                        className={`h-6 w-6 rounded-full border ${opt.class} ${formData.color_tag === opt.value ? 'ring-2 ring-offset-2 ring-slate-800' : 'opacity-70'}`}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="schedule-start" className="block text-sm font-medium text-slate-700 mb-1">Giờ bắt đầu *</label>
                  <input 
                    id="schedule-start"
                    type="datetime-local" 
                    required 
                    value={formData.start_time}
                    onChange={e => setFormData({...formData, start_time: e.target.value})}
                    className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label htmlFor="schedule-end" className="block text-sm font-medium text-slate-700 mb-1">Giờ kết thúc *</label>
                  <input 
                    id="schedule-end"
                    type="datetime-local" 
                    required 
                    value={formData.end_time}
                    onChange={e => setFormData({...formData, end_time: e.target.value})}
                    className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="schedule-meeting" className="block text-sm font-medium text-slate-700 mb-1">Zoom / Google Meet URL</label>
                  <input 
                    id="schedule-meeting"
                    type="url" 
                    value={formData.meeting_url}
                    onChange={e => setFormData({...formData, meeting_url: e.target.value})}
                    className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
                <div>
                  <label htmlFor="schedule-location" className="block text-sm font-medium text-slate-700 mb-1">Địa điểm / Phòng học</label>
                  <input 
                    id="schedule-location"
                    type="text" 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
                    placeholder="VD: Phòng A3 hoặc Online"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-bold text-slate-800 mb-1">Chế độ lặp lại</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input 
                      type="radio" 
                      name="recurrence_type" 
                      value="none"
                      checked={formData.recurrence_type === 'none'}
                      onChange={e => setFormData({...formData, recurrence_type: e.target.value})}
                    />
                    Không lặp lại
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input 
                      type="radio" 
                      name="recurrence_type" 
                      value="weekly"
                      checked={formData.recurrence_type === 'weekly'}
                      onChange={e => setFormData({...formData, recurrence_type: e.target.value})}
                    />
                    Lặp hàng tuần
                  </label>
                </div>

                {formData.recurrence_type === 'weekly' && (
                  <div className="mt-4 p-4 rounded-lg bg-slate-50 border space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chọn ngày trong tuần</label>
                      <div className="flex gap-2 justify-between">
                        {daysLabels.map(day => {
                          const isChecked = formData.recurrence_days.includes(day.value)
                          return (
                            <button
                              type="button"
                              key={day.value}
                              onClick={() => handleDayCheckbox(day.value)}
                              className={`h-9 w-9 rounded-lg border text-xs font-bold transition ${isChecked ? 'bg-accent border-accent text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lặp đến ngày</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.recurrence_end_date}
                        onChange={e => setFormData({...formData, recurrence_end_date: e.target.value})}
                        className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm bg-white text-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-purple-600 disabled:opacity-50 text-sm"
                >
                  {saving ? 'Đang tạo lịch...' : 'Tạo buổi học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleManage
