import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  Target,
  UserRound,
  WalletCards,
} from 'lucide-react'
import logo from '../assets/logo-meu-dinheiro.png'

const menuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações', icon: WalletCards },
  { to: '/accounts', label: 'Contas', icon: Landmark },
  { to: '/categories', label: 'Categorias', icon: Tags },
  { to: '/goals', label: 'Metas', icon: Target },
  { to: '/cards', label: 'Cartões', icon: CreditCard },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

function Sidebar({ collapsed, onToggle, onLogout }) {
  const toggleLabel = collapsed ? 'Expandir menu' : 'Recolher menu'

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <NavLink className="brand sidebar-logo-link" to="/" aria-label="Ir para Dashboard">
        <img src={logo} alt="Meu Dinheiro" className="brand-logo" />
      </NavLink>

      <button
        className="sidebar-toggle"
        type="button"
        title={toggleLabel}
        aria-label={toggleLabel}
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <nav className="nav-menu" aria-label="Menu principal">
        {menuItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? 'nav-link is-active' : 'nav-link'
              }
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">
          <UserRound size={20} />
        </div>
        <div className="sidebar-user-copy">
          <strong>Usuário Exemplo</strong>
          <span>Conta demonstrativa</span>
        </div>
        <button className="icon-button" type="button" title="Sair" onClick={onLogout}>
          <LogOut size={18} />
          <span className="sr-only">Sair</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
