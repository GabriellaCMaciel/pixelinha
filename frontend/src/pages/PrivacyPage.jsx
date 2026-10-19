import { Link } from 'react-router-dom'
import { LEGAL } from '../lib/legalInfo.js'
import LegalPage, { Section } from './LegalPage.jsx'

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Aqui explicamos, sem juridiquês, quais dados o PixeLinha usa, para quê, com quem eles passam, por quanto tempo ficam e como você pode vê-los, corrigi-los ou apagá-los. Seguimos a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018)."
    >
      <Section title="1. Quem é responsável pelos seus dados">
        <p>
          O PixeLinha é um projeto pessoal de {LEGAL.owner}, que decide como os dados são usados. Para falar sobre
          os seus dados: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </Section>

      <Section title="2. Quais dados usamos">
        <p>
          <strong>Se você só gerar o gráfico, sem conta:</strong> a foto que você escolhe é enviada ao servidor do
          PixeLinha apenas para criar o gráfico e o PDF. Ela é processada na memória e <strong>não é guardada</strong>{' '}
          por nós. Como em qualquer site, os servidores registram dados técnicos de acesso (como o endereço IP e o
          horário) por motivos de segurança e funcionamento.
        </p>
        <p>
          <strong>Se você criar uma conta:</strong>
        </p>
        <ul>
          <li>o seu e-mail e a sua senha (a senha é guardada apenas de forma embaralhada, nunca em texto legível, e nem nós conseguimos ver);</li>
          <li>o nome ou apelido, se você quiser informar (é opcional);</li>
          <li>a data e a versão dos termos que você aceitou;</li>
          <li>os bordados que você salvar: título, escolhas de tamanho e cores, a foto original e uma miniatura;</li>
          <li>os nomes das pastas que você criar.</li>
        </ul>
        <p>Não pedimos CPF, telefone, endereço, localização nem dados de pagamento.</p>
      </Section>

      <Section title="3. Para que usamos e em que se baseia a LGPD">
        <div className="legal__table-wrap">
          <table className="legal__table">
            <thead>
              <tr>
                <th scope="col">Para quê</th>
                <th scope="col">Dados</th>
                <th scope="col">Base legal (LGPD, art. 7)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gerar o gráfico e o PDF que você pediu</td>
                <td>Foto e escolhas de tamanho e cores</td>
                <td>Execução do serviço que você pediu (inciso V)</td>
              </tr>
              <tr>
                <td>Criar e manter a sua conta, entrar nela e guardar os bordados</td>
                <td>E-mail, senha, bordados, pastas</td>
                <td>Execução do serviço que você pediu (inciso V)</td>
              </tr>
              <tr>
                <td>Chamar você pelo nome</td>
                <td>Nome ou apelido</td>
                <td>Seu consentimento, que você pode retirar a qualquer momento (inciso I)</td>
              </tr>
              <tr>
                <td>Guardar a prova de que você aceitou estes textos</td>
                <td>Data e versão dos termos</td>
                <td>Exercício regular de direitos (inciso VI)</td>
              </tr>
              <tr>
                <td>Segurança, evitar abusos e corrigir falhas</td>
                <td>Dados técnicos de acesso</td>
                <td>Legítimo interesse (inciso IX)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Não vendemos os seus dados, não fazemos propaganda e não criamos perfis sobre você. Também não usamos suas
          fotos para treinar inteligência artificial.
        </p>
      </Section>

      <Section title="4. Com quem os dados passam">
        <p>Usamos serviços de terceiros para o site funcionar. Eles tratam os dados só para isso:</p>
        <ul>
          <li>
            <strong>Supabase</strong>: login, banco de dados e armazenamento das fotos de quem tem conta.
          </li>
          <li>
            <strong>Vercel</strong>: hospedagem do site que você abre no navegador.
          </li>
          <li>
            <strong>Render</strong>: servidor que transforma a foto em gráfico e PDF.
          </li>
        </ul>
        <p>
          Alguns desses serviços podem processar dados em servidores fora do Brasil, como nos Estados Unidos. Isso é
          feito com os cuidados previstos na LGPD (art. 33). Fora esses serviços, só entregamos dados se uma lei ou
          uma ordem judicial exigir.
        </p>
      </Section>

      <Section title="5. Por quanto tempo guardamos">
        <ul>
          <li>Sem conta: a foto não fica guardada depois que o gráfico ou o PDF é entregue.</li>
          <li>Com conta: guardamos enquanto você mantiver a conta. Você pode apagar um bordado ou uma pasta quando quiser.</li>
          <li>
            Ao apagar a conta, o e-mail, o nome, os bordados, as pastas e as fotos são removidos. Cópias de segurança
            dos serviços podem demorar um pouco para desaparecer.
          </li>
          <li>Registros técnicos de acesso ficam por pouco tempo, conforme cada serviço de hospedagem.</li>
        </ul>
      </Section>

      <Section title="6. Seus direitos">
        <p>Pela LGPD (art. 18), você pode pedir a qualquer momento, de graça:</p>
        <ul>
          <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
          <li>corrigir dados incompletos ou errados;</li>
          <li>apagar os dados ou pedir que fiquem anônimos;</li>
          <li>receber uma cópia dos seus dados;</li>
          <li>saber com quem os dados foram compartilhados;</li>
          <li>retirar o consentimento e saber o que acontece se não consentir.</li>
        </ul>
        <p>
          Você mesmo pode apagar bordados, pastas e a conta inteira na página <Link to="/meus-bordados">Meus bordados</Link>.
          Para os outros pedidos, escreva para <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
          Respondemos em até 15 dias. Se achar que seus direitos não foram respeitados, você também pode reclamar à
          Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.
        </p>
      </Section>

      <Section title="7. Como protegemos seus dados">
        <ul>
          <li>A conexão com o site é protegida (HTTPS).</li>
          <li>As senhas são guardadas de forma embaralhada, nunca em texto legível.</li>
          <li>Cada pessoa só consegue ver as próprias pastas, bordados e fotos. Essa regra vale no banco de dados, e não apenas na tela.</li>
          <li>As fotos ficam em um espaço privado, sem endereço público.</li>
          <li>Na tela principal mostramos só o seu nome, ou o e-mail com a maior parte escondida.</li>
        </ul>
        <p>
          Nenhum sistema é 100% seguro. Use uma senha só sua, que você não use em outros sites. Se houver um
          incidente que possa prejudicar você, avisaremos você e a ANPD, como a lei pede.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Não usamos cookies de propaganda nem de rastreamento. Veja os detalhes na{' '}
          <Link to="/cookies">Política de Cookies</Link>.
        </p>
      </Section>

      <Section title="9. Crianças e adolescentes">
        <p>
          O PixeLinha não é feito para crianças. Quem tem menos de 18 anos só deve criar conta com a ajuda e a
          permissão de um responsável.
        </p>
      </Section>

      <Section title="10. Mudanças nesta política">
        <p>
          Se algo mudar, atualizamos esta página e a data no topo. Em mudanças importantes, avisamos no próprio site.
        </p>
      </Section>
    </LegalPage>
  )
}
