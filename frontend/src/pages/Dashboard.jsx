import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, ProgressBar, ListGroup, Alert } from "react-bootstrap";
import {
  listarTarefas,
  listarTarefasAtrasadas,
  listarProjetos,
  buscarProgressoProjeto,
  mensagemDeErro
} from "../services/api";
import { getUsuarioLogado, ehAdministrador } from "../services/sessao";
import { formatarData } from "../utils/rotulos";
import Layout from "../components/Layout";

function Dashboard() {
  const admin = ehAdministrador(getUsuarioLogado());

  const [tarefas, setTarefas] = useState([]);
  const [atrasadas, setAtrasadas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [progresso, setProgresso] = useState({});
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        setTarefas(await listarTarefas());
        setAtrasadas(await listarTarefasAtrasadas());

        const listaProjetos = await listarProjetos({ status: "andamento" });
        setProjetos(listaProjetos);

        const porcentagens = {};
        for (const projeto of listaProjetos) {
          const dados = await buscarProgressoProjeto(projeto.id_projeto);
          porcentagens[projeto.id_projeto] = Math.round(Number(dados.percentual_concluido));
        }
        setProgresso(porcentagens);
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    }
    carregar();
  }, []);

  function contar(status) {
    return tarefas.filter((t) => t.kanban_status === status).length;
  }

  return (
    <Layout titulo="Dashboard">
      {erro && <Alert variant="danger">{erro}</Alert>}

      <Row className="mb-4 g-3">
        <Col md>
          <Card body>
            <div className="text-muted">{admin ? "Total de tarefas" : "Minhas tarefas"}</div>
            <h3>{tarefas.length}</h3>
          </Card>
        </Col>
        <Col md>
          <Card body>
            <div className="text-muted">A fazer</div>
            <h3>{contar("a_fazer")}</h3>
          </Card>
        </Col>
        <Col md>
          <Card body>
            <div className="text-muted">Em andamento</div>
            <h3>{contar("em_andamento") + contar("em_revisao")}</h3>
          </Card>
        </Col>
        <Col md>
          <Card body>
            <div className="text-muted">Concluídas</div>
            <h3>{contar("concluido")}</h3>
          </Card>
        </Col>
        <Col md>
          <Card body>
            <div className="text-muted">Atrasadas</div>
            <h3 className={atrasadas.length > 0 ? "text-danger" : ""}>{atrasadas.length}</h3>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col md={6}>
          <Card>
            <Card.Header>Projetos em andamento</Card.Header>
            <ListGroup variant="flush">
              {projetos.map((projeto) => (
                <ListGroup.Item key={projeto.id_projeto}>
                  <div className="d-flex justify-content-between">
                    <strong>{projeto.nome}</strong>
                    <small className="text-muted">Prazo: {formatarData(projeto.data_final)}</small>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    now={progresso[projeto.id_projeto] || 0}
                    label={`${progresso[projeto.id_projeto] || 0}%`}
                  />
                </ListGroup.Item>
              ))}
              {projetos.length === 0 && (
                <ListGroup.Item className="text-muted">Nenhum projeto em andamento.</ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Tarefas atrasadas</Card.Header>
            <ListGroup variant="flush">
              {atrasadas.slice(0, 8).map((tarefa) => (
                <ListGroup.Item key={tarefa.id_tarefa} className="d-flex justify-content-between">
                  <span>{tarefa.titulo}</span>
                  <small className="text-danger">Venceu em {formatarData(tarefa.vencimento)}</small>
                </ListGroup.Item>
              ))}
              {atrasadas.length === 0 && (
                <ListGroup.Item className="text-muted">Nenhuma tarefa atrasada.</ListGroup.Item>
              )}
            </ListGroup>
            <Card.Footer>
              <Link to="/tarefas">Abrir Kanban</Link>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Layout>
  );
}

export default Dashboard;
