import { Link } from 'react-router-dom'
import './SiteFooter.css'

function backToTop() {
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
  // Keyboard users continue from the top of the page, not from the end.
  document.querySelector('.page__home')?.focus({ preventScroll: true })
}

export default function SiteFooter() {
  return (
    <footer className="footer">
      <hr className="stitch-rule" />
      <div className="footer__bar">
        <nav className="footer__links" aria-label="Documentos do site">
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Política de Privacidade</Link>
          <Link to="/cookies">Política de Cookies</Link>
        </nav>
        <button type="button" className="btn footer__top" onClick={backToTop}>
          <span aria-hidden="true">↑</span> Voltar ao topo
        </button>
      </div>
      <p className="footer__note">
        PixeLinha é um projeto pessoal, gratuito e sem anúncios. DMC é uma marca de seu dono, e o site não é
        afiliado a ela.
      </p>
    </footer>
  )
}
