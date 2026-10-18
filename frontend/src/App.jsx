import { useState } from 'react'
import Controls from './components/Controls.jsx'
import GridViewer from './components/GridViewer.jsx'
import Legend from './components/Legend.jsx'
import PdfExport from './components/PdfExport.jsx'
import StitchFlower from './components/StitchFlower.jsx'
import Uploader from './components/Uploader.jsx'
import { useChart } from './hooks/useChart.js'
import { useLimits } from './hooks/useLimits.js'
import { describeError } from './services/errors.js'
import './App.css'

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
      <aside className="workspace__side">
        <Uploader file={file} maxBytes={limits.max_upload_bytes} onFile={setFile} />
        <Controls
          limits={limits}
          values={values}
          onChange={(change) => setSettings((previous) => ({ ...previous, ...change }))}
        />
        <PdfExport file={file} settings={values} ready={status === 'ready'} />
      </aside>

      <div className="workspace__stage">
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
                <p>Gerando o gráfico…</p>
              </>
            ) : (
              <>
                <StitchFlower size={120} />
                <h2 className="empty__title">O gráfico aparece aqui</h2>
                <p>Escolha uma imagem ao lado, ou teste com a imagem de exemplo.</p>
              </>
            )}
          </div>
        )}

        {chart && loading && (
          <p className="stage__updating" role="status">
            Atualizando o gráfico…
          </p>
        )}
      </div>

      <div className="workspace__legend">
        {chart ? (
          <Legend
            chart={chart}
            highlight={highlight}
            onHighlight={(index) => setPicked(index === null ? null : { chart, index })}
          />
        ) : (
          <section className="legend legend--empty" aria-label="Legenda de linhas">
            <h2 className="legend__title">Linhas DMC</h2>
            <p className="legend__total">As cores, os símbolos e a quantidade de pontos aparecem aqui.</p>
          </section>
        )}
      </div>
    </main>
  )
}

export default function App() {
  const { limits, status, error, retry } = useLimits()

  return (
    <div className="page">
      <header className="page__header">
        <div className="page__brand">
          <StitchFlower size={76} />
          <div>
            <h1 className="page__title">StitchLab</h1>
            <p className="page__tagline">Transforme qualquer imagem em gráfico de ponto cruz.</p>
          </div>
        </div>
        <hr className="stitch-rule" />
      </header>

      {status === 'ready' && <Workspace limits={limits} />}

      {status === 'loading' && (
        <Notice waiting>
          Conectando ao servidor… Na primeira visita do dia isso pode levar cerca de 1 minuto.
        </Notice>
      )}

      {status === 'error' && (
        <Notice
          role="alert"
          action={<RetryButton onClick={retry} />}
        >
          {describeError(error)}
        </Notice>
      )}
    </div>
  )
}
