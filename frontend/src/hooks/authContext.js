import { createContext, useContext } from 'react'

export const NO_AUTH = {
  user: null,
  status: 'ready',
  enabled: false,
  signIn: async () => {},
  signUp: async () => ({ needsConfirmation: false }),
  signOut: async () => {},
  requestLogin: () => {},
}

export const AuthContext = createContext(NO_AUTH)

/** The signed-in person, as given by the nearest AuthProvider (nobody, without one). */
export function useAccount() {
  return useContext(AuthContext)
}
