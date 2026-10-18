/*
  The StitchLab mark: a small flower drawn the way it would be stitched, one
  cross per cell. Letters pick the thread color.

    P pink petal     p coral petal tip     H honey     C berry center
    S stem           L leaf
*/
export const FLOWER = [
  '..pp.pp..',
  '.pPPpPPp.',
  'pPPPPPPPp',
  'pPPHHHPPp',
  '.PPHCHPP.',
  'pPPHHHPPp',
  'pPPPPPPPp',
  '.pPPpPPp.',
  '..pp.pp..',
  '....S....',
  '.LL.S.LL.',
  '.LLLSLLL.',
  '....S....',
]

export const THREADS = {
  P: '#e78faf',
  p: '#f4a77c',
  H: '#f4d56b',
  C: '#a6406f',
  S: '#8ea63a',
  L: '#c6d67a',
}

/** Every stitched cell of the flower, in reading order. */
export function flowerCells() {
  const cells = []
  FLOWER.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const key = row[x]
      if (key !== '.') cells.push({ x, y, color: THREADS[key], index: cells.length })
    }
  })
  return cells
}

/** The flower as a standalone SVG, used for the favicon. */
export function flowerSvg({ background = '#f6f1e6', cell = 10 } = {}) {
  const round = (n) => Math.round(n * 10) / 10
  const width = FLOWER[0].length
  const height = FLOWER.length
  const pad = 1.5
  const w = (width + pad * 2) * cell
  const h = (height + pad * 2) * cell
  const side = Math.max(w, h)
  const offsetX = (side - width * cell) / 2
  const offsetY = (side - height * cell) / 2
  const inset = cell * 0.2

  const crosses = flowerCells()
    .map(({ x, y, color }) => {
      const left = offsetX + x * cell + inset
      const top = offsetY + y * cell + inset
      const right = offsetX + (x + 1) * cell - inset
      const bottom = offsetY + (y + 1) * cell - inset
      return `<path d="M${round(left)} ${round(top)}L${round(right)} ${round(bottom)}M${round(right)} ${round(top)}L${round(left)} ${round(bottom)}" stroke="${color}"/>`
    })
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}">` +
    `<rect width="${side}" height="${side}" rx="${round(side * 0.22)}" fill="${background}"/>` +
    `<g fill="none" stroke-width="${round(cell * 0.4)}" stroke-linecap="round">${crosses}</g></svg>`
  )
}
