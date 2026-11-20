// Níveis de acesso definidos no README e na tabela usuario (coluna nivel_acesso).
export const NIVEL_ADMINISTRADOR = "administrador";
export const NIVEL_COLABORADOR = "colaborador";

export { getUsuarioLogado } from "../services/sessao";

export function ehAdministrador(usuario) {
  return usuario?.nivel_acesso === NIVEL_ADMINISTRADOR;
}

export function nomeDoNivel(usuario) {
  return ehAdministrador(usuario) ? "Administrador" : "Colaborador";
}
