import { useId, useState } from 'react'

const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/** One saved embroidery: its picture, title and what can be done with it. */
export default function EmbroideryCard({ item, thumbUrl, folders, onOpen, onMove, onRename, onDelete }) {
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function guard(action) {
    setBusy(true)
    try {
      await action()
      return true
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    if (!title.trim()) return
    if (await guard(() => onRename(item.id, title))) setEditing(false)
  }

  const size = item.settings?.gridWidth
  const detail = [size ? `${size} pontos de largura` : null, item.settings?.nColors ? `${item.settings.nColors} cores` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="card">
      <div className="card__picture">
        {thumbUrl ? <img src={thumbUrl} alt="" loading="lazy" /> : <span aria-hidden="true">🧵</span>}
      </div>

      <div className="card__body">
        {editing ? (
          <form className="card__edit" onSubmit={save}>
            <label className="visually-hidden" htmlFor={`${id}-title`}>
              Novo título de {item.title}
            </label>
            <input
              id={`${id}-title`}
              className="card__input"
              type="text"
              maxLength={80}
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="card__buttons">
              <button type="submit" className="btn card__small" disabled={busy}>
                Salvar
              </button>
              <button
                type="button"
                className="btn card__small card__small--plain"
                onClick={() => {
                  setEditing(false)
                  setTitle(item.title)
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <h3 className="card__title">{item.title}</h3>
        )}

        <p className="card__meta">
          {date.format(new Date(item.created_at))}
          {detail && ` · ${detail}`}
        </p>

        <div className="card__field">
          <label htmlFor={`${id}-folder`} className="card__label">
            Pasta
          </label>
          <select
            id={`${id}-folder`}
            className="card__input"
            value={item.folder_id ?? ''}
            disabled={busy}
            onChange={(event) => guard(() => onMove(item.id, event.target.value || null))}
          >
            <option value="">Sem pasta</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="card__buttons">
          <button type="button" className="btn card__small" onClick={() => onOpen(item)}>
            Abrir
          </button>
          <button
            type="button"
            className="btn card__small card__small--plain"
            aria-label={`Renomear ${item.title}`}
            onClick={() => {
              setConfirming(false)
              setEditing(true)
            }}
          >
            Renomear
          </button>
          <button
            type="button"
            className="btn card__small card__small--plain"
            aria-label={`Excluir ${item.title}`}
            onClick={() => {
              setEditing(false)
              setConfirming(true)
            }}
          >
            Excluir
          </button>
        </div>

        {confirming && (
          <div className="card__confirm" role="group" aria-label={`Confirmar exclusão de ${item.title}`}>
            <p>Excluir “{item.title}” para sempre? Isso apaga também a foto guardada.</p>
            <div className="card__buttons">
              <button
                type="button"
                className="btn card__small card__small--danger"
                disabled={busy}
                onClick={() => guard(() => onDelete(item))}
              >
                Excluir bordado
              </button>
              <button type="button" className="btn card__small card__small--plain" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}
