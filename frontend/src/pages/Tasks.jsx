import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Row, Col, Card, Button, Modal, Form, Badge, Alert, Nav } from "react-bootstrap";
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
import { getUsuarioLogado, ehAdministrador } from "../services/sessao";
import { DIVISOES, COLUNAS_KANBAN, formatarData } from "../utils/rotulos";
import Layout from "../components/Layout";

function Tasks() {
  const usuario = getUsuarioLogado();
  const admin = ehAdministrador(usuario);
  const [searchParams] = useSearchParams();

  const [visao, setVisao] = useState(admin ? "projeto" : "minhas");
  const [projetoId, setProjetoId] = useState(searchParams.get("projeto") || "");
  const [colaboradorId, setColaboradorId] = useState("");

  const [projetos, setProjetos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [erro, setErro] = useState("");
  const [atualizar, setAtualizar] = useState(0);

  const [filtroDivisao, setFiltroDivisao] = useState("");
  const [somenteAtrasadas, setSomenteAtrasadas] = useState(false);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [divisao, setDivisao] = useState("produto");
  const [vencimento, setVencimento] = useState("");
  const [projetoTarefa, setProjetoTarefa] = useState("");
  const [responsavel, setResponsavel] = useState("");

  const faltaSelecionar =
    (visao === "projeto" && !projetoId) || (visao === "colaborador" && !colaboradorId);

  useEffect(() => {
    async function carregarListas() {
      try {
        setProjetos(await listarProjetos());
        if (admin) {
          setUsuarios(await listarUsuarios());
        }
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    }
    carregarListas();
  }, [admin]);

  useEffect(() => {
    if (faltaSelecionar) return;

    async function carregarTarefas() {
      try {
        if (visao === "projeto") {
          setTarefas(await buscarKanbanProjeto(projetoId));
        } else if (visao === "colaborador") {
          setTarefas(await buscarKanbanUsuario(colaboradorId));
        } else {
          setTarefas(await buscarMeuKanban());
        }
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    }
    carregarTarefas();
  }, [visao, projetoId, colaboradorId, faltaSelecionar, atualizar]);

  const colaboradores = usuarios.filter(
    (u) => u.nivel_acesso === "colaborador" && u.status === "ativo"
  );

  function nomeResponsavel(tarefa) {
    if (!tarefa.responsavel_id) return "Sem responsável";
    if (tarefa.responsavel_id === usuario.id_usuario) return "Você";
    const encontrado = usuarios.find((u) => u.id_usuario === tarefa.responsavel_id);
    return encontrado ? encontrado.nome : "Outro colaborador";
  }

  function nomeProjeto(tarefa) {
    const projeto = projetos.find((p) => p.id_projeto === tarefa.projeto_id);
    return projeto ? projeto.nome : "Tarefa avulsa";
  }

  function podeMover(tarefa) {
    return admin || tarefa.responsavel_id === usuario.id_usuario;
  }

  function trocarVisao(novaVisao) {
    setErro("");
    setTarefas([]);
    setVisao(novaVisao);
  }

  function novaTarefa() {
    setTarefaEditando(null);
    setTitulo("");
    setDescricao("");
    setDivisao("produto");
    setVencimento("");
    setProjetoTarefa(visao === "projeto" ? projetoId : "");
    setResponsavel(visao === "colaborador" ? colaboradorId : "");
    setMostrarModal(true);
  }

  function abrirEdicao(tarefa) {
    setTarefaEditando(tarefa);
    setTitulo(tarefa.titulo);
    setDescricao(tarefa.descricao || "");
    setDivisao(tarefa.divisao);
    setVencimento(tarefa.vencimento || "");
    setResponsavel(tarefa.responsavel_id ? String(tarefa.responsavel_id) : "");
    setMostrarModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    const dados = {
      titulo,
      descricao: descricao || null,
      divisao,
      vencimento: vencimento || null
    };

    try {
      if (tarefaEditando) {
        await editarTarefa(tarefaEditando.id_tarefa, dados);

        if (admin && responsavel && Number(responsavel) !== tarefaEditando.responsavel_id) {
          await atribuirResponsavel(tarefaEditando.id_tarefa, Number(responsavel));
        }
      } else {
        await criarTarefa({
          ...dados,
          projeto_id: projetoTarefa ? Number(projetoTarefa) : null,
          responsavel_id: responsavel ? Number(responsavel) : null
        });
      }
      setMostrarModal(false);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function excluir() {
    if (!window.confirm("Deseja excluir esta tarefa?")) return;
    setErro("");

    try {
      await excluirTarefa(tarefaEditando.id_tarefa);
      setMostrarModal(false);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function soltarNaColuna(e, status) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("id"));
    const tarefa = tarefas.find((t) => t.id_tarefa === id);

    if (!tarefa || tarefa.kanban_status === status) return;
    setErro("");

    try {
      await moverTarefa(id, status);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  const tarefasFiltradas = (faltaSelecionar ? [] : tarefas).filter((tarefa) => {
    if (filtroDivisao && tarefa.divisao !== filtroDivisao) return false;
    if (somenteAtrasadas && !tarefa.atrasada) return false;
    return true;
  });

  const projetosEmAndamento = projetos.filter((p) => p.status === "andamento");

  return (
    <Layout titulo="Kanban">
      {admin && (
        <Nav variant="tabs" className="mb-3" activeKey={visao} onSelect={trocarVisao}>
          <Nav.Item>
            <Nav.Link eventKey="projeto">Por projeto</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="colaborador">Por colaborador</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="minhas">Criadas por mim</Nav.Link>
          </Nav.Item>
        </Nav>
      )}

      <Row className="mb-3 g-2 align-items-center">
        {visao === "projeto" && (
          <Col md={4}>
            <Form.Select value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
              <option value="">Selecione o projeto</option>
              {projetos.map((p) => (
                <option key={p.id_projeto} value={p.id_projeto}>
                  {p.nome}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
        {visao === "colaborador" && (
          <Col md={4}>
            <Form.Select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
              <option value="">Selecione o colaborador</option>
              {colaboradores.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nome}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
        <Col md={3}>
          <Form.Select value={filtroDivisao} onChange={(e) => setFiltroDivisao(e.target.value)}>
            <option value="">Todas as divisões</option>
            {DIVISOES.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.rotulo}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md="auto">
          <Form.Check
            type="switch"
            label="Somente atrasadas"
            checked={somenteAtrasadas}
            onChange={(e) => setSomenteAtrasadas(e.target.checked)}
          />
        </Col>
        <Col className="text-end">
          <Button onClick={novaTarefa}>Nova tarefa</Button>
        </Col>
      </Row>

      {erro && <Alert variant="danger">{erro}</Alert>}

      {faltaSelecionar ? (
        <Alert variant="secondary">
          {visao === "projeto"
            ? "Selecione um projeto para ver o Kanban."
            : "Selecione um colaborador para ver as tarefas dele."}
        </Alert>
      ) : (
        <Row className="g-3">
          {COLUNAS_KANBAN.map((coluna) => {
            const tarefasDaColuna = tarefasFiltradas.filter((t) => t.kanban_status === coluna.valor);

            return (
              <Col md={3} key={coluna.valor}>
                <Card
                  className="coluna-kanban bg-light"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => soltarNaColuna(e, coluna.valor)}
                >
                  <Card.Header className="d-flex justify-content-between">
                    <strong>{coluna.rotulo}</strong>
                    <Badge bg="secondary">{tarefasDaColuna.length}</Badge>
                  </Card.Header>
                  <Card.Body className="p-2">
                    {tarefasDaColuna.map((tarefa) => {
                      const corDivisao = DIVISOES.find((d) => d.valor === tarefa.divisao);

                      return (
                        <Card
                          key={tarefa.id_tarefa}
                          className="cartao-tarefa mb-2"
                          draggable={podeMover(tarefa)}
                          onDragStart={(e) => e.dataTransfer.setData("id", tarefa.id_tarefa)}
                          onClick={() => abrirEdicao(tarefa)}
                        >
                          <Card.Body className="p-2">
                            <Badge bg={corDivisao?.cor} className="mb-1">
                              {corDivisao?.rotulo}
                            </Badge>
                            <div className="fw-semibold">{tarefa.titulo}</div>
                            <small className="text-muted d-block">{nomeResponsavel(tarefa)}</small>
                            {visao !== "projeto" && (
                              <small className="text-muted d-block">{nomeProjeto(tarefa)}</small>
                            )}
                            {tarefa.vencimento && (
                              <small className={tarefa.atrasada ? "text-danger" : "text-muted"}>
                                {tarefa.atrasada ? "Atrasada - " : "Prazo: "}
                                {formatarData(tarefa.vencimento)}
                              </small>
                            )}
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal show={mostrarModal} onHide={() => setMostrarModal(false)}>
        <Form onSubmit={salvar}>
          <Modal.Header closeButton>
            <Modal.Title>{tarefaEditando ? "Editar tarefa" : "Nova tarefa"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control
                maxLength={200}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </Form.Group>

            <Row className="mb-3">
              <Col>
                <Form.Label>Divisão</Form.Label>
                <Form.Select value={divisao} onChange={(e) => setDivisao(e.target.value)}>
                  {DIVISOES.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.rotulo}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col>
                <Form.Label>Prazo</Form.Label>
                <Form.Control
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                />
              </Col>
            </Row>

            {!tarefaEditando && (
              <Form.Group className="mb-3">
                <Form.Label>Projeto</Form.Label>
                <Form.Select value={projetoTarefa} onChange={(e) => setProjetoTarefa(e.target.value)}>
                  <option value="">Sem projeto (tarefa avulsa)</option>
                  {projetosEmAndamento.map((p) => (
                    <option key={p.id_projeto} value={p.id_projeto}>
                      {p.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {admin && (
              <Form.Group>
                <Form.Label>Responsável</Form.Label>
                <Form.Select value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                  <option value="">Sem responsável</option>
                  {colaboradores.map((u) => (
                    <option key={u.id_usuario} value={u.id_usuario}>
                      {u.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {!admin && !tarefaEditando && (
              <Form.Check
                label="Sou o responsável por esta tarefa"
                checked={responsavel === String(usuario.id_usuario)}
                onChange={(e) => setResponsavel(e.target.checked ? String(usuario.id_usuario) : "")}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            {tarefaEditando && admin && (
              <Button variant="danger" className="me-auto" onClick={excluir}>
                Excluir
              </Button>
            )}
            <Button variant="secondary" onClick={() => setMostrarModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Layout>
  );
}

export default Tasks;
