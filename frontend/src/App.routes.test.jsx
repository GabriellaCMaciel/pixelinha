import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('./services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchLimits: vi.fn(() => new Promise(() => {})),
}))

function open(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App pages', () => {
  it.each([
    ['/termos', 'Termos de Uso'],
    ['/privacidade', 'Política de Privacidade'],
    ['/cookies', 'Política de Cookies'],
  ])('shows %s as its own page, without waiting for the server', (path, title) => {
    open(path)

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.queryByText('Conectando ao servidor…')).not.toBeInTheDocument()
  })

  it('has one main heading per page', () => {
    open('/termos')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('shows a friendly message for an unknown address', () => {
    open('/nao-existe')

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })

  it('links to the three documents from every page', () => {
    open('/')

    const footer = screen.getByRole('navigation', { name: 'Documentos do site' })
    expect(footer).toHaveTextContent('Termos de Uso')
    expect(footer).toHaveTextContent('Política de Privacidade')
    expect(footer).toHaveTextContent('Política de Cookies')
  })

  it('names the privacy contact and the legal basis', () => {
    open('/privacidade')

    expect(screen.getAllByText(/LGPD/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /@/ }).length).toBeGreaterThan(0)
  })
})
