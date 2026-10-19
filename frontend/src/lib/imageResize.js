/** Smaller copies of a photo, as JPEG files, for saving and for thumbnails. */

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      // Honors the camera rotation stored in the photo.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through to the slower way for formats createImageBitmap refuses.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The size that fits `width` x `height` inside a square of `maxSide`, never larger than the original. */
export function fitWithin(width, height, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Returns a JPEG Blob of the photo, no larger than `maxSide` pixels on its longest side. */
export async function resizeToJpeg(file, maxSide, quality = 0.88) {
  const source = await decode(file)
  const { width, height } = fitWithin(source.width, source.height, maxSide)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  // JPEG has no transparency: paint white first so a see-through PNG does not turn black.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
  source.close?.()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo.'))),
      'image/jpeg',
      quality,
    )
  })
}
