import { useId, useState } from 'react'

const WORD = 'EXCLUIR'

/** Deleting the account and everything saved in it, behind a deliberate confirmation. */
export default function DeleteAccount({ onDelete }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm(event) {
    event.preventDefault()
    setBusy(true)
    setFailed(false)
    try {
      await onDelete()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <section className="danger" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="danger__title">
        Excluir minha conta
      </h2>
      <p>
        Apaga a sua conta, as pastas, os bordados e as fotos guardadas. <strong>Não dá para desfazer.</strong> Se
        quiser, baixe antes o PDF dos bordados de que você gosta.
      </p>

      {!open ? (
        <button type="button" className="btn danger__button danger__button--plain" onClick={() => setOpen(true)}>
          Quero excluir minha conta
        </button>
      ) : (
        <form className="danger__form" onSubmit={confirm}>
          <label htmlFor={`${id}-word`} className="danger__label">
            Para confirmar, digite {WORD} aqui:
          </label>
          <input
            id={`${id}-word`}
            className="danger__input"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          {failed && (
            <p className="danger__error" role="alert">
              Não foi possível excluir a conta agora. Tente de novo em instantes.
            </p>
          )}
          <div className="danger__buttons">
            <button
              type="submit"
              className="btn danger__button"
              disabled={busy || typed.trim().toUpperCase() !== WORD}
            >
              {busy ? 'Excluindo…' : 'Excluir tudo para sempre'}
            </button>
            <button
              type="button"
              className="btn danger__button danger__button--plain"
              onClick={() => {
                setOpen(false)
                setTyped('')
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
