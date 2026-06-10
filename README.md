# A3 - APP Financeiro Meu Dinheiro

Aplicacao React desenvolvida para a disciplina **Usabilidade, desenvolvimento web, mobile e jogos** da UNA.

O **Meu Dinheiro** moderniza uma ideia de controle financeiro pessoal para web, com foco em UI/UX, responsividade, contas, cartoes, metas, relatorios, recorrencias, parcelamentos e controle multimoeda. A interface esta em **PT-BR** e os dados de demonstracao sao ficticios e genericos.

![Logo Meu Dinheiro](src/assets/logo-meu-dinheiro.png)

## Tecnologias

- React
- JavaScript
- HTML5 e CSS3
- Vite
- React Router
- lucide-react
- localStorage
- Google Sheets / GOOGLEFINANCE via Apps Script
- ExchangeRate-API e Frankfurter como fallbacks
- Vitest para testes automatizados

## Como instalar

```bash
cd C:\Projetos\a3-meu-dinheiro
npm install
```

## Como executar

```bash
npm run dev
```

Depois, acesse:

```txt
http://127.0.0.1:5173
```

## Login demo

```txt
E-mail: usuario@exemplo.com
Senha: demo123
```

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Funcionalidades

- Login local com usuario de demonstracao.
- Sidebar recolhivel com logo clicavel para o Dashboard.
- Modo claro e escuro pelo botao global no topo.
- Header responsivo com acoes no canto direito e seletor de mes em linha propria no mobile.
- MonthPicker customizado, responsivo, com popover em portal para nao cortar dentro de cards e filtros.
- DatePicker customizado para filtros, transacoes e metas, com suporte a modo claro/escuro, botao Hoje e limpeza quando permitido.
- Dashboard com saldo consolidado, receitas, despesas, balanco, valores a receber, contas, cartoes e lancamentos recentes.
- Card de balanco mensal com barra continua para receitas, despesas e valores a receber.
- CRUD de transacoes, contas, categorias, metas e cartoes.
- Transacoes com conta, categoria, cartao opcional, status, taxas, cotacao manual e cotacao automatica.
- Transacoes fixas mensais para receitas e despesas recorrentes.
- Parcelamentos com geracao automatica de parcelas mensais.
- Edicao e exclusao por escopo: somente este mes, esta e as proximas, ou toda a recorrencia.
- Ordenacao por icones nos cabecalhos da tabela de transacoes.
- Acoes rapidas para confirmar recebimento, confirmar despesa e marcar valor compartilhado como recebido.
- Relatorios com filtros, ordenacao, exportacao CSV, impressao e resumos por periodo.
- Relatorios com secao de recorrencias e parcelamentos.
- Configuracoes de moeda principal, moedas usadas, taxas padrao, cache e atualizacao de cambio.
- Estados vazios amigaveis e dados ficticios genericos.

## Cambio em tempo real

O servico fica em `src/services/exchangeApi.js`.

Ordem das fontes:

1. **Google Sheets / GOOGLEFINANCE** via Google Apps Script.
2. **ExchangeRate-API**.
3. **Frankfurter**.
4. Ultimo cache valido em `meuDinheiro.exchangeRatesCache.v1`.
5. Cotacao manual informada no formulario.

O app busca cotacoes ao abrir uma sessao, permite atualizacao manual e atualiza automaticamente a cada **5 minutos**. As chamadas simultaneas sao evitadas para nao sobrescrever o estado de cambio.

O cache salva:

- taxas;
- fonte usada;
- detalhe da fonte;
- data/hora da cotacao na fonte;
- data/hora em que o app atualizou localmente.

As datas de cotacao sao exibidas no horario local do navegador, sem fixar UTC na interface.

## Regras de transacoes e cambio

- Transacoes **confirmadas** e **pagas** entram no saldo.
- Transacoes **pendentes** e **a receber** aparecem como previsao/valor a receber.
- Transacoes canceladas nao entram nos calculos.
- Transacoes pendentes em moeda diferente usam a cotacao atual do app para exibir valor previsto.
- Ao confirmar uma transacao, o app trava cotacao, valor convertido, fonte, detalhe da fonte e data de confirmacao.
- Transacoes ja confirmadas nao sao recalculadas quando o cambio atualiza.
- Transacoes de mesma moeda usam taxa `1` e fonte "Mesma moeda".
- Contas divididas mantem o valor a receber separado ate o usuario marcar o recebimento.

## Recorrencias e parcelamentos

- Transacoes fixas mensais geram ocorrencias nos meses seguintes.
- Cada ocorrencia mensal tem status proprio e pode ser confirmada individualmente.
- Parcelamentos geram uma ocorrencia por parcela, com descricao no formato `Nome (1/12)`.
- Parcelas pendentes continuam usando cambio dinamico quando a moeda exige conversao.
- Parcelas confirmadas travam a cotacao usada no momento da confirmacao.
- A edicao e a exclusao permitem escolher entre alterar apenas a ocorrencia atual, a ocorrencia atual e as proximas, ou toda a recorrencia.
- O Dashboard exibe **Compromissos futuros**, com despesas fixas, receitas fixas, parcelamentos ativos, valor previsto e valor restante.
- Os Relatorios exibem uma secao de **Recorrencias e parcelamentos** com proximos vencimentos, parcelas restantes, status e valores.

## Responsividade

O layout se adapta para desktop, notebook e mobile, incluindo demonstracao no Chrome DevTools com perfil como **iPhone 14 Pro Max**.

No mobile:

- a navegacao lateral vira uma navegacao superior compacta;
- cards, formularios e relatorios ficam em uma coluna;
- tabelas de transacoes viram cards;
- filtros comecam recolhidos;
- o grafico de receitas vs despesas vira lista mensal compacta;
- a tabela de transacoes vira cards e preserva a ordem escolhida no desktop;
- MonthPicker e DatePicker respeitam largura da tela e modo escuro;
- popovers usam posicionamento seguro para evitar cortes e overflow horizontal.

## Persistencia local

Principais chaves usadas no `localStorage`:

- `meuDinheiro.session.v2`
- `meuDinheiro.transactions.v2`
- `meuDinheiro.settings.v2`
- `meuDinheiro.categories.v1`
- `meuDinheiro.goals.v1`
- `meuDinheiro.cards.v1`
- `meuDinheiro.accounts.v1`
- `meuDinheiro.exchangeRatesCache.v1`
- `meuDinheiro.sidebarCollapsed.v1`

## Estrutura

```txt
src/
  assets/
  components/
  data/
  hooks/
  pages/
  services/
  styles/
  utils/
```

## Observacoes

- Nao ha backend real nesta etapa.
- `node_modules`, `dist`, `.env` e arquivos de log nao devem ser versionados.
- A fonte principal de cambio usa uma API propria via Google Apps Script alimentada por Google Sheets/GOOGLEFINANCE.
