// Valores aceitos pela API (docs/openapi.json) e o texto exibido na tela.

export const DIVISOES = [
  { valor: "produto", rotulo: "Produto" },
  { valor: "conteudo", rotulo: "Conteúdo" },
  { valor: "trafego", rotulo: "Tráfego" },
  { valor: "disparos", rotulo: "Disparos" }
];

export const COLUNAS_KANBAN = [
  { valor: "a_fazer", rotulo: "A fazer" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "em_revisao", rotulo: "Em revisão" },
  { valor: "concluido", rotulo: "Concluído" }
];

export const STATUS_CLIENTE = [
  { valor: "ativa", rotulo: "Ativo" },
  { valor: "inativa", rotulo: "Inativo" }
];

export const STATUS_PROJETO = [
  { valor: "andamento", rotulo: "Em andamento" },
  { valor: "concluido", rotulo: "Concluído" },
  { valor: "cancelado", rotulo: "Cancelado" }
];

export const STATUS_USUARIO = [
  { valor: "ativo", rotulo: "Ativo" },
  { valor: "inativo", rotulo: "Inativo" }
];

export const NIVEIS_ACESSO = [
  { valor: "administrador", rotulo: "Administrador" },
  { valor: "colaborador", rotulo: "Colaborador" }
];

// Ex.: rotulo(DIVISOES, "trafego") → "Tráfego"
export function rotulo(lista, valor) {
  return lista.find((item) => item.valor === valor)?.rotulo || valor || "-";
}

// "2026-11-20" → "20/11/2026"
export function formatarData(data) {
  if (!data) return "Sem prazo";

  const [ano, mes, dia] = String(data).slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
