import { useEffect, useState } from 'react';
import {
  listarClientes,
  listarProjetos,
  criarCliente,
  editarCliente,
  alterarStatusCliente,
  mensagemDeErro,
} from '../services/api';
import { STATUS_CLIENTE, rotulo } from '../utils/rotulos';
import Layout from '../components/Layout';
import '../components/Tela.css';

const COLUNAS = { gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 1.2fr' };
const FORM_VAZIO = { nome: '', contato: '' };

// Busca os clientes e conta quantos projetos cada um tem.
async function buscarDados() {
  const [clientes, projetos] = await Promise.all([listarClientes(), listarProjetos()]);

  const projetosPorCliente = {};
  for (const projeto of projetos) {
    projetosPorCliente[projeto.cliente_id] = (projetosPorCliente[projeto.cliente_id] || 0) + 1;
  }

  return { clientes, projetosPorCliente };
}

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [projetosPorCliente, setProjetosPorCliente] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  // null = formulário fechado; { id: null } = novo; { id: 5 } = editando
  const [formulario, setFormulario] = useState(null);
  const [dados, setDados] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // Incrementar a versão faz a lista ser buscada de novo.
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;

    buscarDados()
      .then((r) => {
        if (!ativo) return;
        setClientes(r.clientes);
        setProjetosPorCliente(r.projetosPorCliente);
      })
      .catch((e) => ativo && setErro(mensagemDeErro(e, 'Não foi possível carregar os clientes.')))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [versao]);

  function abrirNovo() {
    setDados(FORM_VAZIO);
    setFormulario({ id: null });
  }

  function abrirEdicao(cliente) {
    setDados({ nome: cliente.nome, contato: cliente.contato });
    setFormulario({ id: cliente.id_cliente });
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    const corpo = { nome: dados.nome.trim(), contato: dados.contato.trim() };

    try {
      if (formulario.id) {
        await editarCliente(formulario.id, corpo);
      } else {
        await criarCliente(corpo);
      }

      setFormulario(null);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o cliente.'));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(cliente) {
    setErro('');
    const novoStatus = cliente.status === 'ativa' ? 'inativa' : 'ativa';

    try {
      await alterarStatusCliente(cliente.id_cliente, novoStatus);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível alterar o status.'));
    }
  }

  const termo = busca.trim().toLowerCase();
  const clientesFiltrados = clientes.filter((cliente) => {
    const correspondeBusca =
      !termo ||
      cliente.nome.toLowerCase().includes(termo) ||
      (cliente.contato || '').toLowerCase().includes(termo);

    const correspondeStatus = !statusFiltro || cliente.status === statusFiltro;

    return correspondeBusca && correspondeStatus;
  });

  return (
    <Layout titulo="Clientes" subtitulo="Clientes da agência e seus contatos.">
      <div className="tela-conteudo">
        <div className="tela-filtros">
          <input
            type="text"
            placeholder="Buscar por nome ou contato..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            <option value="">Status: Todos</option>
            {STATUS_CLIENTE.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>

          <button className="botao-primario" onClick={abrirNovo}>
            + Novo cliente
          </button>
        </div>

        {erro && <p className="tela-erro">{erro}</p>}

        {formulario && (
          <form className="tela-form" onSubmit={salvar}>
            <h2>{formulario.id ? 'Editar cliente' : 'Novo cliente'}</h2>

            <label htmlFor="cliente-nome">Nome</label>
            <input
              id="cliente-nome"
              type="text"
              maxLength={150}
              value={dados.nome}
              onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              required
            />

            <label htmlFor="cliente-contato">Contato (e-mail, telefone ou responsável)</label>
            <input
              id="cliente-contato"
              type="text"
              maxLength={150}
              value={dados.contato}
              onChange={(e) => setDados({ ...dados, contato: e.target.value })}
              required
            />

            <div className="tela-form-botoes">
              <button type="submit" className="botao-primario" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" className="botao-secundario" onClick={() => setFormulario(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="tela-tabela">
          <div className="tela-tabela-cabecalho" style={COLUNAS}>
            <span>Cliente</span>
            <span>Contato</span>
            <span>Projetos</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {clientesFiltrados.map((cliente) => (
            <div className="tela-tabela-linha" style={COLUNAS} key={cliente.id_cliente}>
              <span>{cliente.nome}</span>
              <span>{cliente.contato}</span>
              <span>{projetosPorCliente[cliente.id_cliente] || 0}</span>
              <span>
                <span className={`selo ${cliente.status === 'ativa' ? 'verde' : 'cinza'}`}>
                  {rotulo(STATUS_CLIENTE, cliente.status)}
                </span>
              </span>
              <span className="acoes">
                <button onClick={() => abrirEdicao(cliente)}>Editar</button>
                <span>·</span>
                <button onClick={() => alternarStatus(cliente)}>
                  {cliente.status === 'ativa' ? 'Inativar' : 'Ativar'}
                </button>
              </span>
            </div>
          ))}

          {carregando && <p className="tela-vazio">Carregando...</p>}

          {!carregando && clientesFiltrados.length === 0 && (
            <p className="tela-vazio">Nenhum cliente encontrado.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Clientes;
