/*
  A small drawing made on the spot so people can try the app without having an
  image at hand. It has a flat background, so it also shows off the option that
  leaves the background unstitched.
*/

const SIZE = 240

function circle(ctx, x, y, radius, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

export function paintSample(ctx, size = SIZE) {
  const unit = size / 240
  ctx.save()
  ctx.scale(unit, unit)

  ctx.fillStyle = '#f7ecd0'
  ctx.fillRect(0, 0, 240, 240)

  // Stem and leaves.
  ctx.strokeStyle = '#2f7d3f'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(120, 130)
  ctx.lineTo(120, 220)
  ctx.stroke()

  ctx.fillStyle = '#3f9a52'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(120 + side * 26, 185, 28, 11, side * -0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Petals around the center.
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2
    circle(ctx, 120 + Math.cos(angle) * 44, 85 + Math.sin(angle) * 44, 26, i % 2 ? '#d94f7a' : '#ef7ea0')
  }

  circle(ctx, 120, 85, 28, '#7a3b1d')
  circle(ctx, 120, 85, 18, '#e9a93a')

  ctx.restore()
}

/** Draws the sample on a canvas and resolves with it as a PNG file. */
export function createSampleImage(size = SIZE) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('canvas-unavailable'))
  paintSample(ctx, size)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], 'flor-de-exemplo.png', { type: 'image/png' }))
      else reject(new Error('canvas-empty'))
    }, 'image/png')
  })
}
