import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { loginSchema } from '../../schemas'

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l.1.1 6.2 5.2C39.2 36.3 44 30.8 44 24c0-1.3-.1-2.5-.4-3.5z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/>
  </svg>
)

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#242424" aria-hidden>
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.8 4.7 18.8 5 18.8 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/>
  </svg>
)

const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#666]" fill="currentColor" aria-hidden>
    <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.25c-4.2 0-7.5 2.1-7.5 4.5V21h15v-2.25c0-2.4-3.3-4.5-7.5-4.5Z"/>
  </svg>
)

const methodBtnClass =
  'relative flex w-full items-center justify-center gap-3 rounded-full border border-[#d2d2d2] bg-white px-4 py-3 text-[14px] font-semibold text-[#292929] transition hover:bg-[#f5f5f5]'

const getInputClass = (hasError) =>
  `block w-full rounded-xl border bg-white px-3.5 py-3 text-[14px] text-[#242424] outline-none transition focus:ring-2 ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-[#d2d2d2] focus:border-primary focus:ring-primary/15'
  }`

const FieldError = ({ message }) =>
  message ? <p className="mt-1.5 text-[12px] font-medium text-red-500">{message}</p> : null

const LoginModal = ({ open, onClose, redirectTo = '/' }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState('methods')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep('methods')
    setFormError(null)
    setFieldErrors({})
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setLoading(false)

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const clearFieldError = (key) => {
    if (!fieldErrors[key]) return
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const finishLogin = async (userId) => {
    const { data: userProfile } = await authService.getProfile(userId)
    if (userProfile?.status === 'banned') {
      setFormError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.')
      await authService.signOut()
      setLoading(false)
      return
    }
    onClose()
    navigate(redirectTo || '/')
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setFormError(null)

    const result = loginSchema.safeParse({ email, password })
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
    await finishLogin(signInData.user.id)
  }

  const handleOAuth = async (provider) => {
    setFormError(null)
    setLoading(true)
    const { error: oauthError } = await authService.signInWithOAuth(provider, redirectTo)
    if (oauthError) {
      setFormError(oauthError.message || 'Không thể đăng nhập bằng phương thức này.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[540px] overflow-hidden rounded-2xl bg-white px-8 py-10 shadow-2xl sm:px-14 sm:py-12"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#a5d8ff]/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#ffc9b8]/50 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold text-white shadow-sm">
            LMS
          </span>

          <h2 id="login-modal-title" className="text-[26px] font-extrabold leading-tight text-[#242424] sm:text-[28px]">
            Đăng nhập vào LMS
          </h2>
          <p className="mt-3 max-w-[380px] text-[13px] leading-relaxed text-[#e11d48]">
            Mỗi người nên sử dụng riêng một tài khoản, tài khoản nhiều người sử dụng chung sẽ bị khóa.
          </p>

          {formError && (
            <div className="mt-4 w-full rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-left text-[13px] text-red-600">
              {formError}
            </div>
          )}

          {step === 'methods' ? (
            <div className="mt-7 flex w-full flex-col gap-3">
              <button type="button" className={methodBtnClass} onClick={() => handleOAuth('google')} disabled={loading}>
                <GoogleIcon />
                Đăng nhập với Google
              </button>
              <button type="button" className={methodBtnClass} onClick={() => handleOAuth('facebook')} disabled={loading}>
                <FacebookIcon />
                Đăng nhập với Facebook
              </button>
              <button type="button" className={methodBtnClass} onClick={() => handleOAuth('github')} disabled={loading}>
                <GithubIcon />
                Đăng nhập với Github
              </button>
              <button
                type="button"
                className={methodBtnClass}
                onClick={() => {
                  setFormError(null)
                  setFieldErrors({})
                  setStep('email')
                }}
              >
                <UserIcon />
                Sử dụng email / số điện thoại
              </button>
            </div>
          ) : (
            <form className="mt-7 w-full space-y-4 text-left" onSubmit={handleEmailLogin} noValidate>
              <button
                type="button"
                onClick={() => {
                  setFormError(null)
                  setFieldErrors({})
                  setStep('methods')
                }}
                className="text-sm font-medium text-[#666] hover:text-primary"
              >
                ← Quay lại
              </button>

              <div>
                <label htmlFor="modal-login-email" className="mb-1.5 block text-[13px] font-semibold text-[#292929]">
                  Email
                </label>
                <input
                  id="modal-login-email"
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder="you@email.com"
                  className={getInputClass(!!fieldErrors.email)}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearFieldError('email')
                  }}
                  aria-invalid={!!fieldErrors.email}
                />
                <FieldError message={fieldErrors.email} />
              </div>

              <div>
                <label htmlFor="modal-login-password" className="mb-1.5 block text-[13px] font-semibold text-[#292929]">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="modal-login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Tối thiểu 8 ký tự"
                    className={`${getInputClass(!!fieldErrors.password)} pr-11`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearFieldError('password')
                    }}
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
                className="mt-1 flex h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_50%,#e03e12_100%)] text-[14px] font-bold text-white transition hover:brightness-105 disabled:opacity-50"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          )}

          <p className="mt-7 text-sm text-[#292929]">
            Bạn chưa có tài khoản?{' '}
            <Link to="/register" onClick={onClose} className="font-semibold text-primary hover:underline">
              Đăng ký
            </Link>
          </p>
          <p className="mt-6 max-w-[300px] text-[12px] leading-relaxed text-[#666]">
            Việc bạn tiếp tục sử dụng trang web này đồng nghĩa bạn đồng ý với{' '}
            <span className="underline">điều khoản sử dụng</span> của chúng tôi.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
