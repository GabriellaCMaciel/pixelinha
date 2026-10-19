import { useCallback, useMemo, useState } from 'react'
import AuthDialog from '../components/AuthDialog.jsx'
import { AuthContext } from './authContext.js'
import { useAuth } from './useAuth.js'

/**
 * Gives every page the signed-in person and a way to ask them to sign in.
 * It also owns the sign-in window, so there is only ever one.
 */
export function AuthProvider({ children }) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const requestLogin = useCallback(() => setOpen(true), [])
  const value = useMemo(() => ({ ...auth, requestLogin }), [auth, requestLogin])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {open && !auth.user && <AuthDialog auth={auth} onClose={() => setOpen(false)} />}
    </AuthContext.Provider>
  )
}
