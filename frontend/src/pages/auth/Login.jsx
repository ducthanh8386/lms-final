import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { loginSchema } from '../../schemas'

const getInputClass = (hasError) =>
  `mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-3 text-[14px] text-[#242424] outline-none transition placeholder:text-[#aaa] focus:ring-2 ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-[#d2d2d2] focus:border-primary focus:ring-primary/15'
  }`

const FieldError = ({ message }) =>
  message ? <p className="mt-1.5 text-[12px] font-medium text-red-500">{message}</p> : null

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setFormError(null)

    const result = loginSchema.safeParse(form)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      })
      return
    }

    setFieldErrors({})
    setLoading(true)

    const { data: signInData, error: signInError } = await authService.signIn(
      result.data.email,
      result.data.password
    )

    if (signInError) {
      setFormError(signInError.message)
      setLoading(false)
      return
    }

    const { data: userProfile } = await authService.getProfile(signInData.user.id)
    if (userProfile?.status === 'banned') {
      setFormError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.')
      await authService.signOut()
      setLoading(false)
      return
    }

    navigate('/')
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f5f5] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#a5d8ff]/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[#ffc9b8]/45 blur-3xl" />

      <div className="relative w-full max-w-[480px]">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#666] transition hover:text-primary"
        >
          ← Về trang chủ
        </Link>

        <div className="relative overflow-hidden rounded-2xl bg-white px-6 py-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#a5d8ff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#ffc9b8]/45 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <Link
              to="/"
              className="mb-5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold text-white shadow-sm"
            >
              LMS
            </Link>

            <h1 className="text-[26px] font-extrabold leading-tight text-[#242424] sm:text-[28px]">
              Đăng nhập vào LMS
            </h1>
            <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-[#666]">
              Chào mừng bạn quay lại. Đăng nhập để tiếp tục học tập.
            </p>

            {formError && (
              <div className="mt-5 w-full rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-left text-[13px] text-red-600">
                {formError}
              </div>
            )}

            <form className="mt-7 w-full space-y-4 text-left" onSubmit={handleLogin} noValidate>
              <div>
                <label htmlFor="login-email" className="block text-[13px] font-semibold text-[#292929]">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  className={getInputClass(!!fieldErrors.email)}
                  value={form.email}
                  onChange={updateField('email')}
                  aria-invalid={!!fieldErrors.email}
                />
                <FieldError message={fieldErrors.email} />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-[13px] font-semibold text-[#292929]">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Tối thiểu 8 ký tự"
                    className={`${getInputClass(!!fieldErrors.password)} pr-11`}
                    value={form.password}
                    onChange={updateField('password')}
                    aria-invalid={!!fieldErrors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] transition hover:text-primary"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M3 3l18 18" strokeLinecap="round" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" />
                        <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7-.5 1.2-1.2 2.3-2.1 3.2M6.1 6.1C4.5 7.2 3.2 8.7 2.2 10.5c1.7 3.9 6 7 9.8 7 1.4 0 2.7-.3 3.9-.8" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <FieldError message={fieldErrors.password} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_50%,#e03e12_100%)] text-[14px] font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:brightness-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <p className="mt-7 text-[14px] text-[#292929]">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Đăng ký
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
