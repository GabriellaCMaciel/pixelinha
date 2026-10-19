import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DeleteAccount from './DeleteAccount.jsx'

describe('DeleteAccount', () => {
  it('does nothing until the person confirms on purpose', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<DeleteAccount onDelete={onDelete} />)

    expect(screen.getByText(/Não dá para desfazer/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quero excluir minha conta' }))
    const button = screen.getByRole('button', { name: 'Excluir tudo para sempre' })
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText(/digite EXCLUIR/), 'excl')
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText(/digite EXCLUIR/), 'uir')
    expect(button).toBeEnabled()
    await user.click(button)

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('can be cancelled', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<DeleteAccount onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Quero excluir minha conta' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText(/digite EXCLUIR/)).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('says so when it fails', async () => {
    const user = userEvent.setup()
    render(<DeleteAccount onDelete={vi.fn().mockRejectedValue(new Error('x'))} />)

    await user.click(screen.getByRole('button', { name: 'Quero excluir minha conta' }))
    await user.type(screen.getByLabelText(/digite EXCLUIR/), 'EXCLUIR')
    await user.click(screen.getByRole('button', { name: 'Excluir tudo para sempre' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir a conta')
  })
})
