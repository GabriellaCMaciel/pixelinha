import { textColorFor } from '../lib/chartRender.js'
import './Legend.css'

const number = new Intl.NumberFormat('pt-BR')
const centimeters = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Thread list for the chart. Picking a row highlights that thread in the viewer.
 */
export default function Legend({ chart, highlight = null, onHighlight }) {
  const { colors, total_stitches: total, background, fabric } = chart
  const totalSkeins = colors.reduce((sum, color) => sum + color.skeins, 0)

  return (
    <section className="legend" aria-label="Legenda de linhas">
      <header className="legend__header">
        <h2 className="legend__title">Linhas que você vai usar</h2>
        <p className="legend__total">
          {colors.length} {colors.length === 1 ? 'cor' : 'cores'} e {number.format(total)}{' '}
          {total === 1 ? 'ponto' : 'pontos'}
        </p>
        {fabric && (
          <p className="legend__size">
            Tamanho pronto: {centimeters.format(fabric.width_cm)} × {centimeters.format(fabric.height_cm)} cm
            (tecido Aida {fabric.count})
          </p>
        )}
        <p className="legend__help">
          DMC é a marca das linhas. Toque numa linha da lista para ver onde ela aparece no gráfico.
        </p>
      </header>

      <hr className="stitch-rule" />

      <ul className="legend__list">
        {colors.map((color, index) => {
          const active = highlight === index
          return (
            <li key={color.code}>
              <button
                type="button"
                className={`legend__row${active ? ' legend__row--active' : ''}`}
                aria-pressed={active}
                onClick={() => onHighlight?.(active ? null : index)}
              >
                <span
                  className="legend__swatch"
                  style={{ backgroundColor: color.hex, color: textColorFor(color.rgb) }}
                  aria-hidden="true"
                >
                  {color.symbol}
                </span>
                <span className="legend__name">
                  <span className="legend__code">DMC {color.code}</span>
                  <span className="legend__label">{color.name}</span>
                </span>
                <span className="legend__count">
                  {number.format(color.count)}
                  <span className="legend__skeins">
                    {color.skeins} {color.skeins === 1 ? 'novelo' : 'novelos'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="legend__skein-total">
        Estimativa: {totalSkeins} {totalSkeins === 1 ? 'novelo' : 'novelos'} no total
      </p>

      {background && (
        <p className="legend__background">
          <span
            className="legend__chip"
            style={{ backgroundColor: background.hex }}
            aria-hidden="true"
          />
          Fundo sem ponto: DMC {background.code} ({background.name})
        </p>
      )}
    </section>
  )
}
