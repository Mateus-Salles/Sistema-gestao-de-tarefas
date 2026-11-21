import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarTarefas,
  listarTarefasAtrasadas,
  listarProjetos,
  listarClientes,
  buscarProgressoProjeto,
  mensagemDeErro
} from "../services/api";
import { getUsuarioLogado, ehAdministrador } from "../utils/perfil";
import { formatarData } from "../utils/rotulos";
import Layout from "../components/Layout";
import "../components/Tela.css";
import "./Dashboard.css";

const PROJETOS_NO_PAINEL = 5;

function Dashboard() {
  const navigate = useNavigate();
  const admin = ehAdministrador(getUsuarioLogado());

  const [tarefas, setTarefas] = useState([]);
  const [atrasadas, setAtrasadas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [progresso, setProgresso] = useState({});
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        // A API já devolve só o que o usuário pode ver: o colaborador recebe
        // as tarefas atribuídas a ele ou criadas por ele.
        const [listaTarefas, listaAtrasadas, listaProjetos, listaClientes] =
          await Promise.all([
            listarTarefas(),
            listarTarefasAtrasadas(),
            listarProjetos({ status: "andamento" }),
            listarClientes()
          ]);

        const exibidos = listaProjetos.slice(0, PROJETOS_NO_PAINEL);
        const progressos = await Promise.all(
          exibidos.map((p) => buscarProgressoProjeto(p.id_projeto).catch(() => null))
        );

        const mapa = {};
        exibidos.forEach((p, i) => {
          mapa[p.id_projeto] = progressos[i];
        });

        setTarefas(listaTarefas);
        setAtrasadas(listaAtrasadas);
        setProjetos(listaProjetos);
        setClientes(listaClientes);
        setProgresso(mapa);
      } catch (e) {
        setErro(mensagemDeErro(e, "Não foi possível carregar o dashboard."));
      }
    }

    carregar();
  }, []);

  const contar = (status) => tarefas.filter((t) => t.kanban_status === status).length;
  const nomeCliente = (id) => clientes.find((c) => c.id_cliente === id)?.nome || "-";
  const nomeProjeto = (id) => projetos.find((p) => p.id_projeto === id)?.nome;

  return (
    <Layout
      titulo="Dashboard"
      subtitulo={
        admin
          ? "Acompanhe as atividades e os projetos da equipe."
          : "Acompanhe as suas tarefas e os projetos em que você participa."
      }
    >
      <section className="dashboard-body">
        {erro && <p className="tela-erro">{erro}</p>}

        <div className="stats">
          <div className="stat-card">
            <span>{admin ? "Total de tarefas" : "Minhas tarefas"}</span>
            <strong>{tarefas.length}</strong>
          </div>

          <div className="stat-card">
            <span>A fazer</span>
            <strong>{contar("a_fazer")}</strong>
          </div>

          <div className="stat-card">
            <span>Em andamento</span>
            <strong>{contar("em_andamento") + contar("em_revisao")}</strong>
          </div>

          <div className="stat-card">
            <span>Concluídas</span>
            <strong>{contar("concluido")}</strong>
          </div>

          <div className="stat-card">
            <span>Atrasadas</span>
            <strong className={atrasadas.length > 0 ? "stat-alerta" : ""}>
              {atrasadas.length}
            </strong>
          </div>
        </div>

        {atrasadas.length > 0 && (
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Tarefas atrasadas</h2>
                <p>Prazo vencido e ainda não concluídas.</p>
              </div>

              <button className="dashboard-action" onClick={() => navigate(
                admin ? "/tarefas?visao=projeto" : "/tarefas"
              )}>
                Abrir Kanban
              </button>
            </div>

            <div className="dashboard-projects">
              {atrasadas.slice(0, 5).map((tarefa) => (
                <div className="dashboard-project" key={tarefa.id_tarefa}>
                  <div className="project-info">
                    <strong>{tarefa.titulo}</strong>
                    <span>{nomeProjeto(tarefa.projeto_id) || "Tarefa avulsa"}</span>
                  </div>
                  <span className="dashboard-atraso">
                    Venceu em {formatarData(tarefa.vencimento)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Projetos em andamento</h2>
              <p>Percentual de tarefas concluídas em cada projeto.</p>
            </div>

            <button className="dashboard-action" onClick={() => navigate("/projetos")}>
              Ver todos
            </button>
          </div>

          <div className="dashboard-projects">
            {projetos.slice(0, PROJETOS_NO_PAINEL).map((projeto) => {
              const percentual = Math.round(
                Number(progresso[projeto.id_projeto]?.percentual_concluido) || 0
              );

              return (
                <div className="dashboard-project" key={projeto.id_projeto}>
                  <div className="project-info">
                    <strong>{projeto.nome}</strong>
                    <span>Cliente: {nomeCliente(projeto.cliente_id)}</span>
                    <span>Prazo: {formatarData(projeto.data_final)}</span>
                  </div>

                  <div className="project-progress">
                    <span>{percentual}%</span>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${percentual}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {projetos.length === 0 && (
              <p className="dashboard-empty">Nenhum projeto em andamento.</p>
            )}
          </div>
        </section>
      </section>
    </Layout>
  );
}

export default Dashboard;
