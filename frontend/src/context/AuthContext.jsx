import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch current session
    const initSession = async () => {
      const { session } = await authService.getSession()
      if (session?.user) {
        setUser(session.user)
        // Fetch profile
        const { data: userProfile } = await authService.getProfile(session.user.id)
        
        // Tối ưu: Dùng custom JWT claim làm nguồn chân lý cho role
        const jwtRole = session.user.app_metadata?.userrole
        if (jwtRole && userProfile) {
          userProfile.role = jwtRole
        }
        setProfile(userProfile)
      }
      setLoading(false)
    }

    initSession()

    // 2. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const { data: userProfile } = await authService.getProfile(session.user.id)
          
          const jwtRole = session.user.app_metadata?.userrole
          if (jwtRole && userProfile) {
            userProfile.role = jwtRole
          }
          setProfile(userProfile)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const value = {
    user,
    profile,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
