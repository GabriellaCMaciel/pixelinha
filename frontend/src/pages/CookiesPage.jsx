import { Link } from 'react-router-dom'
import { LEGAL } from '../lib/legalInfo.js'
import LegalPage, { Section } from './LegalPage.jsx'

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      intro="Cookies e itens parecidos são pequenos arquivos que um site guarda no seu navegador. O PixeLinha usa só o necessário para você continuar com a conta aberta. Não usamos nada para propaganda nem para espionar o que você faz."
    >
      <Section title="1. O que usamos">
        <div className="legal__table-wrap">
          <table className="legal__table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Para quê</th>
                <th scope="col">Quanto tempo</th>
                <th scope="col">Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>sb-…-auth-token</code> (armazenamento do navegador)
                </td>
                <td>Lembrar que você entrou na sua conta, para você não digitar a senha a cada página.</td>
                <td>Até você sair da conta (a sessão se renova sozinha enquanto você usa).</td>
                <td>Essencial</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Esse item só é criado se você entrar em uma conta. Quem usa o site sem conta não recebe nenhum.
        </p>
      </Section>

      <Section title="2. O que não usamos">
        <ul>
          <li>Cookies de propaganda ou de rastreamento entre sites.</li>
          <li>Ferramentas de análise de visitas, como o Google Analytics.</li>
          <li>Botões ou vídeos de redes sociais que guardam dados sobre você.</li>
          <li>Fontes carregadas de outros sites: as letras do PixeLinha vêm do próprio site.</li>
        </ul>
        <p>
          Por usarmos apenas o essencial para o login funcionar, não mostramos aviso de cookies para aceitar ou
          recusar. Se um dia usarmos algo além disso, pediremos a sua permissão antes.
        </p>
      </Section>

      <Section title="3. Como apagar ou bloquear">
        <ul>
          <li>
            <strong>Mais fácil:</strong> toque em “Sair” no topo da página. Isso apaga o item de login deste
            navegador.
          </li>
          <li>
            Nas configurações do navegador, procure por “dados do site”, “cookies” ou “limpar dados de navegação” e
            apague os dados de <em>pixelinha.vercel.app</em>.
          </li>
        </ul>
        <p>
          Se você bloquear esse item, o site continua gerando gráficos e PDFs, mas não consegue manter você na conta.
        </p>
      </Section>

      <Section title="4. Mais informações">
        <p>
          Veja também a <Link to="/privacidade">Política de Privacidade</Link>. Dúvidas:{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </Section>
    </LegalPage>
  )
}
