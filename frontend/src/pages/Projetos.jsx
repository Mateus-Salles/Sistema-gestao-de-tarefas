import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Modal, Form, Badge, Alert, Row, Col, ProgressBar } from "react-bootstrap";
import {
  listarProjetos,
  listarClientes,
  listarModelos,
  buscarProgressoProjeto,
  criarProjeto,
  editarProjeto,
  alterarStatusProjeto,
  mensagemDeErro
} from "../services/api";
import { getUsuarioLogado, ehAdministrador } from "../services/sessao";
import { STATUS_PROJETO, rotulo, formatarData } from "../utils/rotulos";
import Layout from "../components/Layout";

const CORES_STATUS = { andamento: "primary", concluido: "success", cancelado: "secondary" };

function Projetos() {
  const navigate = useNavigate();
  const admin = ehAdministrador(getUsuarioLogado());

  const [projetos, setProjetos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [progresso, setProgresso] = useState({});
  const [erro, setErro] = useState("");
  const [atualizar, setAtualizar] = useState(0);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [nome, setNome] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [dataComeco, setDataComeco] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const listaProjetos = await listarProjetos();
        setProjetos(listaProjetos);
        setClientes(await listarClientes());

        if (admin) {
          setModelos(await listarModelos());
        }

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
  }, [admin, atualizar]);

  function nomeCliente(id) {
    const cliente = clientes.find((c) => c.id_cliente === id);
    return cliente ? cliente.nome : "-";
  }

  function nomeModelo(id) {
    const modelo = modelos.find((m) => m.id_modelo_lancamento === id);
    return modelo ? modelo.nome : "-";
  }

  function novoProjeto() {
    setIdEditando(null);
    setNome("");
    setClienteId("");
    setModeloId("");
    setDataComeco("");
    setDataFinal("");
    setMostrarModal(true);
  }

  function abrirEdicao(projeto) {
    setIdEditando(projeto.id_projeto);
    setNome(projeto.nome);
    setDataComeco(projeto.data_comeco);
    setDataFinal(projeto.data_final);
    setMostrarModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    if (dataFinal < dataComeco) {
      setErro("A data de término não pode ser antes da data de início.");
      return;
    }

    try {
      if (idEditando) {
        await editarProjeto(idEditando, {
          nome,
          data_comeco: dataComeco,
          data_final: dataFinal
        });
      } else {
        await criarProjeto({
          nome,
          cliente_id: Number(clienteId),
          modelo_lancamento_id: Number(modeloId),
          data_comeco: dataComeco,
          data_final: dataFinal
        });
      }
      setMostrarModal(false);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function mudarStatus(projeto, status) {
    setErro("");

    try {
      await alterarStatusProjeto(projeto.id_projeto, status);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  const projetosFiltrados = projetos.filter((projeto) => {
    const texto = busca.toLowerCase();
    const achouNome =
      projeto.nome.toLowerCase().includes(texto) ||
      nomeCliente(projeto.cliente_id).toLowerCase().includes(texto);
    const achouStatus = filtroStatus === "" || projeto.status === filtroStatus;
    return achouNome && achouStatus;
  });

  const clientesAtivos = clientes.filter((c) => c.status === "ativa");

  return (
    <Layout titulo="Projetos">
      {erro && <Alert variant="danger">{erro}</Alert>}

      <Row className="mb-3 g-2">
        <Col md={5}>
          <Form.Control
            placeholder="Buscar por projeto ou cliente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUS_PROJETO.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col className="text-end">
          {admin && <Button onClick={novoProjeto}>Novo projeto</Button>}
        </Col>
      </Row>

      <Table bordered hover responsive className="bg-white">
        <thead>
          <tr>
            <th>Projeto</th>
            <th>Cliente</th>
            {admin && <th>Modelo</th>}
            <th>Período</th>
            <th style={{ width: "150px" }}>Progresso</th>
            <th>Status</th>
            {admin && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {projetosFiltrados.map((projeto) => (
            <tr key={projeto.id_projeto}>
              <td>{projeto.nome}</td>
              <td>{nomeCliente(projeto.cliente_id)}</td>
              {admin && <td>{nomeModelo(projeto.modelo_lancamento_id)}</td>}
              <td>
                {formatarData(projeto.data_comeco)} a {formatarData(projeto.data_final)}
              </td>
              <td>
                <ProgressBar
                  now={progresso[projeto.id_projeto] || 0}
                  label={`${progresso[projeto.id_projeto] || 0}%`}
                />
              </td>
              <td>
                <Badge bg={CORES_STATUS[projeto.status]}>
                  {rotulo(STATUS_PROJETO, projeto.status)}
                </Badge>
              </td>
              {admin && (
                <td className="text-nowrap">
                  <Button
                    size="sm"
                    variant="outline-dark"
                    className="me-1"
                    onClick={() => navigate(`/tarefas?projeto=${projeto.id_projeto}`)}
                  >
                    Kanban
                  </Button>
                  <Button size="sm" variant="outline-primary" className="me-1" onClick={() => abrirEdicao(projeto)}>
                    Editar
                  </Button>
                  {projeto.status === "andamento" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline-success"
                        className="me-1"
                        onClick={() => mudarStatus(projeto, "concluido")}
                      >
                        Concluir
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => mudarStatus(projeto, "cancelado")}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline-secondary" onClick={() => mudarStatus(projeto, "andamento")}>
                      Reabrir
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {projetosFiltrados.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-muted">
                Nenhum projeto encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal show={mostrarModal} onHide={() => setMostrarModal(false)}>
        <Form onSubmit={salvar}>
          <Modal.Header closeButton>
            <Modal.Title>{idEditando ? "Editar projeto" : "Novo projeto"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome do projeto</Form.Label>
              <Form.Control
                maxLength={150}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </Form.Group>

            {!idEditando && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Cliente</Form.Label>
                  <Form.Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                    <option value="">Selecione</option>
                    {clientesAtivos.map((c) => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.nome}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Modelo de lançamento</Form.Label>
                  <Form.Select value={modeloId} onChange={(e) => setModeloId(e.target.value)} required>
                    <option value="">Selecione</option>
                    {modelos.map((m) => (
                      <option key={m.id_modelo_lancamento} value={m.id_modelo_lancamento}>
                        {m.nome}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text>As tarefas padrão do modelo são criadas junto com o projeto.</Form.Text>
                </Form.Group>
              </>
            )}

            <Row>
              <Col>
                <Form.Group>
                  <Form.Label>Início</Form.Label>
                  <Form.Control
                    type="date"
                    value={dataComeco}
                    onChange={(e) => setDataComeco(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Término</Form.Label>
                  <Form.Control
                    type="date"
                    value={dataFinal}
                    onChange={(e) => setDataFinal(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
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

export default Projetos;
