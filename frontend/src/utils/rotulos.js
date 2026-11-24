export const DIVISOES = [
  { valor: "produto", rotulo: "Produto", cor: "primary" },
  { valor: "conteudo", rotulo: "Conteúdo", cor: "success" },
  { valor: "trafego", rotulo: "Tráfego", cor: "warning" },
  { valor: "disparos", rotulo: "Disparos", cor: "info" }
];

export const COLUNAS_KANBAN = [
  { valor: "a_fazer", rotulo: "A fazer" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "em_revisao", rotulo: "Em revisão" },
  { valor: "concluido", rotulo: "Concluído" }
];

export const STATUS_PROJETO = [
  { valor: "andamento", rotulo: "Em andamento" },
  { valor: "concluido", rotulo: "Concluído" },
  { valor: "cancelado", rotulo: "Cancelado" }
];

export function rotulo(lista, valor) {
  const item = lista.find((i) => i.valor === valor);
  return item ? item.rotulo : valor;
}

export function formatarData(data) {
  if (!data) return "Sem prazo";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
