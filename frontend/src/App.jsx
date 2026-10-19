import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import AccountMenu from './components/AccountMenu.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import StitchFlower from './components/StitchFlower.jsx'
import logo from './assets/pixelinha-logo.svg'
import { useAuth } from './hooks/useAuth.js'
import CookiesPage from './pages/CookiesPage.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import './App.css'

/** Start every page at the top, as a new page would. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo?.(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const auth = useAuth()
  const { pathname } = useLocation()
  // Only the home page has the logo as its main heading; the others have their own.
  const Title = pathname === '/' ? 'h1' : 'p'

  return (
    <div className="page">
      <ScrollToTop />
      <header className="page__header">
        <div className="page__bar">
          <div className="page__brand">
            <StitchFlower size={76} />
            <div>
              <Title className="page__title">
                <Link to="/" className="page__home">
                  <span className="visually-hidden">PixeLinha</span>
                  <img className="page__logo" src={logo} alt="" aria-hidden="true" />
                </Link>
              </Title>
              <p className="page__tagline">Transforme qualquer imagem em gráfico de ponto cruz.</p>
            </div>
          </div>
          <AccountMenu auth={auth} />
        </div>
        <hr className="stitch-rule" />
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <SiteFooter />
    </div>
  )
}
