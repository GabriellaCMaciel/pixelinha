import { useState } from 'react'
import Controls from './components/Controls.jsx'
import GridViewer from './components/GridViewer.jsx'
import Legend from './components/Legend.jsx'
import Uploader from './components/Uploader.jsx'
import { useChart } from './hooks/useChart.js'
import { useLimits } from './hooks/useLimits.js'
import { describeError } from './services/errors.js'
import './App.css'

const DEFAULTS = { gridWidth: 100, nColors: 16, ignoreBackground: false }

const within = (value, low, high) => Math.min(high, Math.max(low, value))

function Notice({ role = 'status', children, action }) {
  return (
    <div className="notice" role={role}>
      <p>{children}</p>
      {action}
    </div>
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
      </aside>

      <div className="workspace__stage">
        {status === 'error' && (
          <Notice
            role="alert"
            action={
              <button type="button" className="notice__action" onClick={retry}>
                Tentar de novo
              </button>
            }
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
                <span className="empty__thread" aria-hidden="true" />
                <p>Gerando o gráfico…</p>
              </>
            ) : (
              <>
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

export default function App() {
  const { limits, status, error, retry } = useLimits()

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">StitchLab</h1>
        <p className="page__tagline">Transforme qualquer imagem em gráfico de ponto cruz.</p>
        <hr className="stitch-rule" />
      </header>

      {status === 'ready' && <Workspace limits={limits} />}

      {status === 'loading' && (
        <Notice>
          Conectando ao servidor… Na primeira visita do dia isso pode levar cerca de 1 minuto.
        </Notice>
      )}

      {status === 'error' && (
        <Notice
          role="alert"
          action={
            <button type="button" className="notice__action" onClick={retry}>
              Tentar de novo
            </button>
          }
        >
          {describeError(error)}
        </Notice>
      )}
    </div>
  )
}
