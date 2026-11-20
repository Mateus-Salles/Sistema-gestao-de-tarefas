// Guarda e lê a sessão do usuário logado (dados do usuário + token JWT).
const CHAVE_USUARIO = "usuario";
const CHAVE_TOKEN = "token";

export function salvarSessao({ usuario, token }) {
  // Nunca guarda a senha no navegador.
  const usuarioSemSenha = { ...usuario };
  delete usuarioSemSenha.senha;
  delete usuarioSemSenha.senha_hash;

  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioSemSenha));

  if (token) {
    localStorage.setItem(CHAVE_TOKEN, token);
  } else {
    localStorage.removeItem(CHAVE_TOKEN);
  }
}

export function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "null");
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function limparSessao() {
  localStorage.removeItem(CHAVE_USUARIO);
  localStorage.removeItem(CHAVE_TOKEN);
}
