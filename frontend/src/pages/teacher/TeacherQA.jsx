import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { lessonCommentService } from '../../services/lessonCommentService'
import LessonQAPanel from '../../components/lesson/LessonQAPanel'

const TeacherQA = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await lessonCommentService.listForTeacher()
    if (error) toast.error(error.message || 'Không tải được hỏi đáp')
    else setComments(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const roots = comments.filter((c) => !c.parent_id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hỏi đáp học viên</h1>
          <p className="mt-1 text-[14px] text-slate-500">
            Tất cả bình luận trong khóa bạn được phân công (kể cả khóa miễn phí).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
        >
          Làm mới
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        </div>
      ) : roots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-[14px] text-slate-500">
          Chưa có hỏi đáp nào từ học viên.
          <p className="mt-2 text-[13px] text-slate-400">
            Khi học viên bình luận trong bài học, câu hỏi sẽ hiện tại đây để bạn trả lời.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roots.map((c) => {
            const replyCount = comments.filter((x) => x.parent_id === c.id).length
            const teacherReplied = comments.some(
              (x) => x.parent_id === c.id && x.user_id === user?.id
            )
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setPanel({
                    lessonId: c.lesson_id,
                    courseId: c.course_id,
                    lessonTitle: c.lesson_title || 'Bài học',
                    courseTitle: c.course_title,
                  })
                }
                className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {c.course_title || 'Khóa học'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      {c.lesson_title || 'Bài học'}
                    </span>
                    {teacherReplied ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        Đã trả lời
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                        Chờ trả lời
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] font-semibold text-slate-900">
                    {c.author_name || 'Học viên'}
                    <span className="ml-2 text-[12px] font-normal text-slate-400">
                      {lessonCommentService.relativeTime(c.created_at)}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-[14px] text-slate-600">{c.body}</p>
                  {replyCount > 0 && (
                    <p className="mt-1 text-[12px] text-slate-500">{replyCount} phản hồi</p>
                  )}
                </div>
                <span className="shrink-0 self-start rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-white">
                  Trả lời
                </span>
              </button>
            )
          })}
        </div>
      )}

      {panel && (
        <LessonQAPanel
          open={Boolean(panel)}
          onClose={() => {
            setPanel(null)
            load()
          }}
          lessonId={panel.lessonId}
          courseId={panel.courseId}
          lessonTitle={`${panel.courseTitle || ''} · ${panel.lessonTitle}`}
          teacherId={user?.id}
        />
      )}
    </div>
  )
}

export default TeacherQA
