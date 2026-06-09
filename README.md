# A3 - APP Financeiro Meu Dinheiro

Aplicação React desenvolvida para a disciplina **Usabilidade, desenvolvimento web, mobile e jogos** da UNA.

O **Meu Dinheiro** moderniza uma ideia de controle financeiro pessoal para web, com foco em UI/UX, responsividade, contas, cartões, metas, relatórios e controle multimoeda. A interface está em **PT-BR** e os dados de demonstração são fictícios.

![Logo Meu Dinheiro](src/assets/logo-meu-dinheiro.png)

## Repositório

[github.com/LeoAugustto/a3-meu-dinheiro](https://github.com/LeoAugustto/a3-meu-dinheiro)

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
- Seletor de mês customizado, responsivo e integrado ao tema claro/escuro.
- Dashboard com saldo consolidado, receitas, despesas, balanço, valores a receber, contas, cartões e lançamentos recentes.
- CRUD de transações, contas, categorias, metas e cartões.
- Transações com conta, categoria, cartão opcional, status, taxas, cotação manual e cotação automática.
- Ações rápidas para confirmar recebimento, confirmar despesa e marcar valor compartilhado como recebido.
- Relatórios com filtros, exportação CSV, impressão e resumos por período.
- Configurações de moeda principal, moedas usadas, taxas padrão, cache e atualização de câmbio.
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

## Regras de transações e câmbio

- Transações **confirmadas** e **pagas** entram no saldo.
- Transações **pendentes** e **a receber** aparecem como previsão/valor a receber.
- Transações canceladas não entram nos cálculos.
- Transações pendentes em moeda diferente usam a cotação atual do app para exibir valor previsto.
- Ao confirmar uma transação, o app trava cotação, valor convertido, fonte, detalhe da fonte e data de confirmação.
- Transações já confirmadas não são recalculadas quando o câmbio atualiza.
- Contas divididas mantêm o valor a receber separado até o usuário marcar o recebimento.

## Responsividade

O layout se adapta para desktop, notebook e mobile, incluindo demonstração no Chrome DevTools com perfil como **iPhone 14 Pro Max**.

No mobile:

- a navegação lateral vira uma navegação superior compacta;
- cards, formulários e relatórios ficam em uma coluna;
- tabelas de transações viram cards;
- filtros começam recolhidos;
- o gráfico de receitas vs despesas vira lista mensal compacta;
- MonthPicker e campos de data respeitam largura da tela e modo escuro.

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
  pages/
  services/
  styles/
  utils/
```

## Observações

- Não há backend real nesta etapa.
- `node_modules`, `dist`, `.env` e arquivos de log não devem ser versionados.
- A fonte principal de câmbio usa uma API própria via Google Apps Script alimentada por Google Sheets/GOOGLEFINANCE.
