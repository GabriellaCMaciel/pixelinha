import { FLOWER, flowerCells } from '../lib/stitchFlower.js'
import './StitchFlower.css'

const COLUMNS = FLOWER[0].length
const ROWS = FLOWER.length
const INSET = 0.2

/**
 * The flower mark. With `stitching` it embroiders itself over and over, which
 * is how the page says "working on it".
 */
export default function StitchFlower({ size = 96, stitching = false, label }) {
  return (
    <svg
      className={`flower${stitching ? ' flower--stitching' : ''}`}
      viewBox={`0 0 ${COLUMNS} ${ROWS}`}
      width={size}
      height={Math.round((size * ROWS) / COLUMNS)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      {flowerCells().map(({ x, y, color, index }) => (
        <path
          key={index}
          className="flower__cross"
          style={{ '--i': index }}
          d={`M${x + INSET} ${y + INSET}L${x + 1 - INSET} ${y + 1 - INSET}M${x + 1 - INSET} ${y + INSET}L${x + INSET} ${y + 1 - INSET}`}
          stroke={color}
        />
      ))}
    </svg>
  )
}
