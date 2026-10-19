import { useCallback, useEffect, useState } from 'react'
import * as library from '../services/library.js'

const byName = (a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })

/**
 * The folders (and, if asked, the embroideries) of the signed-in person, with
 * the actions to change them. `status` is "loading", "ready" or "error".
 * Every action throws a LibraryError when it fails, so screens can explain why.
 */
export function useLibrary(userId, { withEmbroideries = false } = {}) {
  const [state, setState] = useState({ status: 'loading', folders: [], embroideries: [], thumbs: {} })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!userId) return undefined

    let active = true
    const load = async () => {
      try {
        const [folders, embroideries] = await Promise.all([
          library.listFolders(),
          withEmbroideries ? library.listEmbroideries() : [],
        ])
        const thumbs = withEmbroideries ? await library.thumbnailUrls(embroideries).catch(() => ({})) : {}
        if (active) setState({ status: 'ready', folders, embroideries, thumbs })
      } catch {
        if (active) setState((previous) => ({ ...previous, status: 'error' }))
      }
    }
    load()

    return () => {
      active = false
    }
  }, [userId, withEmbroideries, attempt])

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const addFolder = useCallback(async (name) => {
    const folder = await library.createFolder(name)
    setState((previous) => ({ ...previous, folders: [...previous.folders, folder].sort(byName) }))
    return folder
  }, [])

  const renameFolder = useCallback(async (id, name) => {
    const folder = await library.renameFolder(id, name)
    setState((previous) => ({
      ...previous,
      folders: previous.folders.map((item) => (item.id === id ? folder : item)).sort(byName),
    }))
  }, [])

  const removeFolder = useCallback(async (id) => {
    await library.deleteFolder(id)
    setState((previous) => ({
      ...previous,
      folders: previous.folders.filter((item) => item.id !== id),
      // The database keeps the embroideries and takes them out of the folder.
      embroideries: previous.embroideries.map((item) => (item.folder_id === id ? { ...item, folder_id: null } : item)),
    }))
  }, [])

  const changeEmbroidery = useCallback(async (id, changes) => {
    const updated = await library.updateEmbroidery(id, changes)
    setState((previous) => ({
      ...previous,
      embroideries: previous.embroideries.map((item) => (item.id === id ? updated : item)),
    }))
    return updated
  }, [])

  const removeEmbroidery = useCallback(async (embroidery) => {
    await library.deleteEmbroidery(embroidery)
    setState((previous) => ({
      ...previous,
      embroideries: previous.embroideries.filter((item) => item.id !== embroidery.id),
    }))
  }, [])

  return {
    ...state,
    reload,
    addFolder,
    renameFolder,
    removeFolder,
    changeEmbroidery,
    removeEmbroidery,
  }
}
