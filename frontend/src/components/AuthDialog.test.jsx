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

async function openSignUp(user) {
  await user.click(screen.getByRole('button', { name: 'Criar conta' }))
}

async function fillSignUp(user, { email = 'ana@exemplo.com', password = 'bordado2026', confirmation = password } = {}) {
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Senha'), password)
  await user.type(screen.getByLabelText('Repita a senha'), confirmation)
}

const submitButton = () => screen.getAllByRole('button', { name: 'Criar conta' }).at(-1)

describe('AuthDialog signing in', () => {
  it('opens on signing in with the e-mail field focused', () => {
    setup()

    expect(screen.getByRole('dialog', { name: 'Entrar na sua conta' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
  })

  it('signs in with a clean, lowercase e-mail and closes', async () => {
    const { auth, onClose, user } = setup()

    await user.type(screen.getByLabelText('E-mail'), ' Ana@Exemplo.com ')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(auth.signIn).toHaveBeenCalledWith('ana@exemplo.com', 'segredo1')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('does not ask a returning person for the new-password rules', async () => {
    const { auth, user } = setup()

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(auth.signIn).toHaveBeenCalledWith('ana@exemplo.com', 'abc')
  })

  it('explains an invalid e-mail and an empty password without calling the server', async () => {
    const { auth, user } = setup()

    await user.type(screen.getByLabelText('E-mail'), 'ana@')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/não parece válido/)).toBeInTheDocument()
    expect(screen.getByText('Digite a sua senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('explains the problem in Portuguese and stays open when the server refuses', async () => {
    const { onClose, user } = setup({
      signIn: vi.fn().mockRejectedValue({ code: 'invalid_credentials' }),
    })

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('mentions the terms and privacy policy with links that open in a new tab', () => {
    setup()

    const terms = screen.getByRole('link', { name: 'Termos de Uso' })
    expect(terms).toHaveAttribute('href', '/termos')
    expect(terms).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
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

describe('AuthDialog creating an account', () => {
  it('shows the password rules, the repeat field, the name and the three policies', async () => {
    const { user } = setup()
    await openSignUp(user)

    expect(screen.getByRole('dialog', { name: 'Criar sua conta' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Como podemos te chamar/)).toBeInTheDocument()
    expect(screen.getByLabelText('Repita a senha')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'O que a senha precisa ter' })).toBeInTheDocument()
    for (const name of ['Termos de Uso', 'Política de Privacidade', 'Política de Cookies']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('ticks each password rule as it is met', async () => {
    const { user } = setup()
    await openSignUp(user)
    const rules = screen.getByRole('list', { name: 'O que a senha precisa ter' })

    expect(rules).toHaveTextContent('Pelo menos 8 caracteres (falta)')
    await user.type(screen.getByLabelText('Senha'), 'bordado1')

    expect(rules).toHaveTextContent('Pelo menos 8 caracteres (feito)')
    expect(rules).toHaveTextContent('Uma letra (feito)')
    expect(rules).toHaveTextContent('Um número (feito)')
  })

  it('creates the account with the name and the accepted terms', async () => {
    const { auth, onClose, user } = setup()
    await openSignUp(user)

    await user.type(screen.getByLabelText(/Como podemos te chamar/), 'Ana')
    await fillSignUp(user)
    await user.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
    await user.click(submitButton())

    expect(auth.signUp).toHaveBeenCalledWith(
      'ana@exemplo.com',
      'bordado2026',
      'Ana',
      expect.objectContaining({ termsVersion: expect.any(String), termsAcceptedAt: expect.any(String) }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('does not create the account until the terms are accepted', async () => {
    const { auth, user } = setup()
    await openSignUp(user)

    await fillSignUp(user)
    await user.click(submitButton())

    expect(screen.getByText(/marque que você leu e concorda/)).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects a weak password and tells why', async () => {
    const { auth, user } = setup()
    await openSignUp(user)

    await fillSignUp(user, { password: 'curta1' })
    await user.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
    await user.click(submitButton())

    expect(screen.getByText(/pelo menos 8 caracteres, com letras e números/)).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects a password that was typed differently the second time', async () => {
    const { auth, user } = setup()
    await openSignUp(user)

    await fillSignUp(user, { password: 'bordado2026', confirmation: 'bordado2025' })
    await user.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
    await user.click(submitButton())

    expect(screen.getByText(/As senhas não são iguais/)).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('tells the person to check the e-mail when confirmation is needed', async () => {
    const { onClose, user } = setup({
      signUp: vi.fn().mockResolvedValue({ needsConfirmation: true }),
    })
    await openSignUp(user)

    await fillSignUp(user)
    await user.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
    await user.click(submitButton())

    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos uma mensagem')
    expect(onClose).not.toHaveBeenCalled()
  })
})
