import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import LoginModal from '../components/auth/LoginModal'

const AuthModalContext = createContext(null)

export const AuthModalProvider = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [redirectTo, setRedirectTo] = useState('/')

  const openLogin = useCallback((to = '/') => {
    setRedirectTo(to)
    setOpen(true)
  }, [])

  const closeLogin = useCallback(() => {
    setOpen(false)
  }, [])

  const value = useMemo(
    () => ({ open, openLogin, closeLogin, redirectTo }),
    [open, openLogin, closeLogin, redirectTo]
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <LoginModal
        open={open}
        onClose={closeLogin}
        redirectTo={redirectTo}
      />
    </AuthModalContext.Provider>
  )
}

export const useAuthModal = () => {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider')
  return ctx
}
