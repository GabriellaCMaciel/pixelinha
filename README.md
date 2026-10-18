# PixeLinha 🧵

> Aplicação web que transforma uma imagem em gráficos de bordado, começando pelo **ponto cruz**.

**Status:** 📝 Planejamento · **Versão do documento:** 0.1

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Objetivos](#2-objetivos)
3. [Escopo da v1 (MVP)](#3-escopo-da-v1-mvp)
4. [Histórias de usuário](#4-histórias-de-usuário)
5. [Requisitos](#5-requisitos)
6. [Arquitetura e stack](#6-arquitetura-e-stack)
7. [Pipeline do ponto cruz](#7-pipeline-do-ponto-cruz)
8. [Modelo de dados](#8-modelo-de-dados)
9. [API](#9-api)
10. [Telas](#10-telas)
11. [Estrutura de pastas](#11-estrutura-de-pastas)
12. [Roadmap por fases](#12-roadmap-por-fases)
13. [Hospedagem gratuita](#13-hospedagem-gratuita)
14. [Testes e qualidade](#14-testes-e-qualidade)
15. [Convenções](#15-convenções)
16. [Riscos e decisões em aberto](#16-riscos-e-decisões-em-aberto)
17. [Pós-MVP](#17-pós-mvp)
18. [English summary](#18-english-summary)

---

## 1. Visão geral

O usuário sobe uma imagem, escolhe o tamanho da grade e a quantidade de cores, e o sistema devolve:

- um **gráfico de ponto cruz** (grade com um símbolo por cor);
- uma **legenda** com as linhas do catálogo DMC (código, nome, cor e quantidade de pontos);
- um **PDF para imprimir**.

O processamento de imagem roda **no servidor** (Python), e o front-end (React) mostra um preview interativo. O usuário pode criar conta e salvar seus projetos.

## 2. Objetivos

**Do projeto**
- Entregar um produto full stack completo, do upload ao deploy, com URL pública no portfólio.
- Mostrar processamento de imagem no back-end, autenticação, persistência, geração de PDF e boa organização de código.

**De aprendizado**
- Visão computacional básica (redimensionamento, quantização de cores, espaço de cor Lab).
- Arquitetura em módulos (um módulo por tipo de ponto), pensando na expansão futura.
- Deploy gratuito de uma API Python em contêiner.

**Fora do objetivo (por enquanto):** uso de IA/LLM. Fica como evolução futura (ver [Pós-MVP](#17-pós-mvp)).

## 3. Escopo da v1 (MVP)

### Dentro
- Upload de imagem (PNG/JPG/WEBP).
- Geração do gráfico de **ponto cruz** com parâmetros ajustáveis.
- Casamento de cores com o catálogo **DMC**.
- Preview com zoom, símbolos e legenda.
- Cadastro/login e **salvar, listar, abrir e excluir** projetos.
- **Exportar PDF** (grade + legenda).
- Deploy público (front e API).

### Fora (vira roadmap)
- Ponto atrás, nó francês, ponto cheio e ponto corrente.
- Edição manual da grade (pintar célula a célula).
- Outros catálogos de linha (Anchor, etc.).
- Compartilhamento público de projetos.

## 4. Histórias de usuário

| ID | Como... | Quero... | Para... |
|----|---------|----------|---------|
| US01 | visitante | enviar uma imagem e ver o gráfico sem criar conta | testar a ferramenta rápido |
| US02 | usuária | ajustar nº de cores e tamanho da grade | controlar a dificuldade do bordado |
| US03 | usuária | ver a legenda com códigos DMC e quantidade de pontos | saber quais linhas comprar |
| US04 | usuária | dar zoom no gráfico | conferir os símbolos de perto |
| US05 | usuária | criar conta e salvar projetos | voltar a eles depois |
| US06 | usuária | baixar um PDF | imprimir e bordar |

## 5. Requisitos

### Funcionais

| ID | Requisito | Prioridade |
|----|-----------|-----------|
| RF01 | Aceitar upload de imagem (PNG, JPG, WEBP) com limite de tamanho | Alta |
| RF02 | Redimensionar para a grade escolhida mantendo a proporção | Alta |
| RF03 | Reduzir a imagem a N cores (k-means) | Alta |
| RF04 | Casar cada cor com a linha DMC mais próxima | Alta |
| RF05 | Atribuir um símbolo único a cada cor | Alta |
| RF06 | Calcular a quantidade de pontos por cor | Alta |
| RF07 | Exibir o gráfico com zoom e a legenda | Alta |
| RF08 | Cadastro, login e logout | Média |
| RF09 | Salvar, listar, abrir e excluir projetos | Média |
| RF10 | Exportar PDF com grade, legenda e lista de linhas | Média |
| RF11 | Estimar a quantidade de linha conforme a contagem do tecido (ex.: Aida 14) | Baixa |

### Não funcionais

- **Desempenho:** preview em poucos segundos para grades de tamanho comum.
- **Segurança:** validar tipo e tamanho do arquivo; cada usuária acessa só os próprios projetos (RLS no Supabase).
- **Usabilidade:** funcionar bem no celular.
- **Manutenibilidade:** um módulo por tipo de ponto, com testes na parte de processamento.
- **Custo:** R$ 0 de infraestrutura na v1.

> **Limites padrão** (configuráveis por variáveis de ambiente `PIXELINHA_*`, por exemplo `PIXELINHA_MAX_GRID_WIDTH=400`): upload de até 10 MB; grade de 10 a 300 pontos de largura; de 1 a 40 cores; até 90 mil pontos no total. A ideia é não frustrar quem usa fotos de celular e gráficos grandes, sem deixar o servidor gratuito sobrecarregado.

## 6. Arquitetura e stack

```
┌──────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│  Front-end (React)   │ ───────────────────────► │  API (FastAPI)            │
│  Vercel              │ ◄─────────────────────── │  Render (Docker)          │
│  upload, preview,    │                          │  OpenCV, Pillow,          │
│  zoom, projetos      │                          │  scikit-learn, ReportLab  │
└─────────┬────────────┘                          └──────────────┬────────────┘
          │ login (JWT)                                          │ valida JWT, lê/grava
          ▼                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Supabase: Auth + PostgreSQL + Storage (imagens originais e PDFs)            │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| Front-end | React + Vite | Ecossistema conhecido, deploy simples na Vercel |
| API | Python + FastAPI | Tipagem, validação automática e docs OpenAPI |
| Imagem | OpenCV + Pillow | Redimensionamento e conversão de espaço de cor |
| Cores | scikit-learn (k-means) | Quantização de paleta |
| PDF | ReportLab | Controle total do layout da grade |
| Auth e banco | Supabase (Auth + PostgreSQL) | Gratuito, com login pronto e RLS |
| Arquivos | Supabase Storage | Imagem original e PDF gerado |
| Hospedagem da API | Render (Docker) | Plano gratuito sem cartão; 512 MB de RAM; dorme após 15 min sem uso |

## 7. Pipeline do ponto cruz

Entrada: imagem + `largura_grade`, `n_cores`, parâmetros opcionais. Saída: grade de índices + paleta + contagens.

1. **Validar** tipo, tamanho em bytes e dimensões do arquivo.
2. **Tratar transparência:** compor sobre fundo branco (ou fundo escolhido).
3. **Redimensionar** para a grade, mantendo a proporção (altura calculada). Usar interpolação de média de área (`INTER_AREA`) ao reduzir.
4. **Converter para o espaço Lab**, onde a distância entre cores se aproxima melhor da percepção humana.
5. **Quantizar com k-means** em `n_cores` clusters (semente fixa para resultado reproduzível).
6. **Casar com o DMC:** para cada centro de cluster, achar a linha DMC mais próxima em Lab.
7. **Resolver duplicatas:** se dois clusters caírem na mesma linha DMC, fundi-los.
7b. **Fundo sem ponto (opcional):** com `ignore_background`, a cor mais comum na borda da imagem vira o tecido liso, sem ponto. Também é possível escolher qual linha ignorar com `background_code`. Para um desenho de uma cor só, peça 2 cores (uma para o desenho e outra para o fundo) e ignore o fundo.
8. **Atribuir símbolos** únicos por cor (conjunto de símbolos legíveis em impressão pequena).
9. **Contar pontos** por cor e total.
10. **Montar a resposta** em JSON: dimensões, paleta (código DMC, nome, RGB, símbolo, contagem) e a matriz da grade.

**Opções a avaliar nos testes:** suavização antes da quantização (ex.: filtro bilateral), tamanho mínimo de "mancha" de cor para evitar pontos soltos e opção de ignorar o fundo.

**Tamanho e estimativa de linha (RF11):** feitos em `services/estimate.py`, para tecido Aida de 11 a 22 pontos por polegada (padrão 14).
- **Tamanho:** cada ponto mede `2,54 cm ÷ contagem`. A largura em cm é a largura do gráfico vezes isso.
- **Linha por cruz** (para um fio): duas diagonais na frente (`2 × √2`) mais cerca de dois lados de caminho no verso, tudo em múltiplos do lado do ponto. Multiplica pelo número de fios (padrão 2) e por 1,5 de folga para as pontas e sobras.
- **Novelos:** um novelo DMC tem 8 m e 6 fios (4.800 cm de fio). Divide-se o fio necessário por isso e arredonda-se para cima; toda cor usada pede pelo menos 1 novelo. Em Aida 14 com 2 fios, 1 novelo rende cerca de 1.800 pontos.
- É uma **estimativa para planejar**, sempre inclinada a sobrar um pouco, e é dita assim na legenda e no PDF.

## 8. Modelo de dados

O cadastro de usuárias fica a cargo do Supabase Auth. O catálogo DMC pode ficar em um arquivo versionado no repositório (`backend/app/data/dmc.json`), já que é pequeno e estático.

### Tabela `projects`

| Campo | Tipo | Observação |
|-------|------|-----------|
| `id` | uuid (PK) | gerado automaticamente |
| `user_id` | uuid (FK → auth.users) | dona do projeto |
| `name` | text | nome dado pela usuária |
| `mode` | text | `cross_stitch` na v1 (pronto para novos modos) |
| `original_image_path` | text | caminho no Storage |
| `params` | jsonb | largura da grade, nº de cores, opções |
| `result` | jsonb | paleta, contagens e matriz da grade |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Segurança:** habilitar **Row Level Security** com política `user_id = auth.uid()` para leitura, escrita e exclusão.

## 9. API

Prefixo `/api/v1`. Rotas protegidas exigem o token do Supabase no cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | não | Verificação de saúde |
| POST | `/cross-stitch/preview` | não | Recebe imagem + parâmetros e devolve grade, paleta e contagens |
| POST | `/projects` | sim | Salva um projeto (imagem + parâmetros + resultado) |
| GET | `/projects` | sim | Lista os projetos da usuária |
| GET | `/projects/{id}` | sim | Abre um projeto |
| DELETE | `/projects/{id}` | sim | Exclui um projeto |
| POST | `/cross-stitch/pdf` | não | Mesmos dados do preview + tecido, título e estilo; devolve o PDF para baixar |
| GET | `/projects/{id}/pdf` | sim | Gera e devolve o PDF de um projeto salvo |

**Erros padronizados:** `400` (imagem corrompida), `401` (sem login), `404` (não encontrado), `413` (arquivo ou imagem grande demais), `415` (formato não suportado), `422` (parâmetros fora dos limites ou gráfico grande demais para a imagem).

O corpo dos erros segue o formato `{"detail": {"code": "...", "message": "...", ...}}`. O `code` é estável (ex.: `invalid_grid_width`, `invalid_colors`, `file_too_large`, `image_too_large`, `unsupported_format`, `corrupted_image`, `too_many_stitches`), para o front-end mostrar a mensagem traduzida. No caso de `too_many_stitches`, a resposta traz o `max_grid_width` aceito para aquela imagem.

**`POST /cross-stitch/preview`:** recebe `multipart/form-data` com `image` (arquivo) e, opcionalmente, `grid_width` (padrão 100), `n_colors` (padrão 16), `ignore_background` (padrão falso) e `background_code` (código DMC de uma cor do gráfico para deixar sem ponto). Devolve `width`, `height`, `total_stitches` (só os pontos a bordar), `colors` (código DMC, nome, hex, rgb, símbolo e contagem), `grid` (matriz com o índice da cor de cada ponto, ou `-1` para uma célula sem ponto) e `background` (a linha ignorada e quantas células ela cobre, ou `null`).

Erros extras desse recurso (`422`): `nothing_to_stitch` (só sobrou fundo) e `background_not_in_palette` (a resposta traz as linhas disponíveis em `available`).

**Tecido e novelos:** o preview também aceita `fabric_count` (contagem Aida, padrão 14) e devolve `fabric` (`count`, `width_cm`, `height_cm`) e, em cada cor, `skeins` (novelos estimados). Uma contagem fora da lista dá `422 invalid_fabric_count`, com as opções em `allowed`. O `GET /limits` lista as contagens em `fabric_counts` e `default_fabric_count`.

**`POST /cross-stitch/pdf`:** recebe os mesmos campos do preview e mais `title` (opcional, até 60 caracteres) e `style` (`color`, padrão, ou `bw`). Gera o gráfico do mesmo jeito que o preview e devolve `application/pdf` como download (`Content-Disposition: attachment`, com o nome feito a partir do título). Estilo inválido dá `422 invalid_style`. Os demais erros são os do preview.

**O PDF** (ReportLab, A4, em português) tem: capa com a prévia do gráfico (com o número da página de cada parte), tamanho, tecido sugerido e dicas de leitura; legenda com símbolo, código DMC, nome, pontos e novelos por cor; e o gráfico em páginas de 40 × 60 pontos, com números de linhas e colunas, linhas grossas a cada 10 pontos (alinhadas entre as páginas) e setas no centro. As fontes DejaVu Sans vão junto no repositório para todos os símbolos saírem na impressão.

## 10. Telas

1. **Home / Editor:** upload, escolha de parâmetros (sliders) e preview ao lado.
2. **Preview do gráfico:** grade com zoom e rolagem, símbolos visíveis e legenda lateral.
3. **Login / Cadastro.**
4. **Meus projetos:** lista com miniatura, nome e data.
5. **Detalhe do projeto:** o mesmo preview, com botão de baixar PDF e excluir.

## 11. Estrutura de pastas

Monorepo, com a lógica de cada ponto isolada em um módulo.

```
pixelinha/
├── README.md
├── frontend/
│   ├── src/
│   │   ├── components/      # Uploader, GridViewer, Legend, Controls
│   │   ├── pages/           # Editor, Projects, Login
│   │   ├── services/        # chamadas à API e ao Supabase
│   │   └── main.jsx
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py          # criação do app e rotas
│   │   ├── api/             # routers (cross_stitch, projects)
│   │   ├── core/            # config, auth (validação do JWT)
│   │   ├── modes/           # um módulo por ponto
│   │   │   └── cross_stitch.py
│   │   ├── services/        # palette.py (DMC), pdf.py, storage.py
│   │   ├── data/dmc.json
│   │   └── schemas/         # modelos Pydantic
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
└── docs/                    # decisões, capturas de tela
```

## 12. Roadmap por fases

> As estimativas assumem algumas horas por dia e podem encurtar conforme o ritmo. Cada fase termina com algo funcionando e commitado.

### Fase 0: Preparação (~1 dia)
- [x] Criar o repositório e a estrutura de pastas
- [x] Projeto base do FastAPI com `/health`
- [x] Projeto base do React (Vite)
- [ ] Criar projeto no Supabase
- [x] Obter e organizar a tabela DMC (conferir a licença da fonte)

### Fase 1: Motor do ponto cruz (~2–3 dias)
- [x] Redimensionar mantendo a proporção
- [x] Quantização com k-means em Lab
- [x] Casamento com o DMC e fusão de duplicatas
- [x] Símbolos e contagem de pontos
- [x] Rota `POST /cross-stitch/preview`
- [x] Opção de deixar o fundo sem ponto (útil para desenhos de uma cor)
- [x] Testes unitários do módulo

### Fase 2: Front-end do editor (~2–3 dias)
- [x] Upload (arrastar e soltar, com imagem de exemplo) e controles (sliders, fundo sem ponto)
- [x] Renderização da grade (canvas) com zoom e rolagem
- [x] Legenda com símbolos, códigos e contagens (clicar numa linha destaca a cor no gráfico)
- [x] Estados de carregamento e de erro
- [x] Layout responsivo

### Fase 3: Login e projetos (~2 dias)
- [ ] Cadastro e login com Supabase Auth
- [ ] Tabela `projects` + RLS
- [ ] Rotas de salvar, listar, abrir e excluir
- [ ] Telas "Meus projetos" e detalhe

### Fase 4: PDF e deploy (~2 dias)
- [x] Geração do PDF (grade paginada + legenda), com tecido, tamanho em cm e novelos
- [x] Dockerfile, CORS por variável de ambiente e `render.yaml` para o deploy da API no Render
- [ ] API no ar no Render
- [ ] Front no ar na Vercel
- [ ] Teste de ponta a ponta em produção

### Fase 5: Acabamento (~1–2 dias)
- [ ] README final com capturas de tela e GIF de demonstração
- [ ] Revisão de acessibilidade e de mensagens de erro
- [ ] Atualizar o portfólio com o link e a descrição

## 13. Hospedagem gratuita

| Parte | Serviço | Observações |
|-------|---------|-------------|
| Front-end | Vercel | Plano gratuito |
| API | Render (Docker) | Plano gratuito: 0,1 CPU e 512 MB de RAM; dorme após 15 min sem visitas e leva cerca de 1 min para acordar |
| Banco, auth e arquivos | Supabase | Plano gratuito, com limites de armazenamento |

**Cuidados**
- A API escuta na porta da variável `PORT` (o Render usa 10000 por padrão). Não usar `--reload` em produção.
- Com só 512 MB de memória, o limite de imagem em produção é de 16 megapixels (`PIXELINHA_MAX_IMAGE_PIXELS`, definido no `render.yaml`).
- O Hugging Face Spaces com Docker deixou de ser gratuito em 2026 (passou a exigir o plano PRO), por isso a API está no Render.
- O sistema de arquivos do plano gratuito é efêmero, então **nada importante deve ser salvo em disco local**: tudo vai para o Supabase.
- Se a API estiver dormindo, o primeiro acesso demora. Mostrar uma mensagem de "acordando o servidor" no front.
- Configurar CORS apenas para o domínio do front.
- Nunca commitar chaves: usar variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_KEY`, etc.).
- Limites e regras de planos gratuitos mudam, então conferir na hora do deploy.

### Como publicar (passo a passo)

**1. API no Render**
1. Em render.com, entre com a conta do GitHub (*Sign in with GitHub*) e autorize o repositório `pixelinha`.
2. No painel, *New +* → *Blueprint* → escolha o repositório. O Render lê o `render.yaml`, mostra o serviço `pixelinha-api` no plano *Free* e pede para confirmar (*Deploy Blueprint*).
3. Espere o build (alguns minutos). No topo da página do serviço aparece o endereço, algo como `https://pixelinha-api.onrender.com`. Teste abrindo `/api/v1/health` nesse endereço.
4. Todo push em `main` que mexer em `backend/` publica de novo, sozinho.

**2. Front na Vercel**
1. Em vercel.com, *Add New → Project* e importe este repositório.
2. Em *Root Directory*, escolha `frontend`.
3. Faça o deploy. O endereço da API já está em `frontend/.env.production` (`VITE_API_URL`); se a API mudar de endereço, edite esse arquivo (ou crie `VITE_API_URL` em *Settings → Environment Variables* na Vercel, que tem prioridade) e publique de novo.
4. Se o endereço do site na Vercel não começar com `pixelinha` (por exemplo, o nome estava ocupado), ajuste `PIXELINHA_ALLOWED_ORIGIN_REGEX` no painel do Render (*Environment*) para incluir o endereço real.

**3. Acordar a API (opcional)**
Crie a variável `API_URL` no GitHub (o mesmo endereço da API). Antes de mostrar o projeto a alguém, rode *Actions → Wake the API → Run workflow* e espere cerca de 1 minuto.

## 14. Testes e qualidade

- **Back-end (pytest):** redimensionamento, número de cores no resultado, casamento DMC, símbolos únicos, soma das contagens igual ao total de pontos, rejeição de arquivo inválido.
- **Reprodutibilidade:** mesma imagem e parâmetros devem dar o mesmo resultado (semente fixa no k-means).
- **Front-end:** testes dos componentes principais e teste manual em celular.
- **Qualidade de código:** formatação e lint (Ruff/Black no Python, ESLint/Prettier no React).
- **CI (opcional):** GitHub Actions rodando testes a cada push.

## 15. Convenções

- **Branches:** `main` estável e `feat/...`, `fix/...` para trabalho.
- **Commits em inglês**, curtos e no imperativo, com prefixo de tipo (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Corpo da mensagem só quando for útil:
  - `feat: add k-means color quantization`
  - `fix: handle transparent PNG background`
  - `docs: update roadmap`
- **Um commit por feature (ou correção).** Cada item do roadmap vira um commit pequeno e coeso, sem misturar assuntos diferentes. Os testes de uma feature entram no mesmo commit dela ou em um `test:` logo em seguida.
- **Autoria:** commits feitos com o nome e o e-mail da própria conta do GitHub, para contarem no gráfico de contribuições.
- **Código** (nomes de funções, variáveis e comentários) em inglês; documentação em português com resumo em inglês.

## 16. Riscos e decisões em aberto

| Risco / dúvida | Mitigação |
|----------------|-----------|
| Resultado "sujo" em fotos complexas | Oferecer suavização e limite de cores; sugerir imagens simples nos exemplos |
| API dormindo na hospedagem gratuita | Aviso no front; medir o tempo real de despertar |
| Licença da tabela DMC | Resolvido: dados sob CC BY 4.0, com crédito na seção "Créditos" |
| Imagens grandes travando o servidor | Limites de tamanho e de grade, mais timeout |
| Armazenamento limitado no plano gratuito | Limitar o tamanho das imagens e apagar arquivos órfãos |

**Decisões em aberto:** conjunto final de símbolos. Nome definido: PixeLinha. Decidido por enquanto: visitantes **podem** baixar o PDF sem login (se isso mudar, é só proteger a rota). A identidade visual é a paleta Petal Dream.

## 17. Pós-MVP

Cada novo ponto vira um módulo em `backend/app/modes/` e uma opção no seletor de modo.

1. **Ponto atrás (contorno):** detecção de bordas e vetorização em linhas contínuas.
2. **Nó francês / pontilhismo:** pontos espalhados com densidade conforme o tom da imagem (stippling).
3. **Ponto corrente:** segue os contornos com a textura de corrente.
4. **Ponto cheio (cetim):** divisão em regiões de cor com direção do fio. É o mais complexo.
5. **Edição manual** da grade, outros catálogos de linha e compartilhamento de projetos.
6. **Recursos com IA** (segunda fase do projeto): sugestão automática de parâmetros, melhoria de imagens e remoção de fundo.

## Testar no navegador

Sem instalar nada: o repositório tem uma configuração para o **GitHub Codespaces** (um computador temporário na nuvem, grátis dentro da cota mensal da conta pessoal).

1. No repositório no GitHub, clique em **Code** → aba **Codespaces** → **Create codespace on main**.
2. Espere a instalação (alguns minutos na primeira vez). Quando terminar, o app abre numa aba do navegador. Se não abrir, vá na aba **Ports** do editor e clique no globo ao lado de **PixeLinha**.
3. Para reabrir depois, volte em **Code** → **Codespaces** e escolha o existente. Os servidores sobem sozinhos.

O Codespace para sozinho após um tempo parado; para apagar, use a lista em github.com/codespaces.

Para rodar na própria máquina, veja `backend/` (FastAPI) e `frontend/README.md`.

## Créditos

- **Cores DMC:** Color data: craft-color-codes by [MakeBead](https://makebead.com), licenciado sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Mais detalhes em `backend/app/data/README.md`.
- **Fonte do PDF:** DejaVu Sans (Bitstream Vera, com alterações em domínio público). A licença está em `backend/app/data/fonts/LICENSE-DejaVu.txt`.
- DMC é uma marca registrada de seu titular. Este projeto não é afiliado nem endossado pela DMC.

---

## 18. English summary

**PixeLinha** is a full-stack web app that converts an uploaded image into embroidery charts, starting with **cross-stitch**. The user picks a grid size and number of colors, and the app returns a symbol chart, a thread legend matched to the **DMC** catalog (with stitch counts), and a printable **PDF**.

**Stack:** React + Vite (Vercel) · Python/FastAPI with OpenCV, Pillow, scikit-learn and ReportLab (Render, Docker) · Supabase for auth, PostgreSQL and storage. The whole setup runs on free tiers.

**Core pipeline:** resize preserving aspect ratio → convert to Lab color space → k-means color quantization → nearest DMC thread match → symbol assignment → stitch counts.

**MVP scope:** cross-stitch mode only, image upload, interactive preview with zoom, user accounts, saved projects, PDF export, and public deployment.

**Roadmap:** backstitch, French knots/stippling, chain stitch and satin stitch are planned as separate modules, each added as a new mode on top of the same architecture. AI features are intentionally postponed to a later phase.
