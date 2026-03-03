// src/config/users.js
// Usuários e senhas fixos (pode usar variáveis de ambiente se preferir)
const users = [
  { username: 'julio', password: 'julio-senha', role: 'admin' },
  { username: 'julia', password: 'julia-senha', role: 'admin' },
  { username: 'dionas', password: 'dionas-senha', role: 'admin' },
  { username: 'admin.ti', password: 'admin.ti-senha', role: 'admin' },
  { username: 'operador1', password: '123456', role: 'operator' },
  { username: 'qualidade1', password: '123456', role: 'quality' }
];

module.exports = users;