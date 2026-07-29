import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { authService } from '../services/authService'

const AuthContext = createContext()

function sameUser(a, b) {
  return Boolean(a?.id && b?.id && a.id === b.id)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef(null)
  const initializedRef = useRef(false)

  const applyProfile = useCallback(async (sessionUser, { force = false } = {}) => {
    if (!sessionUser?.id) {
      userIdRef.current = null
      setUser(null)
      setProfile(null)
      return
    }

    const uid = sessionUser.id
    const unchanged = userIdRef.current === uid

    setUser((prev) => (sameUser(prev, sessionUser) ? prev : sessionUser))
    userIdRef.current = uid

    if (unchanged && !force) return

    const { data: userProfile } = await authService.getProfile(uid)
    if (userIdRef.current !== uid) return

    if (userProfile) {
      const jwtRole = sessionUser.app_metadata?.userrole
      if (jwtRole) userProfile.role = jwtRole
    }
    setProfile((prev) => {
      if (
        prev &&
        userProfile &&
        prev.id === userProfile.id &&
        prev.role === userProfile.role &&
        prev.name === userProfile.name &&
        prev.avatar_url === userProfile.avatar_url &&
        prev.status === userProfile.status
      ) {
        return prev
      }
      return userProfile
    })
  }, [])

  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      const { session } = await authService.getSession()
      if (!mounted) return
      await applyProfile(session?.user || null, { force: true })
      initializedRef.current = true
      if (mounted) setLoading(false)
    }

    initSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refresh / duplicate bootstrap must not remount the app tree
      if (event === 'TOKEN_REFRESHED') return
      if (event === 'INITIAL_SESSION' && initializedRef.current) return

      // Same user signing in again (common when returning to a tab) — keep state
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        session?.user &&
        userIdRef.current === session.user.id
      ) {
        setUser((prev) => (sameUser(prev, session.user) ? prev : session.user))
        setLoading(false)
        return
      }

      void (async () => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          await applyProfile(null, { force: true })
        } else if (event === 'USER_UPDATED') {
          await applyProfile(session.user, { force: true })
        } else {
          await applyProfile(session.user, { force: userIdRef.current !== session.user.id })
        }
        if (mounted) setLoading(false)
      })()
    })

    // Pause token refresh while tab hidden — avoids noisy recover/SIGNED_IN on return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mounted = false
      subscription?.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [applyProfile])

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
