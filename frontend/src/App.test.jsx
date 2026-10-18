import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  it('shows the name of the product', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'StitchLab' })).toBeInTheDocument()
  })
})
