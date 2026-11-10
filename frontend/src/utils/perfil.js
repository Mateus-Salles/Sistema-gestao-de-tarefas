// Níveis de acesso definidos no README e na tabela usuario (coluna nivel_acesso).
export const NIVEL_ADMINISTRADOR = "administrador";
export const NIVEL_COLABORADOR = "colaborador";

export function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    return null;
  }
}

export function ehAdministrador(usuario) {
  return usuario?.nivel_acesso === NIVEL_ADMINISTRADOR;
}

export function nomeDoNivel(usuario) {
  return ehAdministrador(usuario) ? "Administrador" : "Colaborador";
}
