import { useEffect, useId, useRef, useState } from 'react'
import { saveFile } from '../lib/saveFile.js'
import { downloadPdf } from '../services/api.js'
import { describeError } from '../services/errors.js'
import './PdfExport.css'

const STYLES = [
  { value: 'color', label: 'Colorido', hint: 'Cada símbolo sobre a cor da linha.' },
  { value: 'bw', label: 'Preto e branco', hint: 'Só símbolos, gasta menos tinta.' },
]

/**
 * Downloads the chart as a PDF to print. It asks the server for the same chart
 * the person is looking at, so what prints is what is on screen.
 */
export default function PdfExport({ file, settings, ready }) {
  const titleId = useId()
  const styleName = useId()
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState('color')
  const [state, setState] = useState({ status: 'idle', error: null })
  const controller = useRef(null)

  useEffect(() => () => controller.current?.abort(), [])

  const working = state.status === 'working'

  const download = async () => {
    controller.current?.abort()
    controller.current = new AbortController()
    setState({ status: 'working', error: null })

    try {
      const { blob, fileName } = await downloadPdf({
        file,
        ...settings,
        title,
        style,
        signal: controller.current.signal,
      })
      saveFile(blob, fileName)
      setState({ status: 'done', error: null })
    } catch (error) {
      if (error?.name === 'AbortError') return
      setState({ status: 'error', error })
    }
  }

  return (
    <section className="pdf" aria-label="Baixar para imprimir">
      <h2 className="pdf__title">Baixar para imprimir</h2>
      <p className="pdf__intro">
        O PDF tem a prévia, a legenda com os novelos e o gráfico em páginas A4 numeradas.
      </p>

      <div className="pdf__field">
        <label htmlFor={titleId} className="pdf__label">
          Título <span className="pdf__optional">(opcional)</span>
        </label>
        <input
          id={titleId}
          className="pdf__input"
          type="text"
          maxLength={60}
          placeholder="Ex.: Flor da vovó"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="pdf__field" role="radiogroup" aria-labelledby={`${styleName}-label`}>
        <span id={`${styleName}-label`} className="pdf__label">
          Estilo das páginas
        </span>
        <div className="pdf__choices">
          {STYLES.map((option) => (
            <label
              key={option.value}
              className={`pdf__choice${style === option.value ? ' pdf__choice--on' : ''}`}
            >
              <input
                className="visually-hidden"
                type="radio"
                name={styleName}
                value={option.value}
                checked={style === option.value}
                onChange={() => setStyle(option.value)}
              />
              <span className="pdf__choice-label">{option.label}</span>
              <span className="pdf__choice-hint">{option.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn pdf__button"
        onClick={download}
        disabled={!ready || working}
      >
        {working ? 'Gerando o PDF…' : 'Baixar PDF'}
      </button>

      {!ready && !working && (
        <p className="pdf__note">Escolha uma imagem e espere o gráfico para liberar o PDF.</p>
      )}
      {working && (
        <p className="pdf__note" role="status">
          Montando as páginas. Gráficos grandes podem levar alguns segundos.
        </p>
      )}
      {state.status === 'done' && (
        <p className="pdf__note pdf__note--done" role="status">
          PDF baixado. Confira a pasta de downloads.
        </p>
      )}
      {state.status === 'error' && (
        <p className="pdf__note pdf__note--error" role="alert">
          {describeError(state.error)}
        </p>
      )}
    </section>
  )
}
