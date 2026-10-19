import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="legal">
      <article className="legal__sheet">
        <h1 className="legal__title">Página não encontrada</h1>
        <p className="legal__intro">
          Não achamos o endereço que você abriu. Ele pode ter mudado ou ter sido digitado com algum erro.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link className="btn" to="/">
            Ir para o início
          </Link>
        </p>
      </article>
    </main>
  )
}
