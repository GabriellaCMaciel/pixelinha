import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FLOWER, THREADS, flowerCells, flowerSvg } from '../lib/stitchFlower.js'
import StitchFlower from './StitchFlower.jsx'

describe('flower pattern', () => {
  it('is a rectangle', () => {
    const widths = new Set(FLOWER.map((row) => row.length))
    expect(widths.size).toBe(1)
  })

  it('only uses colors that exist', () => {
    for (const row of FLOWER) {
      for (const key of row) {
        if (key !== '.') expect(THREADS).toHaveProperty(key)
      }
    }
  })

  it('lists one cell per stitch with a growing index', () => {
    const stitched = FLOWER.join('').replaceAll('.', '').length
    const cells = flowerCells()

    expect(cells).toHaveLength(stitched)
    expect(cells.map((cell) => cell.index)).toEqual([...cells.keys()])
  })

  it('makes a favicon with one cross per stitch', () => {
    const svg = flowerSvg()

    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.match(/<path /g)).toHaveLength(flowerCells().length)
  })
})

describe('StitchFlower', () => {
  it('is hidden from screen readers unless it has a label', () => {
    const { container } = render(<StitchFlower />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('can be named', () => {
    render(<StitchFlower label="Flor de ponto cruz" />)

    expect(screen.getByRole('img', { name: 'Flor de ponto cruz' })).toBeInTheDocument()
  })

  it('animates only while stitching', () => {
    const { container, rerender } = render(<StitchFlower />)
    expect(container.querySelector('svg')).not.toHaveClass('flower--stitching')

    rerender(<StitchFlower stitching />)
    expect(container.querySelector('svg')).toHaveClass('flower--stitching')
  })

  it('draws two strokes per stitch, as a cross', () => {
    const { container } = render(<StitchFlower />)
    const first = container.querySelector('path')

    expect(first.getAttribute('d').match(/M/g)).toHaveLength(2)
    expect(container.querySelectorAll('path')).toHaveLength(flowerCells().length)
  })
})
