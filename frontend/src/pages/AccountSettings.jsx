import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabaseClient'

const SECTIONS = [
  {
    group: 'Tài khoản',
    items: [
      { id: 'personal', label: 'Thông tin cá nhân', icon: 'user' },
      { id: 'security', label: 'Mật khẩu và bảo mật', icon: 'lock' },
    ],
  },
]

const Icon = ({ name }) => {
  if (name === 'lock') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  )
}

const FieldRow = ({ label, value, onEdit, avatar }) => (
  <button
    type="button"
    onClick={onEdit}
    className="flex w-full items-center gap-4 border-b border-[#f0f0f0] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#fafafa]"
  >
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-bold text-[#242424]">{label}</p>
      <p className="mt-0.5 truncate text-[14px] text-[#666]">{value || 'Chưa cập nhật'}</p>
    </div>
    {avatar && (
      <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary text-sm font-bold text-white">
        {avatar}
      </span>
    )}
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#bbb]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 6 6 6-6 6" />
    </svg>
  </button>
)

const AccountSettings = () => {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('tab') === 'security' ? 'security' : 'personal'

  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setName(profile?.name || '')
    setAvatarUrl(profile?.avatar || '')
  }, [profile])

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Người dùng'
  const letter = displayName.charAt(0).toUpperCase()
  const email = profile?.email || user?.email || ''

  const setTab = (id) => {
    setEditing(null)
    setSearchParams(id === 'personal' ? {} : { tab: id })
  }

  const saveName = async () => {
    if (!user) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Tên không được để trống')
      return
    }
    setSaving(true)
    const { error } = await authService.updateProfile(user.id, { name: trimmed })
    if (error) toast.error(error.message)
    else {
      await refreshProfile()
      toast.success('Đã cập nhật họ tên')
      setEditing(null)
    }
    setSaving(false)
  }

  const saveAvatarUrl = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await authService.updateProfile(user.id, {
      avatar: avatarUrl.trim() || null,
    })
    if (error) toast.error(error.message)
    else {
      await refreshProfile()
      toast.success('Đã cập nhật ảnh đại diện')
      setEditing(null)
    }
    setSaving(false)
  }

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
      })
      if (upErr) {
        // Fallback: nếu bucket chưa có, dùng object URL tạm không persist — báo lỗi rõ
        toast.error('Không tải được ảnh. Thử dán URL ảnh hoặc tạo bucket "avatars" trên Storage.')
        setUploading(false)
        return
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl
      setAvatarUrl(url)
      const { error } = await authService.updateProfile(user.id, { avatar: url })
      if (error) toast.error(error.message)
      else {
        await refreshProfile()
        toast.success('Đã cập nhật ảnh đại diện')
        setEditing(null)
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi tải ảnh')
    }
    setUploading(false)
  }

  const savePassword = async (e) => {
    e.preventDefault()
    const email = profile?.email || user?.email
    if (!email) {
      toast.error('Không tìm thấy email tài khoản')
      return
    }
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại')
      return
    }
    if (password.length < 6) {
      toast.error('Mật khẩu mới tối thiểu 6 ký tự')
      return
    }
    if (password !== confirm) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    if (currentPassword === password) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại')
      return
    }
    setSaving(true)
    const { error } = await authService.changePassword(email, currentPassword, password)
    if (error) toast.error(error.message)
    else {
      toast.success('Đã đổi mật khẩu')
      setCurrentPassword('')
      setPassword('')
      setConfirm('')
    }
    setSaving(false)
  }

  const avatarPreview = useMemo(() => {
    if (profile?.avatar) {
      return <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
    }
    return letter
  }, [profile?.avatar, letter])

  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#f0f0f0]">
      <div className="mx-auto flex min-h-[calc(100vh-66px)] max-w-[1100px] flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="relative border-b border-[#e5e5e5] bg-[#f5f5f5] lg:w-[300px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[#666] hover:bg-[#e8e8e8] lg:right-4 lg:top-4"
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <div className="px-5 pb-4 pt-6">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-[11px] font-extrabold text-white">
                LMS
              </span>
            </div>
            <h1 className="text-[20px] font-extrabold text-[#242424]">Cài đặt tài khoản</h1>
            <p className="mt-1 text-[13px] leading-relaxed text-[#666]">
              Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.
            </p>
          </div>

          <nav className="px-3 pb-6">
            {SECTIONS.map((group) => (
              <div key={group.group} className="mb-4">
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-[#999]">
                  {group.group}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = section === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition ${
                          active
                            ? 'bg-[#292929] text-white'
                            : 'text-[#555] hover:bg-[#ebebeb]'
                        }`}
                      >
                        <Icon name={item.icon} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
          {section === 'personal' && (
            <>
              <header className="mb-6">
                <h2 className="text-[26px] font-extrabold text-[#242424]">Thông tin cá nhân</h2>
                <p className="mt-1 text-[14px] text-[#666]">
                  Quản lý thông tin cá nhân của bạn.
                </p>
              </header>

              <div className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">
                <FieldRow
                  label="Họ và tên"
                  value={profile?.name}
                  onEdit={() => setEditing('name')}
                />
                <FieldRow
                  label="Email"
                  value={email}
                  onEdit={() => toast.info('Email đăng ký không thể thay đổi tại đây')}
                />
                <FieldRow
                  label="Ảnh đại diện"
                  value={profile?.avatar ? 'Đã cập nhật' : 'Chưa có ảnh'}
                  onEdit={() => setEditing('avatar')}
                  avatar={avatarPreview}
                />
              </div>

              {editing === 'name' && (
                <div className="mt-4 rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-[15px] font-bold text-[#242424]">Cập nhật họ và tên</h3>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mb-3 w-full rounded-xl border border-[#dbdbdb] px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    placeholder="Họ và tên"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveName}
                      className="rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-orangeHover disabled:opacity-50"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#666] hover:bg-[#f5f5f5]"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {editing === 'avatar' && (
                <div className="mt-4 rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-[15px] font-bold text-[#242424]">Cập nhật ảnh đại diện</h3>
                  <label className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#dbdbdb] px-4 py-6 hover:border-primary/40">
                    <span className="text-[13px] font-semibold text-[#242424]">
                      {uploading ? 'Đang tải...' : 'Chọn ảnh từ máy'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploading}
                      onChange={handleAvatarFile}
                    />
                  </label>
                  <p className="mb-2 text-[12px] text-[#999]">Hoặc dán URL ảnh:</p>
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="mb-3 w-full rounded-xl border border-[#dbdbdb] px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveAvatarUrl}
                      className="rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-orangeHover disabled:opacity-50"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu URL'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#666] hover:bg-[#f5f5f5]"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {section === 'security' && (
            <>
              <header className="mb-6">
                <h2 className="text-[26px] font-extrabold text-[#242424]">Mật khẩu và bảo mật</h2>
                <p className="mt-1 text-[14px] text-[#666]">Đổi mật khẩu đăng nhập của bạn.</p>
              </header>

              <form
                onSubmit={savePassword}
                className="max-w-lg space-y-4 rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-sm sm:p-6"
              >
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-[#242424]">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#dbdbdb] px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-[#242424]">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#dbdbdb] px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-[#242424]">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-[#dbdbdb] px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-orangeHover disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-[13px] text-[#999]">
            <Link to="/" className="font-semibold text-primary hover:underline">
              ← Về trang chủ
            </Link>
          </p>
        </main>
      </div>
    </div>
  )
}

export default AccountSettings
