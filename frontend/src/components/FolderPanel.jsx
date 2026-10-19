import { useId, useState } from 'react'

/**
 * The list of folders: pick one to filter, create new ones, rename and delete.
 * `counts` maps a folder id to how many embroideries it holds; `total` and `loose`
 * are the numbers for "all" and "without folder". Actions return a promise; a
 * failure is shown by the parent through `onError`.
 */
export default function FolderPanel({ folders, counts, total, loose, selected, onSelect, onCreate, onRename, onDelete }) {
  const nameId = useId()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirming, setConfirming] = useState(null)
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

  async function create(event) {
    event.preventDefault()
    if (!name.trim()) return
    if (await guard(() => onCreate(name))) setName('')
  }

  async function rename(event, folder) {
    event.preventDefault()
    if (!editName.trim()) return
    if (await guard(() => onRename(folder.id, editName))) setEditing(null)
  }

  async function remove(folder) {
    if (await guard(() => onDelete(folder.id))) setConfirming(null)
  }

  const choice = (value, label, count) => (
    <li key={value}>
      <button
        type="button"
        className={`folders__pick${selected === value ? ' folders__pick--on' : ''}`}
        aria-pressed={selected === value}
        onClick={() => onSelect(value)}
      >
        <span className="folders__name">{label}</span>
        <span className="folders__count">{count}</span>
      </button>
    </li>
  )

  return (
    <section className="folders" aria-labelledby={`${nameId}-title`}>
      <h2 id={`${nameId}-title`} className="folders__title">
        Pastas
      </h2>

      <ul className="folders__list">
        {choice('all', 'Todos os bordados', total)}
        {choice('none', 'Sem pasta', loose)}

        {folders.map((folder) => (
          <li key={folder.id} className="folders__item">
            {editing === folder.id ? (
              <form className="folders__edit" onSubmit={(event) => rename(event, folder)}>
                <label className="visually-hidden" htmlFor={`${nameId}-${folder.id}`}>
                  Novo nome da pasta {folder.name}
                </label>
                <input
                  id={`${nameId}-${folder.id}`}
                  className="folders__input"
                  type="text"
                  maxLength={60}
                  autoFocus
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
                <div className="folders__buttons">
                  <button type="submit" className="btn folders__small" disabled={busy}>
                    Salvar
                  </button>
                  <button type="button" className="btn folders__small folders__small--plain" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  className={`folders__pick${selected === folder.id ? ' folders__pick--on' : ''}`}
                  aria-pressed={selected === folder.id}
                  onClick={() => onSelect(folder.id)}
                >
                  <span className="folders__name">{folder.name}</span>
                  <span className="folders__count">{counts[folder.id] ?? 0}</span>
                </button>
                <div className="folders__buttons">
                  <button
                    type="button"
                    className="btn folders__small folders__small--plain"
                    aria-label={`Renomear a pasta ${folder.name}`}
                    onClick={() => {
                      setConfirming(null)
                      setEditing(folder.id)
                      setEditName(folder.name)
                    }}
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    className="btn folders__small folders__small--plain"
                    aria-label={`Excluir a pasta ${folder.name}`}
                    onClick={() => {
                      setEditing(null)
                      setConfirming(folder.id)
                    }}
                  >
                    Excluir
                  </button>
                </div>
                {confirming === folder.id && (
                  <div className="folders__confirm" role="group" aria-label={`Confirmar exclusão da pasta ${folder.name}`}>
                    <p>
                      Excluir a pasta “{folder.name}”? Os bordados dentro dela <strong>não serão apagados</strong>:
                      eles ficam em “Sem pasta”.
                    </p>
                    <div className="folders__buttons">
                      <button type="button" className="btn folders__small folders__small--danger" disabled={busy} onClick={() => remove(folder)}>
                        Excluir pasta
                      </button>
                      <button type="button" className="btn folders__small folders__small--plain" onClick={() => setConfirming(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <form className="folders__new" onSubmit={create}>
        <label className="folders__label" htmlFor={nameId}>
          Nova pasta
        </label>
        <div className="folders__row">
          <input
            id={nameId}
            className="folders__input"
            type="text"
            maxLength={60}
            placeholder="Ex.: Presentes"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn folders__small" disabled={busy || !name.trim()}>
            Criar
          </button>
        </div>
      </form>
    </section>
  )
}
