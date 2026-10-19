import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SiteFooter from './SiteFooter.jsx'

afterEach(() => vi.restoreAllMocks())

describe('SiteFooter', () => {
  it('links to the three documents', () => {
    render(<MemoryRouter><SiteFooter /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
    expect(screen.getByRole('link', { name: 'Política de Cookies' })).toHaveAttribute('href', '/cookies')
  })

  it('scrolls back to the top', async () => {
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo
    render(<MemoryRouter><SiteFooter /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: /voltar ao topo/i }))

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })
})
