import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import HeaderControls from './components/HeaderControls'
import Sidebar from './components/Sidebar'
import {
  accounts as demoAccounts,
  appSettings,
  categories as demoCategories,
  creditCards as demoCards,
  goals as demoGoals,
  transactions as demoTransactions,
} from './data/mockData'
import Accounts from './pages/Accounts'
import Cards from './pages/Cards'
import Categories from './pages/Categories'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import Login from './pages/Login'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Transactions from './pages/Transactions'
import { authenticateUser } from './services/auth'
import {
  clearExchangeRatesCache,
  createInitialExchangeState,
  fetchLatestExchangeRates,
} from './services/exchangeApi'

const SESSION_KEY = 'meuDinheiro.session.v2'
const TRANSACTIONS_KEY = 'meuDinheiro.transactions.v2'
const SETTINGS_KEY = 'meuDinheiro.settings.v2'
const CATEGORIES_KEY = 'meuDinheiro.categories.v1'
const GOALS_KEY = 'meuDinheiro.goals.v1'
const CARDS_KEY = 'meuDinheiro.cards.v1'
const ACCOUNTS_KEY = 'meuDinheiro.accounts.v1'
const SIDEBAR_KEY = 'meuDinheiro.sidebarCollapsed.v1'
const DATA_VERSION_KEY = 'meuDinheiro.demoDataVersion.v7'
const CURRENT_DATA_VERSION = 'v7'
const pagesWithMonthSelector = new Set(['/', '/transactions', '/reports'])
const pagesWithExchangeRefresh = new Set(['/', '/transactions', '/reports'])

const pageMeta = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Resumo financeiro do mês selecionado',
  },
  '/transactions': {
    title: 'Transações',
    subtitle: 'Receitas, despesas, contas, cartões, taxas e conversões.',
  },
  '/accounts': {
    title: 'Contas',
    subtitle: 'Contas, carteiras e saldos calculados.',
  },
  '/categories': {
    title: 'Categorias',
    subtitle: 'Organização de receitas e despesas.',
  },
  '/goals': {
    title: 'Metas',
    subtitle: 'Objetivos financeiros e acompanhamento de progresso.',
  },
  '/cards': {
    title: 'Cartões',
    subtitle: 'Limites, faturas e cartões vinculados.',
  },
  '/reports': {
    title: 'Relatórios',
    subtitle: 'Análises por período, conta, categoria, moeda e cartão.',
  },
  '/settings': {
    title: 'Configurações',
    subtitle: '',
  },
}

function readStorage(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key)
    return storedValue ? JSON.parse(storedValue) : fallback
  } catch {
    return fallback
  }
}

function shouldResetStoredDemoData() {
  try {
    return localStorage.getItem(DATA_VERSION_KEY) !== CURRENT_DATA_VERSION
  } catch {
    return false
  }
}

function getCurrentMonthValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function normalizeSettings(storedSettings) {
  return {
    ...appSettings,
    ...storedSettings,
    activeCurrencies:
      storedSettings?.activeCurrencies?.length > 0
        ? storedSettings.activeCurrencies
        : appSettings.activeCurrencies,
  }
}

function hasCurrentTransactionShape(transactions) {
  return (
    Array.isArray(transactions) &&
    transactions.every(
      (transaction) =>
        transaction.id &&
        transaction.description &&
        transaction.accountId &&
        transaction.categoryId &&
        transaction.fromCurrency &&
        transaction.toCurrency &&
        transaction.status,
    )
  )
}

function hasCurrentCategoryShape(categories) {
  return (
    Array.isArray(categories) &&
    categories.every((category) => category.id && category.name && category.type)
  )
}

function hasCurrentAccountShape(accounts) {
  return (
    Array.isArray(accounts) &&
    accounts.every(
      (account) =>
        account.id &&
        account.name &&
        account.currency,
    )
  )
}

function hasCurrentCardShape(cards) {
  return (
    Array.isArray(cards) &&
    cards.every((card) => card.id && card.name)
  )
}

function hasCurrentGoalShape(goals) {
  return (
    Array.isArray(goals) &&
    goals.every((goal) => goal.id && goal.name && Number(goal.target) > 0)
  )
}

function readInitialSession() {
  const storedSession = readStorage(SESSION_KEY, null)

  if (
    shouldResetStoredDemoData() ||
    (storedSession?.email && storedSession.email !== 'usuario@exemplo.com')
  ) {
    return null
  }

  return storedSession
}

function readInitialTransactions() {
  const storedTransactions = readStorage(TRANSACTIONS_KEY, demoTransactions)

  if (shouldResetStoredDemoData() || !hasCurrentTransactionShape(storedTransactions)) {
    return demoTransactions
  }

  return storedTransactions
}

function readInitialAccounts() {
  const storedAccounts = readStorage(ACCOUNTS_KEY, demoAccounts)

  if (shouldResetStoredDemoData() || !hasCurrentAccountShape(storedAccounts)) {
    return demoAccounts
  }

  return storedAccounts
}

function readInitialCategories() {
  const storedCategories = readStorage(CATEGORIES_KEY, demoCategories)

  if (shouldResetStoredDemoData() || !hasCurrentCategoryShape(storedCategories)) {
    return demoCategories
  }

  return storedCategories
}

function readInitialCards() {
  const storedCards = readStorage(CARDS_KEY, demoCards)

  if (shouldResetStoredDemoData() || !hasCurrentCardShape(storedCards)) {
    return demoCards
  }

  return storedCards
}

function readInitialGoals() {
  const storedGoals = readStorage(GOALS_KEY, demoGoals)

  if (shouldResetStoredDemoData() || !hasCurrentGoalShape(storedGoals)) {
    return demoGoals
  }

  return storedGoals
}

function readInitialSettings() {
  if (shouldResetStoredDemoData()) {
    return appSettings
  }

  return normalizeSettings(readStorage(SETTINGS_KEY, appSettings))
}

function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppLayout({
  selectedMonth,
  setSelectedMonth,
  transactions,
  setTransactions,
  accounts,
  setAccounts,
  categories,
  setCategories,
  goals,
  setGoals,
  cards,
  setCards,
  settings,
  setSettings,
  session,
  exchangeState,
  refreshExchangeRates,
  resetDemoData,
  clearFinancialData,
  clearExchangeRateCache,
  sidebarCollapsed,
  setSidebarCollapsed,
  onLogout,
}) {
  const location = useLocation()
  const page = pageMeta[location.pathname] ?? pageMeta['/']
  const showMonthSelector = pagesWithMonthSelector.has(location.pathname)
  const showExchangeRefresh = pagesWithExchangeRefresh.has(location.pathname)

  const outletContext = useMemo(
    () => ({
      selectedMonth,
      setSelectedMonth,
      transactions,
      setTransactions,
      accounts,
      setAccounts,
      categories,
      setCategories,
      goals,
      setGoals,
      cards,
      setCards,
      settings,
      setSettings,
      session,
      exchangeState,
      refreshExchangeRates,
      resetDemoData,
      clearFinancialData,
      clearExchangeRateCache,
    }),
    [
      selectedMonth,
      setSelectedMonth,
      transactions,
      setTransactions,
      accounts,
      setAccounts,
      categories,
      setCategories,
      goals,
      setGoals,
      cards,
      setCards,
      settings,
      setSettings,
      session,
      exchangeState,
      refreshExchangeRates,
      resetDemoData,
      clearFinancialData,
      clearExchangeRateCache,
    ],
  )

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((currentValue) => !currentValue)}
        onLogout={onLogout}
        user={session}
      />

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{page.title}</h1>
            {page.subtitle ? <p>{page.subtitle}</p> : null}
          </div>
          <HeaderControls
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            settings={settings}
            setSettings={setSettings}
            exchangeState={exchangeState}
            refreshExchangeRates={refreshExchangeRates}
            showMonthSelector={showMonthSelector}
            showExchangeRefresh={showExchangeRefresh}
          />
        </header>

        <Outlet context={outletContext} />
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(readInitialSession)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue)
  const [transactions, setTransactions] = useState(readInitialTransactions)
  const [accounts, setAccounts] = useState(readInitialAccounts)
  const [categories, setCategories] = useState(readInitialCategories)
  const [goals, setGoals] = useState(readInitialGoals)
  const [cards, setCards] = useState(readInitialCards)
  const [settings, setSettings] = useState(readInitialSettings)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === 'true',
  )
  const [exchangeState, setExchangeState] = useState(() =>
    createInitialExchangeState(),
  )
  const exchangeRequestRef = useRef(false)
  const exchangeStateRef = useRef(exchangeState)

  useEffect(() => {
    exchangeStateRef.current = exchangeState
  }, [exchangeState])

  const refreshExchangeRates = useCallback(async ({ silent = false } = {}) => {
    if (exchangeRequestRef.current) {
      return exchangeStateRef.current
    }

    if (!settings.useAutomaticRates) {
      const currentState = exchangeStateRef.current
      const nextState = {
        ...currentState,
        ok: false,
        isLoading: false,
        status: 'manual',
        source: 'Cotação manual',
        detail: 'Cotação automática desativada nas configurações.',
        error: 'Cotação automática desativada. Informe cotação manual nas transações.',
      }

      setExchangeState(nextState)
      return nextState
    }

    exchangeRequestRef.current = true

    if (!silent) {
      setExchangeState((currentState) => ({
        ...currentState,
        isLoading: true,
        error: '',
      }))
    }

    try {
      const latestRates = await fetchLatestExchangeRates(settings.activeCurrencies)
      const nextState = {
        ...latestRates,
        isLoading: false,
      }

      setExchangeState(nextState)
      return nextState
    } catch {
      const currentState = exchangeStateRef.current
      const nextState = {
        ...currentState,
        ok: currentState.ok && silent,
        isLoading: false,
        status: currentState.ok && silent ? currentState.status : 'error',
        error:
          currentState.ok && silent
            ? ''
            : 'Não foi possível obter cotações. Informe uma cotação manual.',
        warning:
          currentState.ok && silent
            ? 'Não foi possível atualizar as cotações agora. Mantendo a última cotação válida.'
            : currentState.warning,
      }

      setExchangeState(nextState)
      return nextState
    } finally {
      exchangeRequestRef.current = false
    }
  }, [
    settings.activeCurrencies,
    settings.useAutomaticRates,
  ])

  useEffect(() => {
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION)
  }, [])

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  }, [accounts])

  useEffect(() => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
  }, [goals])

  useEffect(() => {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards))
  }, [cards])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [session])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.lang = 'pt-BR'
  }, [settings.theme])

  useEffect(() => {
    if (!session || !settings.useAutomaticRates) {
      return undefined
    }

    refreshExchangeRates({ silent: true })

    const intervalId = window.setInterval(() => {
      refreshExchangeRates({ silent: true })
    }, 5 * 60 * 1000)

    return () => window.clearInterval(intervalId)
  }, [refreshExchangeRates, session, settings.useAutomaticRates])

  function handleLogin(credentials) {
    const user = authenticateUser(credentials)

    if (!user) {
      return false
    }

    setSession(user)
    return true
  }

  function handleLogout() {
    setSession(null)
  }

  function resetDemoData() {
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION)
    setTransactions(demoTransactions)
    setAccounts(demoAccounts)
    setCategories(demoCategories)
    setGoals(demoGoals)
    setCards(demoCards)
    setSettings((currentSettings) =>
      normalizeSettings({
        ...appSettings,
        theme: currentSettings.theme,
      }),
    )
  }

  function clearFinancialData() {
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION)
    setTransactions([])
    setAccounts([])
    setCategories([])
    setGoals([])
    setCards([])

    clearExchangeRatesCache()

    setExchangeState({
      ...createInitialExchangeState(),
      isLoading: false,
    })
  }

  function clearExchangeRateCache() {
    clearExchangeRatesCache()
    setExchangeState({
      ...createInitialExchangeState(),
      isLoading: false,
    })
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <Login
                onLogin={handleLogin}
                settings={settings}
                setSettings={setSettings}
              />
            )
          }
        />
        <Route
          element={
            <ProtectedRoute session={session}>
              <AppLayout
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                transactions={transactions}
                setTransactions={setTransactions}
                accounts={accounts}
                setAccounts={setAccounts}
                categories={categories}
                setCategories={setCategories}
                goals={goals}
                setGoals={setGoals}
                cards={cards}
                setCards={setCards}
                settings={settings}
                setSettings={setSettings}
                session={session}
                exchangeState={exchangeState}
                refreshExchangeRates={refreshExchangeRates}
                resetDemoData={resetDemoData}
                clearFinancialData={clearFinancialData}
                clearExchangeRateCache={clearExchangeRateCache}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="categories" element={<Categories />} />
          <Route path="goals" element={<Goals />} />
          <Route path="cards" element={<Cards />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
