import { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Badge, Alert, Row, Col } from "react-bootstrap";
import {
  listarClientes,
  listarProjetos,
  criarCliente,
  editarCliente,
  alterarStatusCliente,
  mensagemDeErro
} from "../services/api";
import Layout from "../components/Layout";

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [erro, setErro] = useState("");
  const [atualizar, setAtualizar] = useState(0);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        setClientes(await listarClientes());
        setProjetos(await listarProjetos());
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    }
    carregar();
  }, [atualizar]);

  function novoCliente() {
    setIdEditando(null);
    setNome("");
    setContato("");
    setMostrarModal(true);
  }

  function abrirEdicao(cliente) {
    setIdEditando(cliente.id_cliente);
    setNome(cliente.nome);
    setContato(cliente.contato);
    setMostrarModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    try {
      if (idEditando) {
        await editarCliente(idEditando, { nome, contato });
      } else {
        await criarCliente({ nome, contato });
      }
      setMostrarModal(false);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function mudarStatus(cliente) {
    setErro("");
    const novoStatus = cliente.status === "ativa" ? "inativa" : "ativa";

    try {
      await alterarStatusCliente(cliente.id_cliente, novoStatus);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  function quantidadeProjetos(idCliente) {
    return projetos.filter((p) => p.cliente_id === idCliente).length;
  }

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = busca.toLowerCase();
    const achouNome =
      cliente.nome.toLowerCase().includes(texto) ||
      cliente.contato.toLowerCase().includes(texto);
    const achouStatus = filtroStatus === "" || cliente.status === filtroStatus;
    return achouNome && achouStatus;
  });

  return (
    <Layout titulo="Clientes">
      {erro && <Alert variant="danger">{erro}</Alert>}

      <Row className="mb-3 g-2">
        <Col md={5}>
          <Form.Control
            placeholder="Buscar por nome ou contato"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativa">Ativo</option>
            <option value="inativa">Inativo</option>
          </Form.Select>
        </Col>
        <Col className="text-end">
          <Button onClick={novoCliente}>Novo cliente</Button>
        </Col>
      </Row>

      <Table bordered hover className="bg-white">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contato</th>
            <th>Projetos</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clientesFiltrados.map((cliente) => (
            <tr key={cliente.id_cliente}>
              <td>{cliente.nome}</td>
              <td>{cliente.contato}</td>
              <td>{quantidadeProjetos(cliente.id_cliente)}</td>
              <td>
                {cliente.status === "ativa" ? (
                  <Badge bg="success">Ativo</Badge>
                ) : (
                  <Badge bg="secondary">Inativo</Badge>
                )}
              </td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => abrirEdicao(cliente)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline-secondary" onClick={() => mudarStatus(cliente)}>
                  {cliente.status === "ativa" ? "Inativar" : "Ativar"}
                </Button>
              </td>
            </tr>
          ))}
          {clientesFiltrados.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted">
                Nenhum cliente encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal show={mostrarModal} onHide={() => setMostrarModal(false)}>
        <Form onSubmit={salvar}>
          <Modal.Header closeButton>
            <Modal.Title>{idEditando ? "Editar cliente" : "Novo cliente"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                maxLength={150}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Contato</Form.Label>
              <Form.Control
                maxLength={150}
                placeholder="E-mail, telefone ou nome do responsável"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                required
              />
            </Form.Group>
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

export default Clientes;
