import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'

const TeacherReviews = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, teacher_reply, teacher_replied_at, created_at, courses!inner(id, title, teacher_id), profiles:user_id(name)')
      .eq('courses.teacher_id', user.id)
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else {
      setRows(data || [])
      const map = {}
      for (const r of data || []) map[r.id] = r.teacher_reply || ''
      setDrafts(map)
    }
    setLoading(false)
  }, [user, toast])

  useEffect(() => {
    load()
  }, [load])

  const saveReply = async (reviewId) => {
    const reply = (drafts[reviewId] || '').trim()
    const { error } = await supabase
      .from('reviews')
      .update({
        teacher_reply: reply || null,
        teacher_replied_at: reply ? new Date().toISOString() : null,
      })
      .eq('id', reviewId)
    if (error) toast.error(error.message)
    else {
      toast.success('Đã lưu phản hồi')
      load()
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Bình luận / đánh giá</h1>
        <p className="mt-1 text-sm text-slate-500">Trả lời đánh giá học viên trên khóa video của bạn.</p>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          Chưa có đánh giá nào.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{r.profiles?.name || 'Học viên'}</p>
                  <p className="text-sm text-slate-500">{r.courses?.title}</p>
                </div>
                <div className="text-[#f5a623]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{r.comment || '—'}</p>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-slate-500">Phản hồi của bạn</span>
                <textarea
                  value={drafts[r.id] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Cảm ơn bạn đã học..."
                />
              </label>
              <button
                type="button"
                onClick={() => saveReply(r.id)}
                className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white"
              >
                Lưu phản hồi
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TeacherReviews
