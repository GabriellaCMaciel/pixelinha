import { useId, useState } from 'react'
import './Controls.css'

const SIZES = [
  { id: 'small', label: 'Pequeno', stitches: 50 },
  { id: 'medium', label: 'Médio', stitches: 100 },
  { id: 'large', label: 'Grande', stitches: 160 },
]

// Below this many colors a detailed picture loses too much.
const FEW_COLORS = 10

const wholeCm = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const oneDecimalCm = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
const centimeters = (stitches, fabricCount) => (stitches * 2.54) / fabricCount

function Slider({ label, hint, value, min, max, display, onChange }) {
  const id = useId()
  return (
    <div className="controls__field">
      <div className="controls__line">
        <label htmlFor={id} className="controls__label">
          {label}
        </label>
        <output htmlFor={id} className="controls__value">
          {display(value)}
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
 * ask the server again. Size comes first as three buttons with the size in
 * centimeters, because that is what people picture; the exact width is a
 * slider behind "Personalizado".
 */
export default function Controls({ limits, values, onChange, disabled = false }) {
  const sizeName = useId()
  const backgroundId = useId()
  const fabricId = useId()
  const [customChosen, setCustomChosen] = useState(false)

  const sizes = SIZES.map((size) => ({
    ...size,
    stitches: clamp(size.stitches, limits.min_grid_width, limits.max_grid_width),
  }))
  const matching = sizes.find((size) => size.stitches === values.gridWidth)
  const active = customChosen || !matching ? 'custom' : matching.id
  const fabricCount = values.fabricCount

  const chooseSize = (size) => {
    setCustomChosen(false)
    onChange({ gridWidth: size.stitches })
  }

  return (
    <fieldset className="controls" disabled={disabled}>
      <legend className="visually-hidden">Ajustes do gráfico</legend>

      <div className="controls__field" role="radiogroup" aria-labelledby={`${sizeName}-label`}>
        <span id={`${sizeName}-label`} className="controls__label">
          Tamanho do bordado
        </span>
        <div className="controls__choices">
          {sizes.map((size) => (
            <label
              key={size.id}
              className={`controls__choice${active === size.id ? ' controls__choice--on' : ''}`}
            >
              <input
                className="visually-hidden"
                type="radio"
                name={sizeName}
                value={size.id}
                checked={active === size.id}
                onChange={() => chooseSize(size)}
              />
              <span className="controls__choice-label">{size.label}</span>
              <span className="controls__choice-hint">
                {wholeCm.format(centimeters(size.stitches, fabricCount))} cm de largura
              </span>
            </label>
          ))}
          <label className={`controls__choice${active === 'custom' ? ' controls__choice--on' : ''}`}>
            <input
              className="visually-hidden"
              type="radio"
              name={sizeName}
              value="custom"
              checked={active === 'custom'}
              onChange={() => setCustomChosen(true)}
            />
            <span className="controls__choice-label">Personalizado</span>
            <span className="controls__choice-hint">Você escolhe</span>
          </label>
        </div>
        {active !== 'custom' && (
          <p className="controls__hint">
            Quanto maior o bordado, mais detalhes aparecem e mais tempo ele leva para ficar pronto.
          </p>
        )}
      </div>

      {active === 'custom' && (
        <Slider
          label="Largura do bordado"
          hint="Mais pontos mostram mais detalhes, mas o bordado fica maior."
          value={values.gridWidth}
          min={limits.min_grid_width}
          max={limits.max_grid_width}
          display={(n) =>
            `${oneDecimalCm.format(centimeters(n, fabricCount))} cm (${n} ${n === 1 ? 'ponto' : 'pontos'})`
          }
          onChange={(gridWidth) => onChange({ gridWidth })}
        />
      )}

      <Slider
        label="Cores"
        hint="Menos cores deixam o bordado mais simples de executar. Mas se a imagem tiver muitos detalhes, usar poucas cores não dá um bom resultado."
        value={values.nColors}
        min={limits.min_colors}
        max={limits.max_colors}
        display={(n) => `${n} ${n === 1 ? 'cor' : 'cores'}`}
        onChange={(nColors) => onChange({ nColors })}
      />

      {values.nColors < FEW_COLORS && (
        <p className="controls__warning" role="status">
          Atenção: com poucas cores, imagens cheias de detalhes perdem qualidade. Aumente as cores se o
          gráfico ficar estranho.
        </p>
      )}

      <details className="controls__more">
        <summary>Mais opções: tecido e fundo</summary>

        <div className="controls__field">
          <label htmlFor={fabricId} className="controls__label">
            Tecido
          </label>
          <select
            id={fabricId}
            className="controls__select"
            value={fabricCount}
            onChange={(event) => onChange({ fabricCount: Number(event.target.value) })}
            aria-describedby={`${fabricId}-hint`}
          >
            {limits.fabric_counts.map((count) => (
              <option key={count} value={count}>
                Aida {count}
                {count === limits.default_fabric_count ? ' (a mais comum)' : ''}
              </option>
            ))}
          </select>
          <p id={`${fabricId}-hint`} className="controls__hint">
            Aida é o tecido quadriculado do ponto cruz. O número diz quantos quadradinhos cabem em uma
            polegada (2,5 cm): quanto maior o número, menores os quadradinhos e o bordado.
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
      </details>
    </fieldset>
  )
}
