export const demoUsers = [
  {
    id: 'demo-user',
    name: 'Usuário Exemplo',
    email: 'usuario@exemplo.com',
    password: 'demo123',
    role: 'Conta demonstrativa',
  },
]

export function authenticateUser({ email, password }) {
  const user = demoUsers.find(
    (demoUser) =>
      demoUser.email.toLowerCase() === String(email).toLowerCase().trim() &&
      demoUser.password === password,
  )

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}
