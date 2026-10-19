import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Controls from '../components/Controls.jsx'
import SavePanel from '../components/SavePanel.jsx'
import GridViewer from '../components/GridViewer.jsx'
import Legend from '../components/Legend.jsx'
import PdfExport from '../components/PdfExport.jsx'
import Step from '../components/Step.jsx'
import StitchFlower from '../components/StitchFlower.jsx'
import Uploader from '../components/Uploader.jsx'
import { useChart } from '../hooks/useChart.js'
import { useLimits } from '../hooks/useLimits.js'
import { describeError } from '../services/errors.js'
import { downloadPhoto } from '../services/library.js'

const DEFAULTS = { gridWidth: 100, nColors: 16, ignoreBackground: false, fabricCount: 14 }

const within = (value, low, high) => Math.min(high, Math.max(low, value))

function Notice({ role = 'status', children, action, waiting = false }) {
  return (
    <div className="notice" role={role}>
      {waiting && <StitchFlower size={44} stitching />}
      <p className="notice__text">{children}</p>
      {action}
    </div>
  )
}

function RetryButton({ onClick }) {
  return (
    <button type="button" className="btn" onClick={onClick}>
      Tentar de novo
    </button>
  )
}

function Workspace({ limits }) {
  const [file, setFile] = useState(null)
  const [settings, setSettings] = useState(DEFAULTS)
  const [picked, setPicked] = useState(null)
  // The saved embroidery this chart came from, when the person opened one from "Meus bordados".
  const [saved, setSaved] = useState(null)
  const [failedToOpen, setFailedToOpen] = useState(null)
  const location = useLocation()
  const wanted = location.state?.opened ?? null

  useEffect(() => {
    if (!wanted) return undefined

    let active = true
    downloadPhoto(wanted)
      .then((photo) => {
        if (!active) return
        setFile(photo)
        setSettings({ ...DEFAULTS, ...wanted.settings })
        setPicked(null)
        setSaved(wanted)
      })
      .catch(() => {
        if (active) setFailedToOpen(wanted)
      })

    return () => {
      active = false
    }
  }, [wanted])

  const openError =
    wanted && failedToOpen === wanted
      ? 'Não foi possível abrir esse bordado agora. Tente de novo em instantes.'
      : ''

  const chooseFile = (next) => {
    setFile(next)
    setSaved(null)
  }

  const values = {
    ...settings,
    gridWidth: within(settings.gridWidth, limits.min_grid_width, limits.max_grid_width),
    nColors: within(settings.nColors, limits.min_colors, limits.max_colors),
    fabricCount: limits.fabric_counts.includes(settings.fabricCount)
      ? settings.fabricCount
      : limits.default_fabric_count,
  }

  const { chart, status, error, retry } = useChart({ file, ...values })

  // A highlighted thread only makes sense for the chart it was picked on.
  const highlight = chart && picked?.chart === chart ? picked.index : null

  const loading = status === 'loading'

  return (
    <main className="workspace">
      <Step number={1} title="Escolha a foto" tone="peony" className="workspace__photo">
        <Uploader file={file} maxBytes={limits.max_upload_bytes} onFile={chooseFile} />
        {openError && (
          <p className="notice__text" role="alert">
            {openError}
          </p>
        )}
      </Step>

      <section className="workspace__stage" aria-labelledby="chart-title">
        <h2 id="chart-title" className="workspace__stage-title">
          Seu gráfico
        </h2>

        {status === 'error' && (
          <Notice
            role="alert"
            action={<RetryButton onClick={retry} />}
          >
            {describeError(error)}
          </Notice>
        )}

        {chart ? (
          <GridViewer chart={chart} highlight={highlight} busy={loading} />
        ) : (
          <div className="empty" aria-live="polite">
            {loading ? (
              <>
                <StitchFlower size={120} stitching />
                <p className="empty__lead">Gerando o gráfico…</p>
              </>
            ) : (
              <>
                <StitchFlower size={120} />
                <p className="empty__lead">Escolha uma foto no passo 1 e o gráfico aparece aqui.</p>
                <ol className="empty__steps">
                  <li>Escolha uma foto.</li>
                  <li>Ajuste o tamanho e as cores.</li>
                  <li>Baixe o PDF e imprima.</li>
                </ol>
              </>
            )}
          </div>
        )}

        {chart && loading && (
          <p className="stage__updating" role="status">
            Atualizando o gráfico…
          </p>
        )}
      </section>

      {file && (
        <>
          <Step number={2} title="Ajuste do seu jeito" tone="honey" className="workspace__adjust">
            <Controls
              limits={limits}
              values={values}
              onChange={(change) => setSettings((previous) => ({ ...previous, ...change }))}
            />
          </Step>

          <Step number={3} title="Baixe e imprima" tone="coral" className="workspace__download">
            <PdfExport file={file} settings={values} ready={status === 'ready'} />
          </Step>

          <Step number={4} title="Guarde na sua conta" tone="leaf" className="workspace__save">
            <SavePanel file={file} settings={values} ready={status === 'ready'} opened={saved} />
          </Step>
        </>
      )}

      {chart && (
        <div className="workspace__legend">
          <Legend
            chart={chart}
            highlight={highlight}
            onHighlight={(index) => setPicked(index === null ? null : { chart, index })}
          />
        </div>
      )}
    </main>
  )
}

export default function HomePage() {
  const { limits, status, error, retry } = useLimits()

  return (
    <>
      {status === 'ready' && <Workspace limits={limits} />}

      {status === 'loading' && <Notice waiting>Conectando ao servidor…</Notice>}

      {status === 'error' && (
        <Notice role="alert" action={<RetryButton onClick={retry} />}>
          {describeError(error)}
        </Notice>
      )}
    </>
  )
}
