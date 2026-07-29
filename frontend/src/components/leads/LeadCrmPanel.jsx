import React, { useEffect, useMemo, useState } from 'react'
import {
  leadService,
  LEAD_STATUS,
  STATUS_OPTIONS,
  GOAL_OPTIONS,
} from '../../services/leadService'
import { useToast } from '../../context/ToastContext'

const labelOf = (options, value) => options.find((o) => o.value === value)?.label || value

/**
 * Shared CRM for Zoom leads (teacher or admin).
 * @param {'teacher'|'admin'} mode
 * @param {string} [teacherId] required when mode=teacher
 */
const LeadCrmPanel = ({ mode, teacherId }) => {
  const toast = useToast()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [placeFor, setPlaceFor] = useState(null) // lead
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [placing, setPlacing] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } =
      mode === 'admin'
        ? await leadService.getAllLeads()
        : await leadService.getLeadsForTeacher(teacherId)
    if (error) toast.error(error.message)
    else setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (mode === 'teacher' && !teacherId) return
    load()
  }, [mode, teacherId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leads
    return leads.filter(
      (l) =>
        l.full_name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.courses?.title?.toLowerCase().includes(q)
    )
  }, [leads, search])

  const onStatus = async (id, status) => {
    const { error } = await leadService.updateLeadStatus(id, status)
    if (error) toast.error(error.message)
    else setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
  }

  const onNotesBlur = async (id, value) => {
    const { error } = await leadService.updateLeadNotes(id, value)
    if (error) toast.error(error.message)
  }

  const openPlace = async (lead) => {
    setPlaceFor(lead)
    setSelectedClassId('')
    const { data, error } = await leadService.getClassesForCourse(lead.course_id)
    if (error) toast.error(error.message)
    setClasses(data || [])
  }

  const confirmPlace = async () => {
    if (!placeFor || !selectedClassId) return
    setPlacing(true)
    const { data, error } = await leadService.placeIntoClass(placeFor.id, selectedClassId)
    setPlacing(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Đã xếp lớp')
    setPlaceFor(null)
    if (data) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === placeFor.id
            ? {
                ...l,
                status: 'placed',
                assigned_class_id: selectedClassId,
                classes: classes.find((c) => c.id === selectedClassId)
                  ? { id: selectedClassId, name: classes.find((c) => c.id === selectedClassId).name }
                  : l.classes,
              }
            : l
        )
      )
    } else {
      load()
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Yêu cầu tư vấn</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pipeline Zoom: liên hệ → tư vấn → thanh toán → xếp lớp.
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên, SĐT, email..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
        />
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          Chưa có đăng ký tư vấn.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((lead) => {
            const st = LEAD_STATUS.find((s) => s.value === lead.status) || LEAD_STATUS[0]
            return (
              <div key={lead.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{lead.full_name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{lead.courses?.title}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <a href={`tel:${lead.phone}`} className="font-semibold text-primary">
                        {lead.phone}
                      </a>
                      {lead.email && <span>{lead.email}</span>}
                      {lead.preferred_schedule && (
                        <span>Ca mong muốn: {lead.preferred_schedule}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {labelOf(STATUS_OPTIONS, lead.current_status)} ·{' '}
                      {labelOf(GOAL_OPTIONS, lead.learning_goal)}
                      {lead.notes ? ` · Ghi chú HV: ${lead.notes}` : ''}
                    </div>
                    {lead.classes?.name && (
                      <div className="mt-1 text-xs font-semibold text-emerald-700">
                        Lớp: {lead.classes.name}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => onStatus(lead.id, e.target.value)}
                      className="rounded-lg border px-2 py-1.5 text-xs font-semibold"
                    >
                      {LEAD_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    {lead.status !== 'placed' && (
                      <button
                        type="button"
                        onClick={() => openPlace(lead)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-orangeHover"
                      >
                        Xếp lớp
                      </button>
                    )}
                  </div>
                </div>

                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-slate-500">Ghi chú tư vấn</span>
                  <textarea
                    defaultValue={lead.consultant_notes || ''}
                    onBlur={(e) => onNotesBlur(lead.id, e.target.value)}
                    rows={2}
                    placeholder="Kết quả trao đổi, học phí đã chốt..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>
              </div>
            )
          })}
        </div>
      )}

      {placeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Xếp lớp cho {placeFor.full_name}</h3>
            <p className="mt-1 text-sm text-slate-500">{placeFor.courses?.title}</p>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">— Chọn lớp Zoom —</option>
              {classes.map((c) => {
                const active = (c.class_members || []).filter((m) => m.status === 'active').length
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.schedule_label ? ` · ${c.schedule_label}` : ''} · {active}/{c.max_students} ·{' '}
                    {c.status}
                  </option>
                )
              })}
            </select>
            {classes.length === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Chưa có lớp Zoom cho khóa này. Tạo lớp tại mục Lớp học (gắn khóa Zoom) rồi quay lại xếp.
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPlaceFor(null)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!selectedClassId || placing}
                onClick={confirmPlace}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {placing ? 'Đang xếp...' : 'Xác nhận xếp lớp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeadCrmPanel
