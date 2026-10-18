import { useId, useState } from 'react'
import { createSampleImage } from '../lib/sampleImage.js'
import './Uploader.css'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MB = 1024 * 1024

function check(file, maxBytes) {
  if (!ACCEPTED.includes(file.type)) {
    return 'Formato não suportado. Use uma imagem PNG, JPG ou WEBP.'
  }
  if (maxBytes && file.size > maxBytes) {
    return `O arquivo passa de ${Math.round(maxBytes / MB)} MB. Escolha uma imagem menor.`
  }
  return null
}

/**
 * Image picker with drag and drop. Small checks happen here for a quick answer;
 * the server still validates everything.
 */
export default function Uploader({ file = null, maxBytes = 0, disabled = false, onFile }) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const [problem, setProblem] = useState(null)

  const accept = (candidate) => {
    if (!candidate) return
    const message = check(candidate, maxBytes)
    setProblem(message)
    if (!message) onFile?.(candidate)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    if (!disabled) accept(event.dataTransfer?.files?.[0])
  }

  const handleSample = async () => {
    try {
      setProblem(null)
      onFile?.(await createSampleImage())
    } catch {
      setProblem('Não foi possível criar a imagem de exemplo neste navegador. Envie uma imagem sua.')
    }
  }

  return (
    <div className="uploader">
      <label
        htmlFor={inputId}
        className={`uploader__drop${dragging ? ' uploader__drop--over' : ''}${
          disabled ? ' uploader__drop--disabled' : ''
        }`}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="uploader__headline">
          {file ? file.name : 'Toque aqui para escolher uma foto'}
        </span>
        <span className="uploader__hint">
          {file
            ? 'Toque aqui para trocar de foto'
            : `JPG, PNG ou WEBP${
                maxBytes ? `, até ${Math.round(maxBytes / MB)} MB` : ''
              }. No computador, também dá para arrastar a foto para cá.`}
        </span>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept={ACCEPTED.join(',')}
          disabled={disabled}
          onChange={(event) => {
            accept(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>

      {problem && (
        <p className="uploader__problem" role="alert">
          {problem}
        </p>
      )}

      {!file && (
        <button type="button" className="btn uploader__sample" onClick={handleSample} disabled={disabled}>
          Testar com uma imagem de exemplo
        </button>
      )}
    </div>
  )
}
