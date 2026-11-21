import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listarProjetos,
  listarUsuarios,
  buscarKanbanProjeto,
  buscarKanbanUsuario,
  buscarMeuKanban,
  criarTarefa,
  editarTarefa,
  excluirTarefa,
  atribuirResponsavel,
  moverTarefa,
  mensagemDeErro
} from "../services/api";
import { getUsuarioLogado, ehAdministrador } from "../utils/perfil";
import { DIVISOES, COLUNAS_KANBAN, rotulo, formatarData } from "../utils/rotulos";
import Layout from "../components/Layout";
import "../components/Tela.css";
import "./Tasks.css";

const VISAO_PROJETO = "projeto";
const VISAO_COLABORADOR = "colaborador";
const VISAO_MINHAS = "minhas";

// Busca as tarefas da visão escolhida. Cada rota já aplica as permissões:
// colaborador só recebe as tarefas atribuídas a ele ou criadas por ele.
function buscarTarefas(visao, projetoId, colaboradorId) {
  if (visao === VISAO_PROJETO) return buscarKanbanProjeto(projetoId);
  if (visao === VISAO_COLABORADOR) return buscarKanbanUsuario(colaboradorId);
  return buscarMeuKanban();
}

const TAREFA_VAZIA = {
  titulo: "",
  descricao: "",
  divisao: "produto",
  vencimento: "",
  projeto_id: "",
  responsavel_id: ""
};

function Tasks() {
  const usuario = getUsuarioLogado();
  const admin = ehAdministrador(usuario);
  const meuId = usuario?.id_usuario;

  const [parametros, setParametros] = useSearchParams();

  // Visão e seleção ficam na URL (?visao=...&projeto=...&usuario=...), assim
  // o botão "Kanban" da tela de projetos abre direto no projeto certo.
  const visao = admin ? parametros.get("visao") || VISAO_PROJETO : VISAO_MINHAS;
  const projetoId = parametros.get("projeto") || "";
  const colaboradorId = parametros.get("usuario") || "";

  const [projetos, setProjetos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  // Chave da última busca concluída: enquanto for diferente da atual, está carregando.
  const [chaveCarregada, setChaveCarregada] = useState(null);
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);
  const [erro, setErro] = useState("");

  const [filtroDivisao, setFiltroDivisao] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [somenteAtrasadas, setSomenteAtrasadas] = useState(false);

  // null = fechado; { id: null } = nova tarefa; { id: 7, ... } = editando
  const [formulario, setFormulario] = useState(null);
  const [dados, setDados] = useState(TAREFA_VAZIA);
  const [salvando, setSalvando] = useState(false);

  const [arrastandoId, setArrastandoId] = useState(null);

  function mudarParametros(novos) {
    setErro("");
    setFormulario(null);
    const proximo = new URLSearchParams(parametros);
    for (const [chave, valor] of Object.entries(novos)) {
      if (valor) proximo.set(chave, valor);
      else proximo.delete(chave);
    }
    setParametros(proximo, { replace: true });
  }

  // Listas de apoio: projetos (todos os perfis) e usuários (só administrador).
  useEffect(() => {
    async function carregarApoio() {
      try {
        const [listaProjetos, listaUsuarios] = await Promise.all([
          listarProjetos(),
          admin ? listarUsuarios() : Promise.resolve([])
        ]);
        setProjetos(listaProjetos);
        setUsuarios(listaUsuarios);
      } catch (e) {
        setErro(mensagemDeErro(e, "Não foi possível carregar os dados."));
      }
    }

    carregarApoio();
  }, [admin]);

  const semSelecao =
    (visao === VISAO_PROJETO && !projetoId) ||
    (visao === VISAO_COLABORADOR && !colaboradorId);
  const chave = `${visao}|${projetoId}|${colaboradorId}|${versao}`;
  const carregando = !semSelecao && chaveCarregada !== chave;

  useEffect(() => {
    if (semSelecao) return undefined;

    let ativo = true;

    buscarTarefas(visao, projetoId, colaboradorId)
      .then((lista) => ativo && setTarefas(lista))
      .catch((e) => {
        if (!ativo) return;
        setTarefas([]);
        setErro(mensagemDeErro(e, "Não foi possível carregar as tarefas."));
      })
      .finally(() => ativo && setChaveCarregada(chave));

    return () => {
      ativo = false;
    };
  }, [chave, semSelecao, visao, projetoId, colaboradorId]);

  const colaboradores = usuarios.filter(
    (u) => u.nivel_acesso === "colaborador" && u.status === "ativo"
  );

  function nomeResponsavel(tarefa) {
    if (!tarefa.responsavel_id) return "Sem responsável";
    if (tarefa.responsavel_id === meuId) return "Você";

    const encontrado = usuarios.find((u) => u.id_usuario === tarefa.responsavel_id);
    return encontrado?.nome || "Outro colaborador";
  }

  function nomeProjeto(tarefa) {
    if (tarefa.projeto_nome) return tarefa.projeto_nome;
    if (!tarefa.projeto_id) return null;
    return projetos.find((p) => p.id_projeto === tarefa.projeto_id)?.nome || null;
  }

  // Regra do sistema: só o responsável ou um administrador move a tarefa.
  const podeMover = (tarefa) => admin || tarefa.responsavel_id === meuId;

  // ---------- Formulário ----------

  function abrirNova() {
    setDados({
      ...TAREFA_VAZIA,
      projeto_id: visao === VISAO_PROJETO ? projetoId : "",
      responsavel_id: visao === VISAO_COLABORADOR ? colaboradorId : ""
    });
    setFormulario({ id: null });
  }

  function abrirEdicao(tarefa) {
    setDados({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || "",
      divisao: tarefa.divisao,
      vencimento: tarefa.vencimento?.slice(0, 10) ?? "",
      projeto_id: tarefa.projeto_id ? String(tarefa.projeto_id) : "",
      responsavel_id: tarefa.responsavel_id ? String(tarefa.responsavel_id) : ""
    });
    setFormulario({ id: tarefa.id_tarefa, responsavelOriginal: tarefa.responsavel_id });
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const camposEditaveis = {
      titulo: dados.titulo.trim(),
      descricao: dados.descricao.trim() || null,
      divisao: dados.divisao,
      vencimento: dados.vencimento || null
    };

    try {
      if (formulario.id) {
        await editarTarefa(formulario.id, camposEditaveis);

        const novoResponsavel = Number(dados.responsavel_id) || null;
        if (admin && novoResponsavel && novoResponsavel !== formulario.responsavelOriginal) {
          await atribuirResponsavel(formulario.id, novoResponsavel);
        }
      } else {
        await criarTarefa({
          ...camposEditaveis,
          projeto_id: Number(dados.projeto_id) || null,
          responsavel_id: Number(dados.responsavel_id) || null
        });
      }

      setFormulario(null);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Não foi possível salvar a tarefa."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!window.confirm("Excluir esta tarefa? Essa ação não pode ser desfeita.")) {
      return;
    }

    setErro("");
    setSalvando(true);

    try {
      await excluirTarefa(formulario.id);
      setFormulario(null);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Não foi possível excluir a tarefa."));
    } finally {
      setSalvando(false);
    }
  }

  // ---------- Arrastar e soltar ----------

  function iniciarArraste(evento, tarefa) {
    setArrastandoId(tarefa.id_tarefa);
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", String(tarefa.id_tarefa));
  }

  function permitirSoltar(evento) {
    evento.preventDefault();
    evento.dataTransfer.dropEffect = "move";
  }

  async function soltar(evento, novoStatus) {
    evento.preventDefault();

    const id = Number(evento.dataTransfer.getData("text/plain")) || arrastandoId;
    setArrastandoId(null);

    const tarefa = tarefas.find((t) => t.id_tarefa === id);
    if (!tarefa || tarefa.kanban_status === novoStatus) return;

    const anteriores = tarefas;
    setTarefas(
      tarefas.map((t) => (t.id_tarefa === id ? { ...t, kanban_status: novoStatus } : t))
    );
    setErro("");

    try {
      const atualizada = await moverTarefa(id, novoStatus);
      setTarefas((atuais) =>
        atuais.map((t) => (t.id_tarefa === id ? { ...t, ...atualizada } : t))
      );
    } catch (e) {
      setTarefas(anteriores);
      setErro(mensagemDeErro(e, "Não foi possível mover a tarefa."));
    }
  }

  // ---------- Filtros ----------

  const tarefasFiltradas = (carregando ? [] : tarefas).filter((t) => {
    if (filtroDivisao && t.divisao !== filtroDivisao) return false;
    if (somenteAtrasadas && !t.atrasada) return false;
    if (filtroResponsavel === "sem" && t.responsavel_id) return false;
    if (filtroResponsavel && filtroResponsavel !== "sem" &&
        String(t.responsavel_id) !== filtroResponsavel) return false;
    return true;
  });

  const mensagemVazia =
    visao === VISAO_PROJETO && !projetoId
      ? "Selecione um projeto para ver o Kanban."
      : visao === VISAO_COLABORADOR && !colaboradorId
        ? "Selecione um colaborador para ver as tarefas dele."
        : null;

  // ---------- Renderização ----------

  function renderizarCartao(tarefa) {
    const movivel = podeMover(tarefa);
    const projeto = nomeProjeto(tarefa);
    const classes = ["kanban-card"];
    if (arrastandoId === tarefa.id_tarefa) classes.push("dragging");
    if (!movivel) classes.push("bloqueado");

    return (
      <div
        key={tarefa.id_tarefa}
        className={classes.join(" ")}
        draggable={movivel}
        onDragStart={(e) => iniciarArraste(e, tarefa)}
        onDragEnd={() => setArrastandoId(null)}
        onClick={() => abrirEdicao(tarefa)}
        title={movivel ? "Arraste para mudar de coluna. Clique para editar." :
          "Só o responsável ou um administrador pode mover esta tarefa."}
      >
        <span className={`tag ${tarefa.divisao}`}>{rotulo(DIVISOES, tarefa.divisao)}</span>

        <h3>{tarefa.titulo}</h3>

        <p>{nomeResponsavel(tarefa)}</p>
        {projeto && visao !== VISAO_PROJETO && <p className="kanban-projeto">{projeto}</p>}

        {tarefa.vencimento && (
          <span className={tarefa.atrasada ? "prazo atrasado" : "prazo"}>
            {tarefa.atrasada ? "Atrasada · " : ""}
            {formatarData(tarefa.vencimento)}
          </span>
        )}
      </div>
    );
  }

  const editando = formulario?.id;

  return (
    <Layout titulo="Kanban" subtitulo="Acompanhe o andamento das tarefas.">
      <section className="kanban-body">
        <div className="kanban-top">
          <div className="kanban-tabs">
            {admin && (
              <>
                <button
                  className={visao === VISAO_PROJETO ? "tab active" : "tab"}
                  onClick={() => mudarParametros({ visao: VISAO_PROJETO })}
                >
                  Kanban do projeto
                </button>
                <button
                  className={visao === VISAO_COLABORADOR ? "tab active" : "tab"}
                  onClick={() => mudarParametros({ visao: VISAO_COLABORADOR })}
                >
                  Kanban por colaborador
                </button>
              </>
            )}
            <button
              className={visao === VISAO_MINHAS ? "tab active" : "tab"}
              onClick={() => admin && mudarParametros({ visao: VISAO_MINHAS })}
            >
              {admin ? "Criadas por mim" : "Minhas tarefas"}
            </button>
          </div>

          <button className="new-task-button" onClick={abrirNova}>
            + Nova tarefa
          </button>
        </div>

        <div className="kanban-filters">
          {visao === VISAO_PROJETO && (
            <select
              value={projetoId}
              onChange={(e) => mudarParametros({ projeto: e.target.value })}
            >
              <option value="">Selecione o projeto</option>
              {projetos.map((p) => (
                <option key={p.id_projeto} value={p.id_projeto}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}

          {visao === VISAO_COLABORADOR && (
            <select
              value={colaboradorId}
              onChange={(e) => mudarParametros({ usuario: e.target.value })}
            >
              <option value="">Selecione o colaborador</option>
              {colaboradores.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nome}
                </option>
              ))}
            </select>
          )}

          <select value={filtroDivisao} onChange={(e) => setFiltroDivisao(e.target.value)}>
            <option value="">Divisão: Todas</option>
            {DIVISOES.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.rotulo}
              </option>
            ))}
          </select>

          {admin && visao === VISAO_PROJETO && (
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
            >
              <option value="">Responsável: Todos</option>
              <option value="sem">Sem responsável</option>
              {colaboradores.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nome}
                </option>
              ))}
            </select>
          )}

          <button
            className={somenteAtrasadas ? "filter-button selected" : "filter-button"}
            onClick={() => setSomenteAtrasadas(!somenteAtrasadas)}
          >
            Somente atrasadas
          </button>
        </div>

        {erro && <p className="tela-erro">{erro}</p>}

        {formulario && (
          <form className="task-form" onSubmit={salvar}>
            <h2>{editando ? "Editar tarefa" : "Nova tarefa"}</h2>

            <input
              type="text"
              placeholder="Título da tarefa"
              maxLength={200}
              value={dados.titulo}
              onChange={(e) => setDados({ ...dados, titulo: e.target.value })}
              required
            />

            <textarea
              placeholder="Descrição (opcional)"
              value={dados.descricao}
              onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
            />

            <select
              value={dados.divisao}
              onChange={(e) => setDados({ ...dados, divisao: e.target.value })}
            >
              {DIVISOES.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.rotulo}
                </option>
              ))}
            </select>

            <label className="task-form-rotulo" htmlFor="tarefa-vencimento">
              Prazo (opcional)
            </label>
            <input
              id="tarefa-vencimento"
              type="date"
              value={dados.vencimento}
              onChange={(e) => setDados({ ...dados, vencimento: e.target.value })}
            />

            {!editando && (
              <select
                value={dados.projeto_id}
                onChange={(e) => setDados({ ...dados, projeto_id: e.target.value })}
              >
                <option value="">Sem projeto (tarefa avulsa)</option>
                {projetos
                  .filter((p) => p.status === "andamento")
                  .map((p) => (
                    <option key={p.id_projeto} value={p.id_projeto}>
                      {p.nome}
                    </option>
                  ))}
              </select>
            )}

            {admin ? (
              <select
                value={dados.responsavel_id}
                onChange={(e) => setDados({ ...dados, responsavel_id: e.target.value })}
              >
                {/* A API não permite remover o responsável depois de atribuído. */}
                {(!editando || !formulario.responsavelOriginal) && (
                  <option value="">Sem responsável</option>
                )}
                {/* Responsável atual que não está na lista (ex.: usuário inativado). */}
                {editando && formulario.responsavelOriginal &&
                  !colaboradores.some((u) => u.id_usuario === formulario.responsavelOriginal) && (
                  <option value={formulario.responsavelOriginal}>
                    {usuarios.find((u) => u.id_usuario === formulario.responsavelOriginal)?.nome ||
                      "Responsável atual"}
                  </option>
                )}
                {colaboradores.map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.nome}
                  </option>
                ))}
              </select>
            ) : (
              !editando && (
                <select
                  value={dados.responsavel_id}
                  onChange={(e) => setDados({ ...dados, responsavel_id: e.target.value })}
                >
                  <option value="">Sem responsável</option>
                  <option value={meuId}>Eu mesmo</option>
                </select>
              )
            )}

            <div className="tela-form-botoes">
              <button type="submit" className="botao-primario" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              {editando && admin && (
                <button
                  type="button"
                  className="botao-perigo"
                  onClick={excluir}
                  disabled={salvando}
                >
                  Excluir
                </button>
              )}
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setFormulario(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {mensagemVazia ? (
          <p className="tela-carregando">{mensagemVazia}</p>
        ) : (
          <div className="kanban-board">
            {COLUNAS_KANBAN.map((coluna) => {
              const daColuna = tarefasFiltradas.filter(
                (t) => t.kanban_status === coluna.valor
              );

              return (
                <div
                  key={coluna.valor}
                  className="kanban-column"
                  onDragOver={permitirSoltar}
                  onDrop={(e) => soltar(e, coluna.valor)}
                >
                  <div className="column-header">
                    <h2>{coluna.rotulo}</h2>
                    <span>{daColuna.length}</span>
                  </div>

                  <div className="kanban-cards">
                    {daColuna.map(renderizarCartao)}
                    {carregando && daColuna.length === 0 && (
                      <p className="kanban-vazio">Carregando...</p>
                    )}
                  </div>

                  {coluna.valor === "a_fazer" && (
                    <div className="add-task" onClick={abrirNova}>
                      + Adicionar tarefa
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}

export default Tasks;
