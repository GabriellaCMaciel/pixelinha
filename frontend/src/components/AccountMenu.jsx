import { useState } from 'react'
import { Link } from 'react-router-dom'
import { accountLabel } from '../lib/maskEmail.js'
import './AccountMenu.css'

/** The sign-in button, or who is signed in with a way to reach their embroideries and leave. */
export default function AccountMenu({ auth }) {
  const [error, setError] = useState('')

  if (!auth.enabled || auth.status === 'loading') return null

  async function leave() {
    setError('')
    try {
      await auth.signOut()
    } catch {
      setError('Não foi possível sair agora. Tente de novo.')
    }
  }

  if (auth.user) {
    const { name, masked } = accountLabel(auth.user)
    return (
      <div className="account">
        <p className="account__who">
          {name ? (
            <span className="account__email">Olá, {name}!</span>
          ) : (
            <>
              <span className="account__hello">Você entrou como</span>
              <span className="account__email">{masked}</span>
            </>
          )}
        </p>
        <Link className="btn account__button" to="/meus-bordados">
          Meus bordados
        </Link>
        <button type="button" className="btn account__button" onClick={leave}>
          Sair
        </button>
        {error && (
          <p className="account__error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="account">
      <button type="button" className="btn account__button" onClick={auth.requestLogin}>
        Entrar ou criar conta
      </button>
    </div>
  )
}
