import { LEGAL } from '../lib/legalInfo.js'
import LegalPage, { Section } from './LegalPage.jsx'

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="Estas são as regras para usar o PixeLinha, escritas em linguagem simples. Ao criar uma conta ou usar o site, você concorda com elas. Se alguma parte não fizer sentido para você, escreva para a gente antes de usar."
    >
      <Section title="1. O que é o PixeLinha">
        <p>
          O PixeLinha é um site gratuito que transforma uma imagem em um gráfico de ponto cruz: ele escolhe linhas
          DMC parecidas com as cores da imagem, mostra o gráfico na tela e gera um PDF para imprimir. Quem tem uma
          conta também pode guardar os bordados e organizá-los em pastas.
        </p>
        <p>
          É um projeto pessoal de {LEGAL.owner}, feito para estudo e portfólio, sem fins lucrativos e sem anúncios.
        </p>
      </Section>

      <Section title="2. Usar sem conta e usar com conta">
        <p>
          Você pode gerar o gráfico e baixar o PDF sem criar conta nenhuma. A conta só é necessária para{' '}
          <strong>salvar os bordados, acessá-los depois e organizá-los em pastas</strong>.
        </p>
        <p>
          Para criar a conta você informa um e-mail e uma senha. Você é responsável por manter a senha em segredo e
          por tudo o que acontece na sua conta. Se achar que alguém descobriu sua senha, troque-a e avise a gente.
        </p>
      </Section>

      <Section title="3. Suas fotos e seus bordados">
        <p>
          As fotos e os bordados continuam sendo seus. Você nos permite apenas usá-los para fazer o que você pediu:
          gerar o gráfico, gerar o PDF e, se você escolher salvar, guardá-los na sua conta para que só você os veja.
        </p>
        <p>
          Envie somente imagens que você tem o direito de usar. Não envie imagens ilegais, que mostrem violência
          contra pessoas ou animais, conteúdo sexual explícito, ou fotos de outras pessoas (principalmente de
          crianças) sem a permissão delas ou dos responsáveis.
        </p>
      </Section>

      <Section title="4. O que você se compromete a não fazer">
        <ul>
          <li>Tentar invadir o site, quebrar a segurança ou ver dados de outras pessoas.</li>
          <li>Sobrecarregar o servidor de propósito, por exemplo com programas que enviam milhares de pedidos.</li>
          <li>Usar o site para enganar, assediar ou prejudicar alguém.</li>
          <li>Criar contas falsas em nome de outras pessoas.</li>
        </ul>
        <p>
          Se isso acontecer, a conta pode ser suspensa ou apagada, sem aviso prévio quando houver risco para o site
          ou para outras pessoas.
        </p>
      </Section>

      <Section title="5. Como o site funciona na prática">
        <ul>
          <li>
            <strong>O resultado é uma estimativa.</strong> As cores da tela nunca são idênticas às da linha de
            verdade, e a quantidade de novelos é um cálculo aproximado. Compare com a cartela DMC antes de comprar
            e compre um pouco a mais.
          </li>
          <li>
            <strong>O site é gratuito e pode ficar lento.</strong> Ele roda em servidores gratuitos, que
            “dormem” quando ninguém usa. Por isso a primeira visita do dia pode levar cerca de 1 minuto.
          </li>
          <li>
            <strong>Não há garantia de funcionamento contínuo.</strong> O site pode ter erros, mudar ou sair do ar,
            e os limites de tamanho de foto, de pontos e de cores podem mudar.
          </li>
          <li>
            Faça o download do PDF dos bordados importantes. Fazemos o possível para guardar suas coisas com
            segurança, mas recomendamos não depender só do site.
          </li>
        </ul>
      </Section>

      <Section title="6. Marcas e créditos">
        <p>
          DMC é uma marca de seu respectivo dono. O PixeLinha não é afiliado, patrocinado nem aprovado pela DMC.
        </p>
        <p>
          A lista de cores DMC vem do projeto craft-color-codes, de MakeBead, sob a licença CC BY 4.0. As fontes do
          site (Fredoka, Gluten e DynaPuff) são abertas, sob a licença SIL Open Font License.
        </p>
      </Section>

      <Section title="7. Responsabilidade">
        <p>
          Como o serviço é gratuito e oferecido “como está”, o PixeLinha não se responsabiliza por prejuízos como
          tecido, linhas ou tempo gastos com um bordado, nem por perda de arquivos, na medida em que a lei permitir.
          Nada nestes termos tira direitos que a lei brasileira garante a você.
        </p>
      </Section>

      <Section title="8. Encerrar a conta">
        <p>
          Você pode apagar a sua conta quando quiser, na página “Meus bordados”. Ao fazer isso, seus dados e suas
          fotos são apagados. A Política de Privacidade explica o que acontece com eles.
        </p>
      </Section>

      <Section title="9. Mudanças nestes termos">
        <p>
          Podemos atualizar estes termos. A data de “última atualização” fica no topo da página. Se a mudança for
          importante, avisaremos no site. Continuar usando depois do aviso significa que você concorda com o texto
          novo.
        </p>
      </Section>

      <Section title="10. Lei aplicável e contato">
        <p>
          Estes termos seguem as leis do Brasil. Dúvidas, pedidos e reclamações:{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </Section>
    </LegalPage>
  )
}
