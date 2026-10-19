import { Link } from 'react-router-dom'
import './SiteFooter.css'

export default function SiteFooter() {
  return (
    <footer className="footer">
      <hr className="stitch-rule" />
      <nav className="footer__links" aria-label="Documentos do site">
        <Link to="/termos">Termos de Uso</Link>
        <Link to="/privacidade">Política de Privacidade</Link>
        <Link to="/cookies">Política de Cookies</Link>
      </nav>
      <p className="footer__note">
        PixeLinha é um projeto pessoal, gratuito e sem anúncios. DMC é uma marca de seu dono, e o site não é
        afiliado a ela.
      </p>
    </footer>
  )
}
