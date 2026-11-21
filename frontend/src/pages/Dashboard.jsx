
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTarefas, getProjetos } from "../services/apiJsonServer";
import { getUsuarioLogado } from "../utils/perfil";
import Layout from "../components/Layout";
import "./Dashboard.css";

function Dashboard() {
  const usuario = getUsuarioLogado();
  const navigate = useNavigate();

  const [tarefas, setTarefas] = useState([]);
  const [projetos, setProjetos] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const dadosTarefas = await getTarefas(usuario);
        const dadosProjetos = await getProjetos(usuario);

        setTarefas(dadosTarefas);
        setProjetos(dadosProjetos);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      }
    }

    carregarDados();
  }, []);

  const totalTarefas = tarefas.length;
  const emAndamento = tarefas.filter(
    (tarefa) => tarefa.status === "EM ANDAMENTO"
  ).length;
  const pendentes = tarefas.filter(
    (tarefa) => tarefa.status === "A FAZER"
  ).length;
  const concluidas = tarefas.filter(
    (tarefa) => tarefa.status === "CONCLUÍDO"
  ).length;

  function progressoProjeto(projeto) {
    const progresso = Number(projeto.progresso);
    return Math.max(0, Math.min(100, Number.isFinite(progresso) ? progresso : 0));
  }

  return (
    <Layout
      titulo="Dashboard"
      subtitulo="Acompanhe as atividades e os projetos da equipe."
    >
        <section className="dashboard-body">
          <div className="stats">
            <div className="stat-card">
              <span>Total de tarefas</span>
              <strong>{totalTarefas}</strong>
            </div>

            <div className="stat-card">
              <span>Em andamento</span>
              <strong>{emAndamento}</strong>
            </div>

            <div className="stat-card">
              <span>Pendentes</span>
              <strong>{pendentes}</strong>
            </div>

            <div className="stat-card">
              <span>Concluídas</span>
              <strong>{concluidas}</strong>
            </div>
          </div>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Projetos</h2>
                <p>Acompanhe o progresso dos projetos.</p>
              </div>

              <button
                className="dashboard-action"
                onClick={() => navigate("/projetos")}
              >
                Ver todos
              </button>
            </div>

            <div className="dashboard-projects">
              {projetos.slice(0, 5).map((projeto) => {
                const progresso = progressoProjeto(projeto);

                return (
                  <div className="dashboard-project" key={projeto.id}>
                    <div className="project-info">
                      <strong>{projeto.nome}</strong>
                      <span>Cliente: {projeto.cliente || "Não informado"}</span>
                      <span>Prazo: {projeto.prazo || "Não definido"}</span>
                    </div>

                    <div className="project-progress">
                      <span>{progresso}%</span>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {projetos.length === 0 && (
                <p className="dashboard-empty">
                  Nenhum projeto cadastrado.
                </p>
              )}
            </div>
          </section>
        </section>
    </Layout>
  );
}

export default Dashboard;
