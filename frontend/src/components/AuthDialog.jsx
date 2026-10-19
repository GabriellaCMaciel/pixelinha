import { useEffect, useId, useRef, useState } from 'react'
import { describeAuthError } from '../services/authErrors.js'
import './AuthDialog.css'

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select, textarea'

/** A window to sign in or create an account. `auth` comes from useAuth. */
export default function AuthDialog({ auth, onClose }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const panel = useRef(null)
  const emailField = useRef(null)
  const titleId = useId()
  const passwordId = useId()
  const hintId = useId()
  const signingUp = mode === 'signup'

  useEffect(() => {
    const opener = document.activeElement
    emailField.current?.focus()
    return () => opener?.focus?.()
  }, [])

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    // Keep Tab inside the window while it is open.
    const items = [...panel.current.querySelectorAll(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (signingUp) {
        const { needsConfirmation } = await auth.signUp(email.trim(), password)
        if (needsConfirmation) {
          setNotice('Conta criada! Enviamos uma mensagem para o seu e-mail. Toque no link dela para entrar.')
          return
        }
      } else {
        await auth.signIn(email.trim(), password)
      }
      onClose()
    } catch (caught) {
      setError(describeAuthError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={panel}
        className="auth__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <button type="button" className="auth__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <h2 id={titleId} className="auth__title">
          {signingUp ? 'Criar sua conta' : 'Entrar na sua conta'}
        </h2>
        <p className="auth__intro">
          {signingUp
            ? 'Com uma conta você guarda seus bordados e volta a eles quando quiser.'
            : 'Entre para ver e guardar seus bordados.'}
        </p>

        <form className="auth__form" onSubmit={submit}>
          <label className="auth__field">
            <span className="auth__label">E-mail</span>
            <input
              ref={emailField}
              className="auth__input"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <div className="auth__field">
            <label className="auth__label" htmlFor={passwordId}>
              Senha
            </label>
            <input
              id={passwordId}
              className="auth__input"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              required
              minLength={signingUp ? 6 : undefined}
              aria-describedby={signingUp ? hintId : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {signingUp && (
              <span id={hintId} className="auth__hint">
                Use pelo menos 6 caracteres.
              </span>
            )}
          </div>

          <label className="auth__check">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Mostrar a senha
          </label>

          {error && (
            <p className="auth__message auth__message--error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="auth__message" role="status">
              {notice}
            </p>
          )}

          <button type="submit" className="btn auth__submit" disabled={busy}>
            {busy ? 'Aguarde…' : signingUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="auth__switch">
          {signingUp ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
          <button
            type="button"
            className="auth__link"
            onClick={() => switchMode(signingUp ? 'signin' : 'signup')}
          >
            {signingUp ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>
    </div>
  )
}
