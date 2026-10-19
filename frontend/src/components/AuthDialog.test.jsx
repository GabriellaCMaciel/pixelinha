import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AuthDialog from './AuthDialog.jsx'

function setup(overrides = {}) {
  const auth = {
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue({ needsConfirmation: false }),
    ...overrides,
  }
  const onClose = vi.fn()
  render(<AuthDialog auth={auth} onClose={onClose} />)
  return { auth, onClose, user: userEvent.setup() }
}

describe('AuthDialog', () => {
  it('opens on signing in with the e-mail field focused', () => {
    setup()

    expect(screen.getByRole('dialog', { name: 'Entrar na sua conta' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
  })

  it('signs in with what was typed and closes', async () => {
    const { auth, onClose, user } = setup()

    await user.type(screen.getByLabelText('E-mail'), ' ana@exemplo.com ')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(auth.signIn).toHaveBeenCalledWith('ana@exemplo.com', 'segredo1')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('explains the problem in Portuguese and stays open when signing in fails', async () => {
    const { onClose, user } = setup({
      signIn: vi.fn().mockRejectedValue({ code: 'invalid_credentials' }),
    })

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('switches to creating an account and asks for at least 6 characters', async () => {
    const { auth, onClose, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(screen.getByRole('dialog', { name: 'Criar sua conta' })).toBeInTheDocument()
    expect(screen.getByText('Use pelo menos 6 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('minlength', '6')

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getAllByRole('button', { name: 'Criar conta' }).at(-1))

    expect(auth.signUp).toHaveBeenCalledWith('ana@exemplo.com', 'segredo1')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('tells the person to check the e-mail when confirmation is needed', async () => {
    const { onClose, user } = setup({
      signUp: vi.fn().mockResolvedValue({ needsConfirmation: true }),
    })

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getAllByRole('button', { name: 'Criar conta' }).at(-1))

    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos uma mensagem')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows and hides the password', async () => {
    const { user } = setup()
    const field = screen.getByLabelText('Senha')

    expect(field).toHaveAttribute('type', 'password')
    await user.click(screen.getByLabelText('Mostrar a senha'))
    expect(field).toHaveAttribute('type', 'text')
  })

  it('closes with Escape and with the close button', async () => {
    const { onClose, user } = setup()

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
