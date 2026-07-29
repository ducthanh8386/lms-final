import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { lessonCommentService } from '../../services/lessonCommentService'

function Avatar({ name, avatar, size = 'md' }) {
  const letter = (name || '?').charAt(0).toUpperCase()
  const box =
    size === 'xs'
      ? 'h-7 w-7 text-[10px]'
      : size === 'sm'
        ? 'h-8 w-8 text-[11px]'
        : 'h-9 w-9 text-[12px]'
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[#e03e12] font-bold text-white ring-2 ring-white ${box}`}
    >
      {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : letter}
    </span>
  )
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  teacherId,
  onReply,
  onToggleLike,
  onDelete,
  depth = 0,
}) {
  const isTeacher = teacherId && comment.user_id === teacherId
  return (
    <div className={depth > 0 ? 'ml-9 mt-3 border-l-2 border-[#f0f0f0] pl-3' : ''}>
      <div className="flex gap-2.5">
        <Avatar name={comment.author_name} avatar={comment.author_avatar} size={depth > 0 ? 'xs' : 'sm'} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[13px] font-bold text-[#242424]">
              {comment.author_name || 'Người dùng'}
            </span>
            {isTeacher && (
              <span className="rounded-md bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
                GV
              </span>
            )}
            <span className="text-[11px] text-[#a3a3a3]">
              {lessonCommentService.relativeTime(comment.created_at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.55] text-[#444]">
            {comment.body}
          </p>
          <div className="mt-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleLike(comment)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold transition hover:bg-[#f5f5f5] ${
                comment.liked_by_me ? 'text-primary' : 'text-[#757575]'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={comment.liked_by_me ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              {comment.like_count > 0 ? comment.like_count : 'Thích'}
            </button>
            {depth === 0 && (
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="rounded-md px-1.5 py-1 text-[12px] font-semibold text-[#757575] transition hover:bg-[#f5f5f5] hover:text-[#242424]"
              >
                Phản hồi
              </button>
            )}
            {comment.user_id === currentUserId && (
              <button
                type="button"
                onClick={() => onDelete(comment)}
                className="rounded-md px-1.5 py-1 text-[12px] font-semibold text-[#bdbdbd] transition hover:bg-red-50 hover:text-red-500"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>
      {replies?.length > 0 && (
        <div className="mt-1 space-y-0">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              replies={[]}
              currentUserId={currentUserId}
              teacherId={teacherId}
              onReply={onReply}
              onToggleLike={onToggleLike}
              onDelete={onDelete}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LessonQAPanel({
  open,
  onClose,
  lessonId,
  courseId,
  lessonTitle,
  teacherId = null,
}) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const draftKey = `lms_qa_draft:${lessonId || 'none'}`
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [body, setBody] = useState(() => {
    try {
      return sessionStorage.getItem(draftKey) || ''
    } catch {
      return ''
    }
  })
  const [replyTo, setReplyTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [composerOpen, setComposerOpen] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem(draftKey))
    } catch {
      return false
    }
  })

  const load = useCallback(async () => {
    if (!lessonId || !open) return
    setLoading(true)
    const { data, error } = await lessonCommentService.listByLesson(lessonId)
    if (error) toast.error(error.message || 'Không tải được hỏi đáp')
    else setComments(data || [])
    setLoading(false)
  }, [lessonId, open, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    try {
      if (body.trim()) sessionStorage.setItem(draftKey, body)
      else sessionStorage.removeItem(draftKey)
    } catch {
      /* ignore */
    }
  }, [body, draftKey])

  useEffect(() => {
    if (!open) return
    setReplyTo(null)
  }, [open, lessonId])

  const roots = useMemo(() => {
    const rootsList = comments.filter((c) => !c.parent_id)
    const byParent = new Map()
    for (const c of comments) {
      if (!c.parent_id) continue
      if (!byParent.has(c.parent_id)) byParent.set(c.parent_id, [])
      byParent.get(c.parent_id).push(c)
    }
    return rootsList.map((c) => ({ ...c, replies: byParent.get(c.id) || [] }))
  }, [comments])

  const submit = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để bình luận')
      return
    }
    const trimmed = body.trim()
    if (!trimmed) {
      toast.error('Nhập nội dung bình luận')
      return
    }
    setSubmitting(true)
    const { error } = await lessonCommentService.create({
      lessonId,
      courseId,
      userId: user.id,
      body: trimmed,
      parentId: replyTo?.id || null,
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message || 'Không gửi được bình luận')
      return
    }
    setBody('')
    setReplyTo(null)
    setComposerOpen(false)
    try {
      sessionStorage.removeItem(draftKey)
    } catch {
      /* ignore */
    }
    await load()
  }

  const onToggleLike = async (comment) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập')
      return
    }
    const { error } = await lessonCommentService.toggleLike(
      comment.id,
      user.id,
      Boolean(comment.liked_by_me)
    )
    if (error) {
      toast.error(error.message || 'Không thao tác được')
      return
    }
    await load()
  }

  const onDelete = async (comment) => {
    if (!window.confirm('Xóa bình luận này?')) return
    const { error } = await lessonCommentService.remove(comment.id)
    if (error) {
      toast.error(error.message || 'Không xóa được')
      return
    }
    await load()
  }

  if (!open) return null

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Bạn'

  return (
    <>
      <button
        type="button"
        aria-label="Đóng hỏi đáp"
        className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[380px] flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)] sm:max-w-[400px]"
        style={{
          fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
          animation: 'slideInRight 0.22s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-[#f0f0f0] px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-extrabold leading-tight text-[#242424]">Hỏi đáp</h2>
                {lessonTitle && (
                  <p className="mt-0.5 truncate text-[12px] text-[#888]">{lessonTitle}</p>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#888] transition hover:bg-[#f5f5f5] hover:text-[#242424]"
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Composer */}
        <div className="border-b border-[#f0f0f0] px-4 py-3">
          {!composerOpen ? (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-2xl border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5 text-left transition hover:border-[#e0e0e0] hover:bg-[#f5f5f5]"
            >
              <Avatar name={displayName} avatar={profile?.avatar} size="xs" />
              <span className="text-[13px] text-[#a3a3a3]">Viết câu hỏi hoặc bình luận...</span>
            </button>
          ) : (
            <div className="rounded-2xl border border-[#ebebeb] bg-[#fafafa] p-3">
              {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-[#666]">
                  <span>
                    Đang trả lời{' '}
                    <b className="text-primary">{replyTo.author_name || 'người dùng'}</b>
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-[#999] hover:text-[#242424]"
                    onClick={() => setReplyTo(null)}
                  >
                    Hủy
                  </button>
                </div>
              )}
              <div className="flex gap-2.5">
                <Avatar name={displayName} avatar={profile?.avatar} size="xs" />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Bạn muốn hỏi gì?"
                  className="min-h-[72px] w-full resize-none rounded-xl border-0 bg-white px-3 py-2 text-[13px] leading-relaxed text-[#242424] outline-none ring-1 ring-[#e8e8e8] placeholder:text-[#bdbdbd] focus:ring-primary/40"
                />
              </div>
              <div className="mt-2.5 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false)
                    setBody('')
                    setReplyTo(null)
                    try {
                      sessionStorage.removeItem(draftKey)
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="rounded-full px-3.5 py-1.5 text-[12px] font-bold text-[#757575] transition hover:bg-[#f0f0f0]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submitting || !body.trim()}
                  onClick={submit}
                  className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-brand-orangeHover disabled:opacity-45"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          <div className="sticky top-0 z-[1] -mx-4 border-b border-[#f5f5f5] bg-white/95 px-4 py-2.5 backdrop-blur-sm">
            <p className="text-[13px] font-bold text-[#242424]">
              {comments.length}{' '}
              <span className="font-semibold text-[#888]">bình luận</span>
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : roots.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f5] text-[#bbb]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                </svg>
              </span>
              <p className="text-[13px] font-semibold text-[#666]">Chưa có thảo luận</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#a3a3a3]">
                Hãy là người đầu tiên đặt câu hỏi về bài học này.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-3">
              {roots.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  replies={c.replies}
                  currentUserId={user?.id}
                  teacherId={teacherId}
                  onReply={(item) => {
                    setReplyTo(item)
                    setComposerOpen(true)
                  }}
                  onToggleLike={onToggleLike}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

/** Compact floating pill — sits above mobile bottom nav */
export function LessonQAButton({ count = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-[#eee] bg-white pl-3.5 pr-4 text-[13px] font-bold text-primary shadow-[0_6px_20px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(240,81,35,0.18)] active:scale-[0.98] md:bottom-7 md:right-7"
      style={{ fontFamily: '"Be Vietnam Pro", system-ui, sans-serif' }}
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      Hỏi đáp
    </button>
  )
}
