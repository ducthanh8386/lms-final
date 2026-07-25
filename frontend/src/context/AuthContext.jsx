import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initSession = async () => {
      const { session } = await authService.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data: userProfile } = await authService.getProfile(session.user.id)
        const jwtRole = session.user.app_metadata?.userrole
        if (jwtRole && userProfile) userProfile.role = jwtRole
        setProfile(userProfile)
      }
      setLoading(false)
    }

    initSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') return

      if (session?.user) {
        setUser(session.user)
        const { data: userProfile } = await authService.getProfile(session.user.id)
        const jwtRole = session.user.app_metadata?.userrole
        if (jwtRole && userProfile) userProfile.role = jwtRole
        setProfile(userProfile)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return null
    const { data: userProfile } = await authService.getProfile(user.id)
    if (userProfile) {
      const jwtRole = user.app_metadata?.userrole
      if (jwtRole) userProfile.role = jwtRole
      setProfile(userProfile)
    }
    return userProfile
  }, [user])

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
