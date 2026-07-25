import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { registerSchema } from '../../schemas'
import { useToast } from '../../context/ToastContext'
import { useAuthModal } from '../../context/AuthModalContext'

const baseInputClass =
  'mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-3 text-[14px] text-[#242424] outline-none transition placeholder:text-[#aaa] focus:ring-2'

const getInputClass = (hasError) =>
  `${baseInputClass} ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-[#d2d2d2] focus:border-primary focus:ring-primary/15'
  }`

const FieldError = ({ message }) =>
  message ? <p className="mt-1.5 text-[12px] font-medium text-red-500">{message}</p> : null

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { openLogin } = useAuthModal()

  const updateField = (key) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setFormError(null)

    const result = registerSchema.safeParse(form)
    if (!result.success) {
      // Báo lỗi tất cả field cùng lúc
      const errors = result.error.flatten().fieldErrors
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      })
      return
    }

    setFieldErrors({})
    setLoading(true)

    const { name, email, password } = result.data
    const { data, error: signUpError } = await authService.signUp(email, password, name)

    if (signUpError) {
      setFormError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data?.session) {
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.')
      navigate('/')
      openLogin('/')
    } else {
      toast.success('Đăng ký tài khoản thành công!')
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f5f5] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#a5d8ff]/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[#ffc9b8]/45 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

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
              Đăng ký tài khoản LMS
            </h1>
            <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-[#666]">
              Tạo tài khoản để học tập, theo dõi tiến độ và tham gia khóa học.
            </p>

            {formError && (
              <div className="mt-5 w-full rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-left text-[13px] text-red-600">
                {formError}
              </div>
            )}

            <form className="mt-7 w-full space-y-4 text-left" onSubmit={handleRegister} noValidate>
              <div>
                <label htmlFor="register-name" className="block text-[13px] font-semibold text-[#292929]">
                  Họ và tên
                </label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  className={getInputClass(!!fieldErrors.name)}
                  value={form.name}
                  onChange={updateField('name')}
                  aria-invalid={!!fieldErrors.name}
                />
                <FieldError message={fieldErrors.name} />
              </div>

              <div>
                <label htmlFor="register-email" className="block text-[13px] font-semibold text-[#292929]">
                  Email
                </label>
                <input
                  id="register-email"
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
                <label htmlFor="register-password" className="block text-[13px] font-semibold text-[#292929]">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              <div>
                <label htmlFor="register-confirm-password" className="block text-[13px] font-semibold text-[#292929]">
                  Nhập lại mật khẩu
                </label>
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  className={getInputClass(!!fieldErrors.confirmPassword)}
                  value={form.confirmPassword}
                  onChange={updateField('confirmPassword')}
                  aria-invalid={!!fieldErrors.confirmPassword}
                />
                <FieldError message={fieldErrors.confirmPassword} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(90deg,#ff8f3f_0%,#f05123_50%,#e03e12_100%)] text-[14px] font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:brightness-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </button>
            </form>

            <p className="mt-7 text-[14px] text-[#292929]">
              Bạn đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  navigate('/')
                  openLogin('/')
                }}
                className="font-semibold text-primary hover:underline"
              >
                Đăng nhập
              </button>
            </p>

            <p className="mt-5 max-w-[320px] text-[12px] leading-relaxed text-[#888]">
              Việc bạn tiếp tục sử dụng trang web này đồng nghĩa bạn đồng ý với{' '}
              <span className="underline">điều khoản sử dụng</span> của chúng tôi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
