import { useId } from 'react'
import './Step.css'

/**
 * One numbered step of the page. The number and the title tell people where
 * they are and what comes next; `tone` picks the color of the patch.
 */
export default function Step({ number, title, tone = 'peony', className = '', children }) {
  const titleId = useId()

  return (
    <section className={`step step--${tone} ${className}`.trim()} aria-labelledby={titleId}>
      <header className="step__header">
        <span className="step__badge" aria-hidden="true">
          {number}
        </span>
        <h2 id={titleId} className="step__title">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}
