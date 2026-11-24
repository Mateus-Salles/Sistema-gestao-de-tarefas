import { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Badge, Alert, Row, Col, Card, ListGroup } from "react-bootstrap";
import {
  listarModelos,
  buscarModelo,
  criarModelo,
  editarModelo,
  excluirModelo,
  criarTarefaPadrao,
  editarTarefaPadrao,
  excluirTarefaPadrao,
  mensagemDeErro
} from "../services/api";
import { DIVISOES, formatarData } from "../utils/rotulos";
import Layout from "../components/Layout";

function Modelos() {
  const [modelos, setModelos] = useState([]);
  const [modeloAberto, setModeloAberto] = useState(null);
  const [erro, setErro] = useState("");
  const [atualizar, setAtualizar] = useState(0);

  const [mostrarModalModelo, setMostrarModalModelo] = useState(false);
  const [idModeloEditando, setIdModeloEditando] = useState(null);
  const [nomeModelo, setNomeModelo] = useState("");

  const [mostrarModalTarefa, setMostrarModalTarefa] = useState(false);
  const [idTarefaEditando, setIdTarefaEditando] = useState(null);
  const [tituloTarefa, setTituloTarefa] = useState("");
  const [divisaoTarefa, setDivisaoTarefa] = useState("produto");

  useEffect(() => {
    async function carregar() {
      try {
        setModelos(await listarModelos());
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    }
    carregar();
  }, [atualizar]);

  async function abrirModelo(id) {
    setErro("");
    try {
      setModeloAberto(await buscarModelo(id));
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  function novoModelo() {
    setIdModeloEditando(null);
    setNomeModelo("");
    setMostrarModalModelo(true);
  }

  function renomearModelo(modelo) {
    setIdModeloEditando(modelo.id_modelo_lancamento);
    setNomeModelo(modelo.nome);
    setMostrarModalModelo(true);
  }

  async function salvarModelo(e) {
    e.preventDefault();
    setErro("");

    try {
      if (idModeloEditando) {
        await editarModelo(idModeloEditando, nomeModelo);
        if (modeloAberto?.id_modelo_lancamento === idModeloEditando) {
          await abrirModelo(idModeloEditando);
        }
      } else {
        const criado = await criarModelo(nomeModelo);
        await abrirModelo(criado.id_modelo_lancamento);
      }
      setMostrarModalModelo(false);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function arquivarModelo(modelo) {
    if (!window.confirm(`Arquivar o modelo "${modelo.nome}"?`)) return;
    setErro("");

    try {
      await excluirModelo(modelo.id_modelo_lancamento);
      if (modeloAberto?.id_modelo_lancamento === modelo.id_modelo_lancamento) {
        setModeloAberto(null);
      }
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  function novaTarefa(divisao) {
    setIdTarefaEditando(null);
    setTituloTarefa("");
    setDivisaoTarefa(divisao);
    setMostrarModalTarefa(true);
  }

  function abrirEdicaoTarefa(tarefa) {
    setIdTarefaEditando(tarefa.id_tarefa_padrao);
    setTituloTarefa(tarefa.titulo);
    setDivisaoTarefa(tarefa.divisao);
    setMostrarModalTarefa(true);
  }

  async function salvarTarefa(e) {
    e.preventDefault();
    setErro("");

    const idModelo = modeloAberto.id_modelo_lancamento;
    const dados = { titulo: tituloTarefa, divisao: divisaoTarefa };

    try {
      if (idTarefaEditando) {
        await editarTarefaPadrao(idModelo, idTarefaEditando, dados);
      } else {
        await criarTarefaPadrao(idModelo, dados);
      }
      setMostrarModalTarefa(false);
      await abrirModelo(idModelo);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function removerTarefa(tarefa) {
    if (!window.confirm(`Remover a tarefa "${tarefa.titulo}"?`)) return;
    setErro("");

    try {
      await excluirTarefaPadrao(modeloAberto.id_modelo_lancamento, tarefa.id_tarefa_padrao);
      await abrirModelo(modeloAberto.id_modelo_lancamento);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  const tarefasPadrao = modeloAberto ? modeloAberto.tarefas_padrao : [];

  return (
    <Layout titulo="Modelos de lançamento">
      {erro && <Alert variant="danger">{erro}</Alert>}

      <div className="mb-3 text-end">
        <Button onClick={novoModelo}>Novo modelo</Button>
      </div>

      <Row className="g-3">
        <Col xl={5}>
          <Table bordered hover responsive className="bg-white">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((modelo) => (
                <tr
                  key={modelo.id_modelo_lancamento}
                  className={modeloAberto?.id_modelo_lancamento === modelo.id_modelo_lancamento ? "table-primary" : ""}
                >
                  <td>{modelo.nome}</td>
                  <td>{formatarData(modelo.criado_em)}</td>
                  <td className="text-nowrap">
                    <Button size="sm" variant="outline-dark" className="me-1" onClick={() => abrirModelo(modelo.id_modelo_lancamento)}>
                      Tarefas
                    </Button>
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => renomearModelo(modelo)}>
                      Renomear
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => arquivarModelo(modelo)}>
                      Arquivar
                    </Button>
                  </td>
                </tr>
              ))}
              {modelos.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    Nenhum modelo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Col>

        <Col xl={7}>
          {!modeloAberto ? (
            <Card body className="text-muted">
              Clique em "Tarefas" para ver as tarefas padrão de um modelo.
            </Card>
          ) : (
            <Card>
              <Card.Header>
                <strong>{modeloAberto.nome}</strong> - {tarefasPadrao.length} tarefa(s) padrão
              </Card.Header>
              <Card.Body>
                {DIVISOES.map((divisao) => {
                  const tarefasDaDivisao = tarefasPadrao.filter((t) => t.divisao === divisao.valor);

                  return (
                    <div key={divisao.valor} className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <Badge bg={divisao.cor}>{divisao.rotulo}</Badge>
                        <Button size="sm" variant="link" onClick={() => novaTarefa(divisao.valor)}>
                          + Adicionar
                        </Button>
                      </div>
                      <ListGroup>
                        {tarefasDaDivisao.map((tarefa) => (
                          <ListGroup.Item
                            key={tarefa.id_tarefa_padrao}
                            className="d-flex justify-content-between align-items-center"
                          >
                            {tarefa.titulo}
                            <span className="text-nowrap">
                              <Button size="sm" variant="outline-primary" className="me-1" onClick={() => abrirEdicaoTarefa(tarefa)}>
                                Editar
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => removerTarefa(tarefa)}>
                                Remover
                              </Button>
                            </span>
                          </ListGroup.Item>
                        ))}
                        {tarefasDaDivisao.length === 0 && (
                          <ListGroup.Item className="text-muted">Nenhuma tarefa.</ListGroup.Item>
                        )}
                      </ListGroup>
                    </div>
                  );
                })}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <Modal show={mostrarModalModelo} onHide={() => setMostrarModalModelo(false)}>
        <Form onSubmit={salvarModelo}>
          <Modal.Header closeButton>
            <Modal.Title>{idModeloEditando ? "Renomear modelo" : "Novo modelo"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Nome do modelo</Form.Label>
              <Form.Control
                maxLength={150}
                value={nomeModelo}
                onChange={(e) => setNomeModelo(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarModalModelo(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={mostrarModalTarefa} onHide={() => setMostrarModalTarefa(false)}>
        <Form onSubmit={salvarTarefa}>
          <Modal.Header closeButton>
            <Modal.Title>{idTarefaEditando ? "Editar tarefa padrão" : "Nova tarefa padrão"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control
                maxLength={150}
                value={tituloTarefa}
                onChange={(e) => setTituloTarefa(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Divisão</Form.Label>
              <Form.Select value={divisaoTarefa} onChange={(e) => setDivisaoTarefa(e.target.value)}>
                {DIVISOES.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.rotulo}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarModalTarefa(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Layout>
  );
}

export default Modelos;
