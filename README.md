# A3 - APP Financeiro Meu Dinheiro

Aplicação React desenvolvida para a disciplina **Usabilidade, desenvolvimento web, mobile e jogos** da UNA.

O **Meu Dinheiro** moderniza uma ideia de controle financeiro pessoal para web, com foco em UI/UX, responsividade, contas, cartões, metas, relatórios, recorrências, parcelamentos e controle multimoeda. A interface está em **PT-BR** e os dados de demonstração são fictícios e genéricos.

![Logo Meu Dinheiro](src/assets/logo-meu-dinheiro-v2.png)

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

- Login local com usuário de demonstração.
- Sidebar recolhível com logo clicável para o Dashboard.
- Modo claro e escuro pelo botão global no topo.
- Header responsivo com ações no canto direito e seletor de mês em linha própria no mobile.
- MonthPicker customizado, responsivo, com popover em portal para não cortar dentro de cards e filtros.
- DatePicker customizado para filtros, transações e metas, com suporte a modo claro/escuro, botão Hoje e limpeza quando permitido.
- Dashboard com saldo consolidado, receitas, despesas, balanço, valores a receber, contas, cartões e lançamentos recentes.
- Card de balanço mensal com barra contínua, tooltip e destaque sutil para despesas, saldo restante e valores a receber.
- CRUD de transações, contas, categorias, metas e cartões com últimos 4 dígitos.
- Categorias com seletor de mês, seletor visual de ícones e orçamento mensal visível nos cards.
- Transações com conta, categoria, cartão opcional, status, taxas, cotação manual e cotação automática.
- Tabela de transações com coluna única **Valor**, exibindo valores confirmados, previstos, cotação travada e conversões sem duplicar informações desnecessárias.
- Transações fixas mensais para receitas e despesas recorrentes.
- Parcelamentos com geração automática de parcelas mensais.
- Edição e exclusão por escopo: somente este mês, esta e as próximas, ou toda a recorrência.
- Ordenação por ícones nos cabeçalhos da tabela de transações.
- Ações rápidas para confirmar recebimento, confirmar despesa e marcar valor compartilhado como recebido.
- Relatórios com filtros, ordenação, exportação CSV, impressão e resumos por período.
- Relatórios com seção de recorrências e parcelamentos.
- Configurações de moeda principal, moedas usadas, taxas padrão editáveis, cache e atualização de câmbio.
- Modais próprios do app para confirmações importantes, sem popups nativos do navegador.
- Estados vazios amigáveis e dados fictícios genéricos.

## Câmbio em tempo real

O serviço fica em `src/services/exchangeApi.js`.

Ordem das fontes:

1. **Google Sheets / GOOGLEFINANCE** via Google Apps Script.
2. **ExchangeRate-API**.
3. **Frankfurter**.
4. Último cache válido em `meuDinheiro.exchangeRatesCache.v1`.
5. Cotação manual informada no formulário.

O app busca cotações ao abrir uma sessão, permite atualização manual e atualiza automaticamente a cada **5 minutos**. As chamadas simultâneas são evitadas para não sobrescrever o estado de câmbio.

O cache salva:

- taxas;
- fonte usada;
- detalhe da fonte;
- data/hora da cotação na fonte;
- data/hora em que o app atualizou localmente.

As datas de cotação são exibidas no horário local do navegador, sem fixar UTC na interface.

A URL do Apps Script está configurada diretamente no protótipo para facilitar a execução acadêmica. Em produção, o ideal seria usar variáveis de ambiente.

## Regras de transações e câmbio

- Transações **confirmadas** e **pagas** entram no saldo.
- Transações **pendentes** e **a receber** aparecem como previsão/valor a receber.
- Transações canceladas não entram nos cálculos.
- Transações pendentes em moeda diferente usam a cotação atual do app para exibir valor previsto.
- Ao confirmar uma transação, o app trava cotação, valor convertido, fonte, detalhe da fonte e data de confirmação.
- Transações já confirmadas não são recalculadas quando o câmbio atualiza.
- Transações de mesma moeda usam taxa `1` e fonte "Mesma moeda".
- Contas divididas mantêm o valor a receber separado até o usuário marcar o recebimento.

## Recorrências e parcelamentos

- Transações fixas mensais geram ocorrências nos meses seguintes.
- Cada ocorrência mensal tem status próprio e pode ser confirmada individualmente.
- Parcelamentos geram uma ocorrência por parcela, com descrição no formato `Nome (1/12)`.
- Parcelas pendentes continuam usando câmbio dinâmico quando a moeda exige conversão.
- Parcelas confirmadas travam a cotação usada no momento da confirmação.
- A edição e a exclusão permitem escolher entre alterar apenas a ocorrência atual, a ocorrência atual e as próximas, ou toda a recorrência.
- O Dashboard exibe **Compromissos futuros**, com despesas fixas, receitas fixas, parcelamentos ativos, valor previsto e valor restante.
- Os Relatórios exibem uma seção de **Recorrências e parcelamentos** com próximos vencimentos, parcelas restantes, status e valores.

## Responsividade

O layout se adapta para desktop, notebook e mobile, incluindo demonstração no Chrome DevTools com perfil como **iPhone 14 Pro Max**.

No mobile:

- a navegação lateral vira uma navegação superior compacta;
- cards, formulários e relatórios ficam em uma coluna;
- tabelas de transações viram cards;
- filtros começam recolhidos;
- o gráfico de receitas vs. despesas vira lista mensal compacta;
- a tabela de transações vira cards e preserva a leitura simplificada da coluna **Valor**;
- MonthPicker e DatePicker respeitam a largura da tela e o modo escuro;
- popovers usam posicionamento seguro para evitar cortes e overflow horizontal.

## Persistência local

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

## Observações

- Não há backend real nesta etapa.
- `node_modules`, `dist`, `.env` e arquivos de log não devem ser versionados.
- A fonte principal de câmbio usa uma API própria via Google Apps Script alimentada por Google Sheets/GOOGLEFINANCE.
