import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { lessonCommentService } from '../../services/lessonCommentService'

function Avatar({ name, avatar, size = 'md' }) {
  const letter = (name || '?').charAt(0).toUpperCase()
  const box = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-sm'
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white ${box}`}
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
    <div className={depth > 0 ? 'ml-10 mt-3' : 'mt-4'}>
      <div className="flex gap-3">
        <Avatar name={comment.author_name} avatar={comment.author_avatar} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-semibold text-[#1473e6]">
              {comment.author_name || 'Người dùng'}
            </span>
            {isTeacher && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Giảng viên
              </span>
            )}
            <span className="text-[12px] text-[#999]">
              {lessonCommentService.relativeTime(comment.created_at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[#292929]">
            {comment.body}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-[12px] font-semibold">
            <button
              type="button"
              onClick={() => onToggleLike(comment)}
              className={`hover:underline ${comment.liked_by_me ? 'text-primary' : 'text-[#1473e6]'}`}
            >
              Thích{comment.like_count > 0 ? ` (${comment.like_count})` : ''}
            </button>
            {depth === 0 && (
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="text-[#1473e6] hover:underline"
              >
                Phản hồi
              </button>
            )}
            {(comment.user_id === currentUserId) && (
              <button
                type="button"
                onClick={() => onDelete(comment)}
                className="text-[#999] hover:text-red-500 hover:underline"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>
      {replies?.map((r) => (
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
    // Keep draft when reopening; only reset reply target
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
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eee] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold text-[#242424]">Hỏi đáp</h2>
            {lessonTitle && (
              <p className="truncate text-[12px] text-[#888]">{lessonTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#666] hover:bg-[#f5f5f5]"
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="border-b border-[#f0f0f0] px-4 py-4">
          {!composerOpen ? (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3 py-3 text-left hover:bg-[#f5f5f5]"
            >
              <Avatar name={displayName} avatar={profile?.avatar} size="sm" />
              <span className="text-[14px] text-[#999]">Viết bình luận của bạn...</span>
            </button>
          ) : (
            <div>
              {replyTo && (
                <p className="mb-2 text-[12px] text-[#666]">
                  Đang phản hồi{' '}
                  <span className="font-semibold text-[#1473e6]">
                    {replyTo.author_name || 'người dùng'}
                  </span>
                  .{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setReplyTo(null)}
                  >
                    Hủy trả lời
                  </button>
                </p>
              )}
              <div className="flex gap-3">
                <Avatar name={displayName} avatar={profile?.avatar} size="sm" />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="Bạn đang nghĩ gì?"
                  className="min-h-[96px] w-full resize-none rounded-xl border border-[#dbdbdb] px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false)
                    setBody('')
                    setReplyTo(null)
                  }}
                  className="rounded-full px-4 py-2 text-[13px] font-bold text-[#1473e6] hover:bg-[#f0f7ff]"
                >
                  HỦY
                </button>
                <button
                  type="button"
                  disabled={submitting || !body.trim()}
                  onClick={submit}
                  className="rounded-full bg-[#1473e6] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#0f5bbd] disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi...' : 'BÌNH LUẬN'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          <p className="sticky top-0 bg-white py-3 text-[15px] font-bold text-[#242424]">
            {comments.length} bình luận
          </p>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            </div>
          ) : roots.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-[#888]">
              Chưa có bình luận. Hãy là người đầu tiên hỏi đáp!
            </p>
          ) : (
            roots.map((c) => (
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
            ))
          )}
        </div>
      </aside>
    </>
  )
}

/** Floating pill button — F8 style */
export function LessonQAButton({ count = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-[#e8e8e8] bg-white px-4 py-2.5 text-[14px] font-bold text-primary shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.16)] md:bottom-8 md:right-8"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
      </svg>
      Hỏi đáp{count > 0 ? ` (${count})` : ''}
    </button>
  )
}
