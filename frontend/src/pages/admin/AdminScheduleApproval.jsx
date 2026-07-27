import React, { useCallback, useEffect, useState } from 'react'
import { scheduleService } from '../../services/scheduleService'
import { notificationService } from '../../services/notificationService'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'

const AdminScheduleApproval = () => {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await scheduleService.getPendingSchedules()
    if (error) toast.error('Lỗi tải lịch chờ duyệt: ' + error.message)
    setItems(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const getStudentIds = async (sched) => {
    if (sched.class_id) {
      await scheduleService.addParticipantsFromClass(sched.id, sched.class_id)
    }
    const { data } = await supabase
      .from('schedule_participants')
      .select('student_id')
      .eq('schedule_id', sched.id)
    return (data || []).map((p) => p.student_id).filter(Boolean)
  }

  const handleReview = async (sched, decision) => {
    let reason = null
    if (decision === 'rejected') {
      const input = window.prompt('Lý do từ chối (tuỳ chọn):')
      if (input === null) return
      reason = input.trim() || null
    }

    setBusyId(sched.id)
    const { error } = await scheduleService.reviewSchedule(sched.id, decision, reason)
    if (error) {
      toast.error(error.message)
      setBusyId(null)
      return
    }

    if (decision === 'approved') {
      try {
        const studentIds = await getStudentIds(sched)
        const className = sched.classes?.name || 'lớp học'
        const formattedDate = new Date(sched.start_time).toLocaleDateString('vi-VN')
        const formattedTime = new Date(sched.start_time).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })
        for (const studentId of studentIds) {
          await notificationService.createNotification(
            studentId,
            'schedule_reminder',
            `Lịch học mới: Lớp ${className}`,
            `Bạn có lịch học vào ngày ${formattedDate} lúc ${formattedTime}.`,
            sched.id,
            'schedule'
          )
        }
      } catch (e) {
        console.error(e)
      }
      if (sched.teacher_id) {
        await notificationService.createNotification(
          sched.teacher_id,
          'system',
          'Buổi học đã được duyệt',
          `“${sched.title}” đã được admin duyệt và hiện với học viên.`,
          sched.id,
          'schedule'
        )
      }
      toast.success('Đã duyệt buổi học')
    } else {
      if (sched.teacher_id) {
        await notificationService.createNotification(
          sched.teacher_id,
          'system',
          'Buổi học bị từ chối',
          `“${sched.title}” bị từ chối${reason ? `: ${reason}` : '.'}`,
          sched.id,
          'schedule'
        )
      }
      toast.success('Đã từ chối buổi học')
    }

    setItems((prev) => prev.filter((x) => x.id !== sched.id))
    setBusyId(null)
  }

  const fmt = (iso) => {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Duyệt lịch Zoom</h1>
        <p className="mt-1 text-sm text-slate-500">
          Giáo viên tạo buổi học → bạn duyệt → học viên mới thấy lịch và nhận thông báo.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
          Không có buổi học nào chờ duyệt.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((sched) => {
            const { date, time } = fmt(sched.start_time)
            const end = fmt(sched.end_time).time
            const busy = busyId === sched.id
            return (
              <li
                key={sched.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{sched.title}</h2>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Chờ duyệt
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {date} · {time} – {end}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    GV: <span className="font-medium text-slate-700">{sched.profiles?.name || '—'}</span>
                    {sched.classes?.name && (
                      <>
                        {' · '}
                        Lớp: <span className="font-medium text-slate-700">{sched.classes.name}</span>
                      </>
                    )}
                  </p>
                  {sched.meeting_url && (
                    <p className="mt-1 truncate text-xs text-blue-600">{sched.meeting_url}</p>
                  )}
                </div>
                <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReview(sched, 'approved')}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReview(sched, 'rejected')}
                    className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default AdminScheduleApproval
