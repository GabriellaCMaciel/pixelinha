import { useId } from 'react'
import './Controls.css'

function Slider({ label, hint, value, min, max, unit, onChange }) {
  const id = useId()
  return (
    <div className="controls__field">
      <div className="controls__line">
        <label htmlFor={id} className="controls__label">
          {label}
        </label>
        <output htmlFor={id} className="controls__value">
          {value} {unit(value)}
        </output>
      </div>
      <input
        id={id}
        className="controls__range"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="controls__hint">
        {hint}
      </p>
    </div>
  )
}

/**
 * Chart settings. Changes are reported right away; the page decides when to
 * ask the server again.
 */
export default function Controls({ limits, values, onChange, disabled = false }) {
  const backgroundId = useId()
  const fabricId = useId()

  return (
    <fieldset className="controls" disabled={disabled}>
      <legend className="visually-hidden">Ajustes do gráfico</legend>

      <Slider
        label="Largura"
        hint="Mais pontos mostram mais detalhes, mas o bordado fica maior."
        value={values.gridWidth}
        min={limits.min_grid_width}
        max={limits.max_grid_width}
        unit={(n) => (n === 1 ? 'ponto' : 'pontos')}
        onChange={(gridWidth) => onChange({ gridWidth })}
      />

      <Slider
        label="Cores"
        hint="Menos cores deixam o bordado mais simples de executar."
        value={values.nColors}
        min={limits.min_colors}
        max={limits.max_colors}
        unit={(n) => (n === 1 ? 'cor' : 'cores')}
        onChange={(nColors) => onChange({ nColors })}
      />

      <div className="controls__field">
        <label htmlFor={fabricId} className="controls__label">
          Tecido
        </label>
        <select
          id={fabricId}
          className="controls__select"
          value={values.fabricCount}
          onChange={(event) => onChange({ fabricCount: Number(event.target.value) })}
          aria-describedby={`${fabricId}-hint`}
        >
          {limits.fabric_counts.map((count) => (
            <option key={count} value={count}>
              Aida {count}
            </option>
          ))}
        </select>
        <p id={`${fabricId}-hint`} className="controls__hint">
          Define o tamanho final em centímetros e os novelos de cada cor. Aida 14 é a mais comum.
        </p>
      </div>

      <div className="controls__field controls__field--check">
        <input
          id={backgroundId}
          type="checkbox"
          checked={values.ignoreBackground}
          onChange={(event) => onChange({ ignoreBackground: event.target.checked })}
        />
        <label htmlFor={backgroundId}>
          Deixar o fundo sem ponto
          <span className="controls__hint">
            O tecido aparece no lugar da cor mais comum nas bordas da imagem.
          </span>
        </label>
      </div>
    </fieldset>
  )
}
