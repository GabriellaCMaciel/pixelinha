import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from '../hooks/authContext.js'
import { useLibrary } from '../hooks/useLibrary.js'
import { saveEmbroidery, updateEmbroidery } from '../services/library.js'
import { describeLibraryError } from '../services/libraryErrors.js'
import './SavePanel.css'

const NEW_FOLDER = '__new__'
const NO_FOLDER = ''

function titleFromFile(file) {
  return (file?.name ?? '').replace(/\.[^.]+$/, '').slice(0, 80) || 'Meu bordado'
}

/** Whether `values` is the same chart as the one stored in `saved`. */
function sameSettings(a, b) {
  return ['gridWidth', 'nColors', 'ignoreBackground', 'fabricCount'].every((key) => a?.[key] === b?.[key])
}

/**
 * Step 4: keep the embroidery in the person's account, in a folder if they want.
 * Without an account it explains that signing in is needed, and offers the button.
 * `opened` is the saved embroidery this chart came from, if any.
 */
export default function SavePanel({ file, settings, ready, opened = null }) {
  const { user, enabled, status, requestLogin } = useAccount()

  if (!enabled) return null

  if (status === 'loading') return null

  if (!user) {
    return (
      <div className="save">
        <p className="save__intro">
          Para <strong>salvar este bordado, voltar a ele depois e organizar tudo em pastas</strong>, você precisa
          entrar ou criar uma conta. É grátis e leva um minuto.
        </p>
        <p className="save__note">Sem conta você continua podendo gerar o gráfico e baixar o PDF.</p>
        <button type="button" className="btn save__button" onClick={requestLogin}>
          Entrar ou criar conta
        </button>
      </div>
    )
  }

  // A different photo or a different saved embroidery starts a fresh form.
  const formKey = `${opened?.id ?? 'new'}:${file.name}:${file.size}:${file.lastModified}`
  return <SaveForm key={formKey} userId={user.id} file={file} settings={settings} ready={ready} opened={opened} />
}

function SaveForm({ userId, file, settings, ready, opened }) {
  const titleId = useId()
  const folderId = useId()
  const newFolderId = useId()
  const { folders, status, addFolder, reload } = useLibrary(userId)
  const [title, setTitle] = useState(() => opened?.title ?? titleFromFile(file))
  const [folder, setFolder] = useState(opened?.folder_id ?? NO_FOLDER)
  const [newFolder, setNewFolder] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '', savedAs: null })

  const working = state.status === 'working'
  const creating = folder === NEW_FOLDER
  const unchanged =
    opened && sameSettings(settings, opened.settings) && title.trim() === opened.title && (folder || null) === opened.folder_id

  async function resolveFolder() {
    if (!creating) return folder || null
    const created = await addFolder(newFolder)
    setFolder(created.id)
    setNewFolder('')
    return created.id
  }

  async function submit(mode) {
    if (!title.trim()) {
      setState({ status: 'error', message: 'Dê um título ao bordado para poder achá-lo depois.', savedAs: null })
      return
    }
    if (creating && !newFolder.trim()) {
      setState({ status: 'error', message: 'Digite o nome da nova pasta.', savedAs: null })
      return
    }

    setState({ status: 'working', message: '', savedAs: null })
    try {
      const targetFolder = await resolveFolder()
      const saved =
        mode === 'update'
          ? await updateEmbroidery(opened.id, { title, folderId: targetFolder, settings })
          : await saveEmbroidery({ userId, file, settings, title, folderId: targetFolder })
      setState({ status: 'done', message: '', savedAs: { title: saved.title, updated: mode === 'update' } })
    } catch (error) {
      setState({ status: 'error', message: describeLibraryError(error), savedAs: null })
    }
  }

  if (status === 'error') {
    return (
      <div className="save">
        <p className="save__message save__message--error" role="alert">
          Não foi possível carregar as suas pastas.
        </p>
        <button type="button" className="btn save__button" onClick={reload}>
          Tentar de novo
        </button>
      </div>
    )
  }

  return (
    <form
      className="save"
      onSubmit={(event) => {
        event.preventDefault()
        submit(opened ? 'update' : 'new')
      }}
    >
      <p className="save__intro">Guarde este bordado na sua conta para abrir e ajustar de novo quando quiser.</p>

      <div className="save__field">
        <label htmlFor={titleId} className="save__label">
          Título
        </label>
        <input
          id={titleId}
          className="save__input"
          type="text"
          maxLength={80}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="save__field">
        <label htmlFor={folderId} className="save__label">
          Pasta
        </label>
        <select
          id={folderId}
          className="save__input"
          value={folder}
          disabled={status === 'loading'}
          onChange={(event) => setFolder(event.target.value)}
        >
          <option value={NO_FOLDER}>Sem pasta</option>
          {folders.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          <option value={NEW_FOLDER}>＋ Criar uma pasta nova…</option>
        </select>
      </div>

      {creating && (
        <div className="save__field">
          <label htmlFor={newFolderId} className="save__label">
            Nome da nova pasta
          </label>
          <input
            id={newFolderId}
            className="save__input"
            type="text"
            maxLength={60}
            placeholder="Ex.: Presentes"
            value={newFolder}
            onChange={(event) => setNewFolder(event.target.value)}
          />
        </div>
      )}

      {state.status === 'error' && (
        <p className="save__message save__message--error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'done' && (
        <p className="save__message" role="status">
          {state.savedAs.updated ? 'Alterações salvas' : 'Bordado salvo'}: “{state.savedAs.title}”.{' '}
          <Link to="/meus-bordados">Ver meus bordados</Link>
        </p>
      )}

      {opened ? (
        <div className="save__buttons">
          <button type="submit" className="btn save__button" disabled={!ready || working || unchanged}>
            {working ? 'Salvando…' : 'Salvar alterações'}
          </button>
          <button
            type="button"
            className="btn save__button save__button--plain"
            disabled={!ready || working}
            onClick={() => submit('new')}
          >
            Salvar como novo
          </button>
        </div>
      ) : (
        <button type="submit" className="btn save__button" disabled={!ready || working}>
          {working ? 'Salvando…' : 'Salvar bordado'}
        </button>
      )}
    </form>
  )
}
