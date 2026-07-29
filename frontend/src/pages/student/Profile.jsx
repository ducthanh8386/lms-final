import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { studentService } from '../../services/studentService'
import { supabase } from '../../lib/supabaseClient'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const LEVEL_COLORS = [
  'bg-[#ebedf0]',
  'bg-[#9be9a8]',
  'bg-[#40c463]',
  'bg-[#30a14e]',
  'bg-[#216e39]',
]

function getActivityData(enrollments) {
  const map = {}
  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  for (const en of enrollments) {
    if (!en.created_at) continue
    const d = new Date(en.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map[key] = (map[key] || 0) + 1
  }

  const weeks = []
  let current = new Date(oneYearAgo)
  current.setDate(current.getDate() - current.getDay() + 1)

  while (current <= now) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(current)
      date.setDate(date.getDate() + d)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      week.push({
        date: key,
        count: map[key] || 0,
        future: date > now,
      })
    }
    weeks.push(week)
    current.setDate(current.getDate() + 7)
  }

  return weeks
}

function getLevel(count) {
  if (count === 0) return 0
  if (count <= 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

const ActivityHeatmap = ({ enrollments }) => {
  const weeks = useMemo(() => getActivityData(enrollments), [enrollments])
  const totalActiveDays = useMemo(() => {
    const set = new Set()
    for (const w of weeks) for (const d of w) if (d.count > 0) set.add(d.date)
    return set.size
  }, [weeks])

  const monthHeaders = useMemo(() => {
    const headers = []
    let lastMonth = -1
    weeks.forEach((week, i) => {
      const m = new Date(week[0].date).getMonth()
      if (m !== lastMonth) {
        headers.push({ label: MONTH_LABELS[m], col: i })
        lastMonth = m
      }
    })
    return headers
  }, [weeks])

  return (
    <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[#242424]">
          {totalActiveDays} hoạt động trong 12 tháng qua
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5">
          <div className="flex gap-0.5 pl-8">
            {monthHeaders.map((h, i) => (
              <span
                key={i}
                className="text-[10px] text-[#888]"
                style={{ position: 'relative', left: `${h.col * 13}px` }}
              >
                {h.label}
              </span>
            ))}
          </div>

          <div className="flex gap-[1px]">
            <div className="flex flex-col gap-[3px] pr-2 pt-0.5">
              {DAY_LABELS.map((label, i) => (
                <span key={i} className="flex h-[11px] items-center text-[9px] text-[#888]">
                  {label}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`h-[11px] w-[11px] rounded-[2px] ${
                        day.future ? 'bg-transparent' : LEVEL_COLORS[getLevel(day.count)]
                      }`}
                      title={day.future ? '' : `${day.date}: ${day.count} hoạt động`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#888]">
            <span>Ít hơn</span>
            {LEVEL_COLORS.map((c, i) => (
              <div key={i} className={`h-[10px] w-[10px] rounded-[2px] ${c}`} />
            ))}
            <span>Nhiều hơn</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const Profile = () => {
  const { user, profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [stats, setStats] = useState({ courses: 0, joined: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await studentService.getMyEnrollments(user.id)
      if (data) setEnrollments(data)

      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)

      const joinedDate = new Date(user.created_at || Date.now())
      const now = new Date()
      const diffYears = now.getFullYear() - joinedDate.getFullYear()
      const diffMonths = now.getMonth() - joinedDate.getMonth() + diffYears * 12

      setStats({
        courses: count || 0,
        joined: diffMonths < 1
          ? 'vừa tham gia'
          : diffMonths < 12
          ? `${diffMonths} tháng trước`
          : `${Math.floor(diffMonths / 12)} năm trước`,
      })
      setLoading(false)
    }
    load()
  }, [user])

  if (!user) return null

  const displayName = profile?.name || user.email?.split('@')[0] || 'Người dùng'
  const handle = '@' + (user.email?.split('@')[0] || 'user')
  const letter = displayName.charAt(0).toUpperCase()

  const rainbowRing =
    'bg-[conic-gradient(from_180deg_at_50%_50%,#f05123_0deg,#fbbf24_90deg,#22c55e_180deg,#3b82f6_270deg,#f05123_360deg)]'

  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#f5f5f5]">
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Left — Avatar & Info */}
          <div className="flex flex-col items-center lg:w-[280px] lg:shrink-0">
            <div className={`rounded-full p-[3px] ${rainbowRing}`}>
              <div className="flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full bg-primary text-4xl font-bold text-white ring-4 ring-white">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  letter
                )}
              </div>
            </div>

            <h1 className="mt-4 text-center text-[22px] font-extrabold text-[#242424]">
              {displayName}
            </h1>
            <p className="text-[14px] text-[#808080]">{handle}</p>

            <div className="mt-4 flex items-center gap-4 text-[13px] text-[#666]">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#999]" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span><b>{stats.courses}</b> khóa học</span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[13px] text-[#888]">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#999]" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span>Tham gia từ {stats.joined}</span>
            </div>

            <Link
              to="/settings"
              className="mt-5 w-full rounded-xl border border-[#dbdbdb] bg-white px-4 py-2.5 text-center text-[13px] font-bold text-[#242424] transition hover:bg-[#f0f0f0]"
            >
              Chỉnh sửa hồ sơ
            </Link>
          </div>

          {/* Right — Content */}
          <div className="min-w-0 flex-1 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
              </div>
            ) : (
              <ActivityHeatmap enrollments={enrollments} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
