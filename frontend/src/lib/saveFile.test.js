import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveFile } from './saveFile.js'

describe('saveFile', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clicks a temporary download link with the file name', () => {
    const clicks = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clicks.push({ href: this.href, download: this.download })
    })
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })

    saveFile(blob, 'minha-flor.pdf')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(clicks).toEqual([{ href: 'blob:fake', download: 'minha-flor.pdf' }])
  })

  it('leaves no link behind', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    saveFile(new Blob(['x']), 'a.pdf')

    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('releases the file a moment later', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    saveFile(new Blob(['x']), 'a.pdf')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })
})
