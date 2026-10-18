import { useState } from 'react'
import Controls from './components/Controls.jsx'
import GridViewer from './components/GridViewer.jsx'
import Legend from './components/Legend.jsx'
import PdfExport from './components/PdfExport.jsx'
import Step from './components/Step.jsx'
import StitchFlower from './components/StitchFlower.jsx'
import Uploader from './components/Uploader.jsx'
import logo from './assets/pixelinha-logo.svg'
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
      <Step number={1} title="Escolha a foto" tone="peony" className="workspace__photo">
        <Uploader file={file} maxBytes={limits.max_upload_bytes} onFile={setFile} />
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

export default function App() {
  const { limits, status, error, retry } = useLimits()

  return (
    <div className="page">
      <header className="page__header">
        <div className="page__brand">
          <StitchFlower size={76} />
          <div>
            <h1 className="page__title">
              <span className="visually-hidden">PixeLinha</span>
              <img className="page__logo" src={logo} alt="" aria-hidden="true" />
            </h1>
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
