import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { loginSchema } from '../../schemas'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Zod Validation
    const validationResult = loginSchema.safeParse({ email, password })
    if (!validationResult.success) {
      setError(validationResult.error.errors[0].message)
      setLoading(false)
      return
    }
    
    const { data: signInData, error: signInError } = await authService.signIn(email, password)
    
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      // Kiểm tra xem tài khoản có bị khóa không
      const { data: userProfile } = await authService.getProfile(signInData.user.id)
      if (userProfile && userProfile.status === 'banned') {
        setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.")
        await authService.signOut()
        setLoading(false)
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
            Đăng nhập
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="login-email"
                type="email"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <input
                id="login-password"
                type="password"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
        
        <p className="mt-2 text-center text-sm text-slate-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-accent hover:text-purple-600">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
