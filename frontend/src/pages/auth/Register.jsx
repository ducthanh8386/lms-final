import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { registerSchema } from '../../schemas'
import { useToast } from '../../context/ToastContext'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.")
      setLoading(false)
      return
    }
    
    // Zod Validation
    const validationResult = registerSchema.safeParse({ name, email, password })
    if (!validationResult.success) {
      setError(validationResult.error.errors[0].message)
      setLoading(false)
      return
    }
    
    const { data, error } = await authService.signUp(email, password, name)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (!data?.session) {
      toast.success("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.")
      navigate('/login')
    } else {
      toast.success("Đăng ký tài khoản thành công!")
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
            Tạo tài khoản mới
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-slate-700">Họ và tên</label>
              <input
                id="register-name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="register-email"
                type="email"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <input
                id="register-password"
                type="password"
                required
                minLength="8"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-700">Nhập lại mật khẩu</label>
              <input
                id="register-confirm-password"
                type="password"
                required
                minLength="8"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </div>
        </form>
        
        <p className="mt-2 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-accent hover:text-purple-600">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
