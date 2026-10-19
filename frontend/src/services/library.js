import { supabase } from './supabase.js'

const BUCKET = 'embroidery-photos'
const PHOTO_SIDE = 1600
const THUMB_SIDE = 360

/** An error from saving or reading the library, with a short code the screens can explain. */
export class LibraryError extends Error {
  constructor(code, cause) {
    super(code)
    this.name = 'LibraryError'
    this.code = code
    this.cause = cause
  }
}

function fail(error) {
  if (error?.message === 'limit_embroideries') return new LibraryError('limit_embroideries', error)
  if (error?.message === 'limit_folders') return new LibraryError('limit_folders', error)
  if (error?.code === '23505') return new LibraryError('duplicate_folder', error)
  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(String(error?.message))) {
    return new LibraryError('network', error)
  }
  return new LibraryError('unknown', error)
}

async function run(promise) {
  try {
    const { data, error } = await promise
    if (error) throw error
    return data
  } catch (error) {
    throw error instanceof LibraryError ? error : fail(error)
  }
}

function requireClient() {
  if (!supabase) throw new LibraryError('unavailable')
  return supabase
}

// -- Folders ------------------------------------------------------------------

export async function listFolders() {
  const client = requireClient()
  return run(client.from('folders').select('id, name, created_at').order('name'))
}

export async function createFolder(name) {
  const client = requireClient()
  return run(client.from('folders').insert({ name: name.trim() }).select('id, name, created_at').single())
}

export async function renameFolder(id, name) {
  const client = requireClient()
  return run(client.from('folders').update({ name: name.trim() }).eq('id', id).select('id, name, created_at').single())
}

/** Deletes a folder. Its embroideries are kept and become "without folder". */
export async function deleteFolder(id) {
  const client = requireClient()
  await run(client.from('folders').delete().eq('id', id))
}

// -- Embroideries -------------------------------------------------------------

const EMBROIDERY_COLUMNS = 'id, title, folder_id, settings, photo_path, thumb_path, created_at, updated_at'

export async function listEmbroideries() {
  const client = requireClient()
  return run(client.from('embroideries').select(EMBROIDERY_COLUMNS).order('created_at', { ascending: false }))
}

/** Saves the photo (and a thumbnail) in private storage, then the embroidery's row. */
export async function saveEmbroidery({ userId, file, settings, title, folderId }) {
  const client = requireClient()
  const { resizeToJpeg } = await import('../lib/imageResize.js')

  const id = crypto.randomUUID()
  const photoPath = `${userId}/${id}.jpg`
  const thumbPath = `${userId}/${id}-thumb.jpg`

  let uploaded = []
  try {
    const [photo, thumb] = await Promise.all([resizeToJpeg(file, PHOTO_SIDE), resizeToJpeg(file, THUMB_SIDE, 0.8)])
    await run(client.storage.from(BUCKET).upload(photoPath, photo, { contentType: 'image/jpeg' }))
    uploaded = [photoPath]
    await run(client.storage.from(BUCKET).upload(thumbPath, thumb, { contentType: 'image/jpeg' }))
    uploaded = [photoPath, thumbPath]

    return await run(
      client
        .from('embroideries')
        .insert({
          id,
          title: title.trim(),
          folder_id: folderId ?? null,
          settings,
          photo_path: photoPath,
          thumb_path: thumbPath,
        })
        .select(EMBROIDERY_COLUMNS)
        .single(),
    )
  } catch (error) {
    // Do not leave photos behind for a row that was never created.
    if (uploaded.length > 0) await client.storage.from(BUCKET).remove(uploaded).catch(() => {})
    throw error instanceof LibraryError ? error : fail(error)
  }
}

export async function updateEmbroidery(id, changes) {
  const client = requireClient()
  const columns = {}
  if ('title' in changes) columns.title = changes.title.trim()
  if ('folderId' in changes) columns.folder_id = changes.folderId ?? null
  if ('settings' in changes) columns.settings = changes.settings
  return run(client.from('embroideries').update(columns).eq('id', id).select(EMBROIDERY_COLUMNS).single())
}

export async function deleteEmbroidery(embroidery) {
  const client = requireClient()
  await run(client.storage.from(BUCKET).remove([embroidery.photo_path, embroidery.thumb_path]))
  await run(client.from('embroideries').delete().eq('id', embroidery.id))
}

/** Temporary addresses (valid for an hour) to show the private thumbnails. */
export async function thumbnailUrls(embroideries) {
  const client = requireClient()
  const paths = embroideries.map((item) => item.thumb_path)
  if (paths.length === 0) return {}

  const signed = await run(client.storage.from(BUCKET).createSignedUrls(paths, 3600))
  return Object.fromEntries(signed.filter((entry) => entry.signedUrl).map((entry) => [entry.path, entry.signedUrl]))
}

/** The saved photo, as a File ready to go back into the chart generator. */
export async function downloadPhoto(embroidery) {
  const client = requireClient()
  const blob = await run(client.storage.from(BUCKET).download(embroidery.photo_path))
  return new File([blob], `${embroidery.title}.jpg`, { type: 'image/jpeg' })
}

// -- Account ------------------------------------------------------------------

/** Removes every photo of this person, then the account itself and everything saved with it. */
export async function deleteAccount(userId) {
  const client = requireClient()

  for (;;) {
    const files = await run(client.storage.from(BUCKET).list(userId, { limit: 100 }))
    if (files.length === 0) break
    await run(client.storage.from(BUCKET).remove(files.map((file) => `${userId}/${file.name}`)))
  }

  await run(client.rpc('delete_my_account'))
  await client.auth.signOut({ scope: 'local' })
}
