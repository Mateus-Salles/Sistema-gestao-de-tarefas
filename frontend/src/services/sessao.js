export function salvarSessao(usuario, token) {
  localStorage.setItem("usuario", JSON.stringify(usuario));
  localStorage.setItem("token", token);
}

export function getUsuarioLogado() {
  const usuario = localStorage.getItem("usuario");
  return usuario ? JSON.parse(usuario) : null;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function limparSessao() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
}

export function ehAdministrador(usuario) {
  return usuario?.nivel_acesso === "administrador";
}
