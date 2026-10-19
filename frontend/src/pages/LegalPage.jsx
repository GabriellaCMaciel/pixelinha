import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LEGAL } from '../lib/legalInfo.js'
import './LegalPage.css'

/** Shared frame for the Terms, Privacy and Cookies pages. */
export default function LegalPage({ title, intro, children }) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · PixeLinha`
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <main className="legal">
      <Link className="legal__back" to="/">
        ← Voltar para o PixeLinha
      </Link>
      <article className="legal__sheet">
        <h1 className="legal__title">{title}</h1>
        <p className="legal__updated">Última atualização: {LEGAL.updatedAt}</p>
        <p className="legal__intro">{intro}</p>
        {children}
        <nav className="legal__others" aria-label="Outros documentos">
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Política de Privacidade</Link>
          <Link to="/cookies">Política de Cookies</Link>
        </nav>
      </article>
    </main>
  )
}

export function Section({ title, children }) {
  return (
    <section className="legal__section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
