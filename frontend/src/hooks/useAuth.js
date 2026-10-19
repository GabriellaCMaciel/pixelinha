import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'

/**
 * Who is signed in. `status` is "loading" until the first answer, then "ready".
 * `enabled` is false when the site has no Supabase settings, so the account
 * buttons can stay hidden instead of failing.
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(supabase ? 'loading' : 'ready')

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setStatus('ready')
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // With "Confirm email" on, Supabase answers without a session until the link is opened.
    return { needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return { user, status, enabled: Boolean(supabase), signIn, signUp, signOut }
}
