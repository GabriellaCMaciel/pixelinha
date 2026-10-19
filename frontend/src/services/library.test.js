import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = { upload: vi.fn(), remove: vi.fn(), list: vi.fn(), download: vi.fn(), createSignedUrls: vi.fn() }
const table = { insert: vi.fn(), select: vi.fn(), single: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn(), order: vi.fn() }
const client = {
  from: vi.fn(() => table),
  storage: { from: vi.fn(() => storage) },
  rpc: vi.fn(),
  auth: { signOut: vi.fn() },
}

vi.mock('./supabase.js', () => ({ supabase: client }))
vi.mock('../lib/imageResize.js', () => ({ resizeToJpeg: vi.fn(async () => new Blob(['jpg'])) }))

const library = await import('./library.js')

const settings = { gridWidth: 100 }
const file = new File(['x'], 'foto.png', { type: 'image/png' })

beforeEach(() => {
  vi.clearAllMocks()
  for (const name of ['insert', 'select', 'update', 'delete', 'eq']) table[name].mockReturnValue(table)
  table.single.mockResolvedValue({ data: { id: 'row' }, error: null })
  storage.upload.mockResolvedValue({ data: {}, error: null })
  storage.remove.mockResolvedValue({ data: [], error: null })
})

describe('saveEmbroidery', () => {
  it('uploads the photo and the thumbnail under the person, then saves the row', async () => {
    await library.saveEmbroidery({ userId: 'u1', file, settings, title: '  Gato ', folderId: 'f1' })

    const paths = storage.upload.mock.calls.map(([path]) => path)
    expect(paths).toHaveLength(2)
    expect(paths.every((path) => path.startsWith('u1/'))).toBe(true)
    expect(paths[1]).toMatch(/-thumb\.jpg$/)
    const row = table.insert.mock.calls[0][0]
    expect(row).toMatchObject({ title: 'Gato', folder_id: 'f1', settings, photo_path: paths[0], thumb_path: paths[1] })
  })

  it('removes the uploaded photos when the row cannot be saved', async () => {
    table.single.mockResolvedValue({ data: null, error: { message: 'limit_embroideries' } })

    await expect(library.saveEmbroidery({ userId: 'u1', file, settings, title: 'Gato' })).rejects.toMatchObject({
      code: 'limit_embroideries',
    })

    expect(storage.remove).toHaveBeenCalledTimes(1)
    expect(storage.remove.mock.calls[0][0]).toHaveLength(2)
  })

  it('removes the first photo when the thumbnail upload fails', async () => {
    storage.upload.mockResolvedValueOnce({ data: {}, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    await expect(library.saveEmbroidery({ userId: 'u1', file, settings, title: 'Gato' })).rejects.toMatchObject({ code: 'unknown' })

    expect(storage.remove.mock.calls[0][0]).toHaveLength(1)
    expect(table.insert).not.toHaveBeenCalled()
  })
})

describe('errors', () => {
  it('recognizes a repeated folder name', async () => {
    table.single.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } })

    await expect(library.createFolder('Pets')).rejects.toMatchObject({ code: 'duplicate_folder' })
  })

  it('recognizes the folder limit', async () => {
    table.single.mockResolvedValue({ data: null, error: { message: 'limit_folders' } })

    await expect(library.createFolder('Mais uma')).rejects.toMatchObject({ code: 'limit_folders' })
  })

  it('recognizes a network failure', async () => {
    table.single.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })

    await expect(library.createFolder('Pets')).rejects.toMatchObject({ code: 'network' })
  })

  it('trims folder names', async () => {
    await library.createFolder('  Flores  ')

    expect(table.insert).toHaveBeenCalledWith({ name: 'Flores' })
  })
})

describe('updateEmbroidery', () => {
  it('only sends what changed', async () => {
    await library.updateEmbroidery('e1', { folderId: null })

    expect(table.update).toHaveBeenCalledWith({ folder_id: null })
  })
})

describe('deleteEmbroidery', () => {
  it('removes both photos, then the row', async () => {
    table.eq.mockResolvedValue({ data: null, error: null })

    await library.deleteEmbroidery({ id: 'e1', photo_path: 'u1/a.jpg', thumb_path: 'u1/a-thumb.jpg' })

    expect(storage.remove).toHaveBeenCalledWith(['u1/a.jpg', 'u1/a-thumb.jpg'])
    expect(table.eq).toHaveBeenCalledWith('id', 'e1')
  })
})

describe('deleteAccount', () => {
  it('removes every photo of the person, then the account, then leaves', async () => {
    storage.list
      .mockResolvedValueOnce({ data: [{ name: 'a.jpg' }, { name: 'a-thumb.jpg' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
    client.rpc.mockResolvedValue({ data: null, error: null })

    await library.deleteAccount('u1')

    expect(storage.remove).toHaveBeenCalledWith(['u1/a.jpg', 'u1/a-thumb.jpg'])
    expect(client.rpc).toHaveBeenCalledWith('delete_my_account')
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('does not delete the account when the photos could not be removed', async () => {
    storage.list.mockResolvedValue({ data: [{ name: 'a.jpg' }], error: null })
    storage.remove.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(library.deleteAccount('u1')).rejects.toBeTruthy()

    expect(client.rpc).not.toHaveBeenCalled()
  })
})

describe('thumbnailUrls', () => {
  it('maps each thumbnail path to a temporary address', async () => {
    storage.createSignedUrls.mockResolvedValue({
      data: [{ path: 'u1/a-thumb.jpg', signedUrl: 'https://x/a' }, { path: 'u1/b-thumb.jpg', signedUrl: null }],
      error: null,
    })

    const urls = await library.thumbnailUrls([{ thumb_path: 'u1/a-thumb.jpg' }, { thumb_path: 'u1/b-thumb.jpg' }])

    expect(urls).toEqual({ 'u1/a-thumb.jpg': 'https://x/a' })
  })

  it('does not call the server for an empty list', async () => {
    expect(await library.thumbnailUrls([])).toEqual({})
    expect(storage.createSignedUrls).not.toHaveBeenCalled()
  })
})
