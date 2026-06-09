import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail, Moon, Sun } from 'lucide-react'
import logo from '../assets/logo-meu-dinheiro.png'

function Login({ onLogin, settings, setSettings }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('usuario@exemplo.com')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')

  function updateSetting(field, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const success = onLogin({ email, password })

    if (!success) {
      setError('E-mail ou senha inválidos.')
      return
    }

    navigate('/')
  }

  return (
    <main className="login-screen">
      <div className="login-top-controls">
        <button
          className="icon-button"
          type="button"
          aria-label="Alternar tema"
          title="Alternar tema"
          onClick={() =>
            updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
          }
        >
          {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <section className="login-panel">
        <div className="login-brand">
          <img src={logo} alt="Meu Dinheiro" className="login-logo" />
        </div>

        <p>
          Controle receitas, despesas, contas, cartões e metas em uma interface
          simples, responsiva e com suporte a conversão de moedas.
        </p>
      </section>

      <form className="login-form" onSubmit={handleSubmit}>
        <div>
          <span className="eyebrow">Acesso</span>
          <h2>Acesse sua conta</h2>
        </div>

        <label className="field">
          <span>E-mail</span>
          <div className="input-with-icon">
            <Mail size={18} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@exemplo.com"
            />
          </div>
        </label>

        <label className="field">
          <span>Senha</span>
          <div className="input-with-icon">
            <LockKeyhole size={18} />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
            />
          </div>
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        <p className="demo-hint">Usuário demo: usuario@exemplo.com / demo123</p>

        <button className="primary-button" type="submit">
          Entrar
        </button>
      </form>
    </main>
  )
}

export default Login
