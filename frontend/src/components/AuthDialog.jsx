import { useEffect, useId, useRef, useState } from 'react'
import { LEGAL } from '../lib/legalInfo.js'
import {
  normalizeEmail,
  passwordChecks,
  validateConfirmation,
  validateEmail,
  validateNewPassword,
} from '../lib/validation.js'
import { describeAuthError } from '../services/authErrors.js'
import './AuthDialog.css'

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select, textarea'

function Field({ id, label, hint, error, children }) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  return (
    <div className="auth__field">
      <label className="auth__label" htmlFor={id}>
        {label}
      </label>
      {children({
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined,
      })}
      {hint && (
        <span id={hintId} className="auth__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="auth__error">
          {error}
        </span>
      )}
    </div>
  )
}

/** A window to sign in or create an account. `auth` comes from useAuth. */
export default function AuthDialog({ auth, onClose }) {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const panel = useRef(null)
  const emailField = useRef(null)
  const id = useId()
  const signingUp = mode === 'signup'
  const checks = passwordChecks(password)

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
    setErrors({})
    setError('')
    setNotice('')
  }

  function validate() {
    const found = { email: validateEmail(email) }
    if (signingUp) {
      found.password = validateNewPassword(password, email)
      found.confirmation = validateConfirmation(password, confirmation)
      if (!accepted) found.accepted = 'Para criar a conta, marque que você leu e concorda.'
    } else if (!password) {
      found.password = 'Digite a sua senha.'
    }
    const filled = Object.fromEntries(Object.entries(found).filter(([, message]) => message))
    setErrors(filled)
    return filled
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    const problems = validate()
    const firstProblem = ['email', 'password', 'confirmation', 'accepted'].find((key) => problems[key])
    if (firstProblem) {
      panel.current.querySelector(`[data-field="${firstProblem}"]`)?.focus()
      return
    }

    setBusy(true)
    try {
      const clean = normalizeEmail(email)
      if (signingUp) {
        const { needsConfirmation } = await auth.signUp(clean, password, name, {
          termsAcceptedAt: new Date().toISOString(),
          termsVersion: LEGAL.version,
        })
        if (needsConfirmation) {
          setNotice('Conta criada! Enviamos uma mensagem para o seu e-mail. Toque no link dela para entrar.')
          return
        }
      } else {
        await auth.signIn(clean, password)
      }
      onClose()
    } catch (caught) {
      setError(describeAuthError(caught))
    } finally {
      setBusy(false)
    }
  }

  const passwordType = showPassword ? 'text' : 'password'

  return (
    <div className="auth" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={panel}
        className="auth__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
      >
        <button type="button" className="auth__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <h2 id={`${id}-title`} className="auth__title">
          {signingUp ? 'Criar sua conta' : 'Entrar na sua conta'}
        </h2>
        <p className="auth__intro">
          {signingUp
            ? 'Com uma conta você guarda seus bordados, organiza em pastas e volta a eles quando quiser.'
            : 'Entre para ver, guardar e organizar seus bordados.'}
        </p>

        <form className="auth__form" onSubmit={submit} noValidate>
          {signingUp && (
            <Field id={`${id}-name`} label="Como podemos te chamar? (opcional)">
              {(aria) => (
                <input
                  {...aria}
                  id={`${id}-name`}
                  className="auth__input"
                  type="text"
                  name="name"
                  autoComplete="given-name"
                  maxLength={40}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              )}
            </Field>
          )}

          <Field id={`${id}-email`} label="E-mail" error={errors.email}>
            {(aria) => (
              <input
                {...aria}
                ref={emailField}
                id={`${id}-email`}
                data-field="email"
                className="auth__input"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </Field>

          <Field id={`${id}-password`} label="Senha" error={errors.password}>
            {(aria) => (
              <input
                {...aria}
                id={`${id}-password`}
                data-field="password"
                className="auth__input"
                type={passwordType}
                name="password"
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>

          {signingUp && (
            <ul className="auth__rules" aria-label="O que a senha precisa ter">
              {checks.map((check) => (
                <li key={check.id} className={check.ok ? 'auth__rule auth__rule--ok' : 'auth__rule'}>
                  <span aria-hidden="true">{check.ok ? '✓' : '•'}</span> {check.label}
                  <span className="visually-hidden">{check.ok ? ' (feito)' : ' (falta)'}</span>
                </li>
              ))}
            </ul>
          )}

          {signingUp && (
            <Field id={`${id}-confirm`} label="Repita a senha" error={errors.confirmation}>
              {(aria) => (
                <input
                  {...aria}
                  id={`${id}-confirm`}
                  data-field="confirmation"
                  className="auth__input"
                  type={passwordType}
                  name="confirmation"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              )}
            </Field>
          )}

          <label className="auth__check">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Mostrar a senha
          </label>

          {signingUp && (
            <div className="auth__consent">
              <label className="auth__check auth__check--top">
                <input
                  type="checkbox"
                  data-field="accepted"
                  checked={accepted}
                  aria-invalid={errors.accepted ? 'true' : undefined}
                  aria-describedby={errors.accepted ? `${id}-accepted-error` : undefined}
                  onChange={(event) => setAccepted(event.target.checked)}
                />
                <span>
                  Li e concordo com os{' '}
                  <a href="/termos" target="_blank" rel="noopener noreferrer">
                    Termos de Uso
                  </a>
                  , a{' '}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer">
                    Política de Privacidade
                  </a>{' '}
                  e a{' '}
                  <a href="/cookies" target="_blank" rel="noopener noreferrer">
                    Política de Cookies
                  </a>
                  .
                </span>
              </label>
              {errors.accepted && (
                <span id={`${id}-accepted-error`} className="auth__error">
                  {errors.accepted}
                </span>
              )}
            </div>
          )}

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

        {!signingUp && (
          <p className="auth__legal">
            Ao entrar, você concorda com os{' '}
            <a href="/termos" target="_blank" rel="noopener noreferrer">
              Termos de Uso
            </a>{' '}
            e a{' '}
            <a href="/privacidade" target="_blank" rel="noopener noreferrer">
              Política de Privacidade
            </a>
            .
          </p>
        )}

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
