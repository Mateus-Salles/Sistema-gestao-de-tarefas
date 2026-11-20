// Dados de teste do simulador, no mesmo formato das tabelas do banco
// (database/schema.sql) e dos esquemas do contrato (docs/openapi.json).
// Senha de todos os usuários de teste: 123456

const CRIADO_EM = "2026-11-01T12:00:00.000Z";

const usuarios = [
  { id_usuario: 1, nome: "Administrador", email: "admin@email.com", nivel_acesso: "administrador" },
  { id_usuario: 2, nome: "João Silva", email: "joao@email.com", nivel_acesso: "colaborador" },
  { id_usuario: 3, nome: "Maria Santos", email: "maria@email.com", nivel_acesso: "colaborador" },
  { id_usuario: 4, nome: "Pedro Costa", email: "pedro@email.com", nivel_acesso: "colaborador" }
].map((usuario) => ({
  ...usuario,
  senha: "123456",
  status: "ativo",
  criado_em: CRIADO_EM
}));

const clientes = [
  { id_cliente: 1, nome: "Nutri Maternal", contato: "contato@maternar.com", status: "ativa" },
  { id_cliente: 2, nome: "Era Profética", contato: "contato@eraprofetica.com.br", status: "ativa" },
  { id_cliente: 3, nome: "Koryx Group", contato: "contato@koryxgroup.com.br", status: "ativa" },
  { id_cliente: 4, nome: "Dr. Marcelo Baggio", contato: "contato@drmarcelobaggio.com", status: "inativa" }
].map((cliente) => ({ ...cliente, criado_em: CRIADO_EM }));

const modelos = [
  { id_modelo_lancamento: 1, nome: "Semente" },
  { id_modelo_lancamento: 2, nome: "Perpétuo" },
  { id_modelo_lancamento: 3, nome: "Desafio" }
].map((modelo) => ({ ...modelo, status: "ativo", criado_em: CRIADO_EM }));

const TAREFAS_POR_MODELO = {
  1: [
    ["Definir oferta e bônus", "produto"],
    ["Validar promessa com o cliente", "produto"],
    ["Roteiro das aulas", "conteudo"],
    ["Gravar e editar as aulas", "conteudo"],
    ["Criar públicos no gerenciador", "trafego"],
    ["Instalar pixel na página", "trafego"],
    ["Escrever sequência de aquecimento", "disparos"],
    ["Programar disparos de abertura do carrinho", "disparos"]
  ],
  2: [
    ["Estruturar produto perpétuo", "produto"],
    ["Criar página de vendas", "produto"],
    ["Produzir criativos de vídeo", "conteudo"],
    ["Configurar campanha de conversão", "trafego"],
    ["Montar automação de e-mails", "disparos"]
  ],
  3: [
    ["Definir tema e datas do desafio", "produto"],
    ["Roteiro dos dias do desafio", "conteudo"],
    ["Criar campanha de captação", "trafego"],
    ["Criar grupo e mensagens do desafio", "disparos"]
  ]
};

let idTarefaPadrao = 1;
const tarefasPadrao = Object.entries(TAREFAS_POR_MODELO).flatMap(
  ([modeloId, lista]) =>
    lista.map(([titulo, divisao]) => ({
      id_tarefa_padrao: idTarefaPadrao++,
      modelo_lancamento_id: Number(modeloId),
      titulo,
      divisao
    }))
);

const projetos = [
  { id_projeto: 1, cliente_id: 1, modelo_lancamento_id: 1, nome: "Lançamento Verão", data_comeco: "2026-11-01", data_final: "2026-11-30" },
  { id_projeto: 2, cliente_id: 2, modelo_lancamento_id: 2, nome: "Turma 4", data_comeco: "2026-11-05", data_final: "2026-12-15" },
  { id_projeto: 3, cliente_id: 3, modelo_lancamento_id: 3, nome: "Black Week", data_comeco: "2026-11-10", data_final: "2026-11-27" }
].map((projeto) => ({ ...projeto, status: "andamento", criado_em: CRIADO_EM }));

// Situação de cada tarefa gerada, na ordem das tarefas padrão do modelo:
// [kanban_status, id do responsável, vencimento]
const ANDAMENTO = {
  1: [
    ["concluido", 2, "2026-11-04"],
    ["em_revisao", 3, "2026-11-08"],
    ["em_andamento", 2, "2026-11-12"],
    ["a_fazer", 3, "2026-11-18"],
    ["em_andamento", 4, "2026-11-09"],
    ["a_fazer", 4, "2026-11-20"],
    ["a_fazer", 2, "2026-11-22"],
    ["a_fazer", null, "2026-11-28"]
  ],
  2: [
    ["em_andamento", 3, "2026-11-14"],
    ["a_fazer", 2, "2026-11-25"],
    ["a_fazer", 4, "2026-12-01"],
    ["a_fazer", null, "2026-12-05"],
    ["a_fazer", 3, "2026-12-10"]
  ],
  3: [
    ["em_andamento", 4, "2026-11-12"],
    ["a_fazer", 2, "2026-11-15"],
    ["a_fazer", 4, "2026-11-18"],
    ["a_fazer", null, "2026-11-20"]
  ]
};

let idTarefa = 1;
const tarefas = projetos.flatMap((projeto) =>
  tarefasPadrao
    .filter((padrao) => padrao.modelo_lancamento_id === projeto.modelo_lancamento_id)
    .map((padrao, indice) => {
      const [kanban_status, responsavel_id, vencimento] =
        ANDAMENTO[projeto.id_projeto][indice];

      return {
        id_tarefa: idTarefa++,
        projeto_id: projeto.id_projeto,
        responsavel_id,
        criador_id: 1,
        titulo: padrao.titulo,
        descricao: null,
        divisao: padrao.divisao,
        kanban_status,
        vencimento,
        criado_em: CRIADO_EM,
        atualizado_em: CRIADO_EM
      };
    })
);

// Uma tarefa avulsa criada por um colaborador para ele mesmo (RF23, RN02).
tarefas.push({
  id_tarefa: idTarefa++,
  projeto_id: null,
  responsavel_id: 2,
  criador_id: 2,
  titulo: "Organizar referências de criativos",
  descricao: "Separar exemplos de anúncios para a próxima campanha.",
  divisao: "trafego",
  kanban_status: "a_fazer",
  vencimento: null,
  criado_em: CRIADO_EM,
  atualizado_em: CRIADO_EM
});

export function criarDadosIniciais() {
  // Cópia profunda para o simulador poder alterar sem mexer no original.
  return structuredClone({
    usuarios,
    clientes,
    modelos,
    tarefasPadrao,
    projetos,
    tarefas
  });
}
