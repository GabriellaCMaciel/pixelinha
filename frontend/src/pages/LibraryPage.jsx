import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DeleteAccount from '../components/DeleteAccount.jsx'
import EmbroideryCard from '../components/EmbroideryCard.jsx'
import FolderPanel from '../components/FolderPanel.jsx'
import { useAccount } from '../hooks/authContext.js'
import { useLibrary } from '../hooks/useLibrary.js'
import { deleteAccount } from '../services/library.js'
import { describeLibraryError } from '../services/libraryErrors.js'
import './LibraryPage.css'

function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · PixeLinha`
    return () => {
      document.title = previous
    }
  }, [title])
}

function Message({ title, children, action }) {
  return (
    <main className="library library--message">
      <h1 className="library__title">{title}</h1>
      <p className="library__lead">{children}</p>
      {action}
    </main>
  )
}

export default function LibraryPage() {
  const { user, status, enabled, requestLogin } = useAccount()
  usePageTitle('Meus bordados')

  if (!enabled) {
    return <Message title="Meus bordados">Salvar bordados não está disponível neste momento.</Message>
  }
  if (status === 'loading') return null
  if (!user) {
    return (
      <Message
        title="Meus bordados"
        action={
          <button type="button" className="btn" onClick={requestLogin}>
            Entrar ou criar conta
          </button>
        }
      >
        Para salvar os bordados, voltar a eles depois e organizá-los em pastas, entre ou crie uma conta. É grátis.
      </Message>
    )
  }

  return <Library userId={user.id} />
}

function Library({ userId }) {
  const navigate = useNavigate()
  const library = useLibrary(userId, { withEmbroideries: true })
  const [selected, setSelected] = useState('all')
  const [problem, setProblem] = useState('')

  const { folders, embroideries, thumbs } = library

  const counts = useMemo(() => {
    const result = {}
    for (const item of embroideries) {
      if (item.folder_id) result[item.folder_id] = (result[item.folder_id] ?? 0) + 1
    }
    return result
  }, [embroideries])
  const loose = embroideries.filter((item) => !item.folder_id).length

  // If the selected folder was deleted, go back to showing everything.
  const current = selected === 'all' || selected === 'none' || folders.some((f) => f.id === selected) ? selected : 'all'

  const shown = embroideries.filter((item) => {
    if (current === 'all') return true
    if (current === 'none') return !item.folder_id
    return item.folder_id === current
  })

  // Runs an action; on failure it shows why and lets the caller know.
  const attempt = (action) => async (...args) => {
    setProblem('')
    try {
      return await action(...args)
    } catch (error) {
      setProblem(describeLibraryError(error))
      throw error
    }
  }

  const currentName =
    current === 'all' ? 'Todos os bordados' : current === 'none' ? 'Sem pasta' : folders.find((f) => f.id === current)?.name

  return (
    <main className="library">
      <h1 className="library__title">Meus bordados</h1>

      {library.status === 'error' && (
        <div className="library__notice" role="alert">
          <p>Não foi possível carregar os seus bordados.</p>
          <button type="button" className="btn" onClick={library.reload}>
            Tentar de novo
          </button>
        </div>
      )}

      {problem && (
        <p className="library__notice" role="alert">
          {problem}
        </p>
      )}

      <div className="library__layout">
        <FolderPanel
          folders={folders}
          counts={counts}
          total={embroideries.length}
          loose={loose}
          selected={current}
          onSelect={setSelected}
          onCreate={attempt(library.addFolder)}
          onRename={attempt(library.renameFolder)}
          onDelete={attempt(library.removeFolder)}
        />

        <section className="library__shelf" aria-labelledby="shelf-title">
          <h2 id="shelf-title" className="library__subtitle">
            {currentName}
          </h2>

          {library.status === 'loading' && <p className="library__lead">Carregando…</p>}

          {library.status === 'ready' && shown.length === 0 && (
            <p className="library__empty">
              {embroideries.length === 0
                ? 'Você ainda não salvou nenhum bordado. Gere um gráfico na página inicial e use o passo “Guarde na sua conta”.'
                : 'Nenhum bordado aqui ainda. Para colocar um bordado nesta pasta, escolha a pasta no cartão dele.'}
            </p>
          )}

          <ul className="library__grid">
            {shown.map((item) => (
              <EmbroideryCard
                key={item.id}
                item={item}
                thumbUrl={thumbs[item.thumb_path]}
                folders={folders}
                onOpen={(opened) => navigate('/', { state: { opened } })}
                onMove={attempt((id, folderId) => library.changeEmbroidery(id, { folderId }))}
                onRename={attempt((id, title) => library.changeEmbroidery(id, { title }))}
                onDelete={attempt(library.removeEmbroidery)}
              />
            ))}
          </ul>
        </section>
      </div>

      <DeleteAccount
        onDelete={async () => {
          await deleteAccount(userId)
          navigate('/')
        }}
      />
    </main>
  )
}
