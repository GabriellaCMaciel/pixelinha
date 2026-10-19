import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AccountMenu from './AccountMenu.jsx'

const base = { enabled: true, status: 'ready', user: null, signOut: vi.fn() }

describe('AccountMenu', () => {
  it('renders nothing when the site has no login settings', () => {
    const { container } = render(<AccountMenu auth={{ ...base, enabled: false }} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing while it is still finding out who is signed in', () => {
    const { container } = render(<AccountMenu auth={{ ...base, status: 'loading' }} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('offers to sign in and opens the window', async () => {
    const user = userEvent.setup()
    render(<AccountMenu auth={base} />)

    await user.click(screen.getByRole('button', { name: 'Entrar ou criar conta' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows who is signed in and lets them leave', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn().mockResolvedValue(undefined)
    render(<AccountMenu auth={{ ...base, user: { email: 'ana@exemplo.com' }, signOut }} />)

    expect(screen.queryByText('ana@exemplo.com')).not.toBeInTheDocument()
    expect(screen.getByText('an•••@e•••.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(signOut).toHaveBeenCalled()
  })

  it('says so when leaving fails', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn().mockRejectedValue(new Error('x'))
    render(<AccountMenu auth={{ ...base, user: { email: 'ana@exemplo.com' }, signOut }} />)

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível sair')
  })
})

describe('AccountMenu greeting', () => {
  it('greets by the chosen name and shows no e-mail at all', () => {
    const user = { email: 'ana@exemplo.com', user_metadata: { display_name: 'Ana' } }
    const { container } = render(<AccountMenu auth={{ ...base, user }} />)

    expect(screen.getByText('Olá, Ana!')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('exemplo')
  })
})
