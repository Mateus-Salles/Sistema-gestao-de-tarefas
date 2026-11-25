import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listarProjetos,
  listarClientes,
  listarModelos,
  buscarProgressoProjeto,
  criarProjeto,
  editarProjeto,
  alterarStatusProjeto,
  mensagemDeErro,
} from '../services/api';
import { getUsuarioLogado, ehAdministrador } from '../utils/perfil';
import { STATUS_PROJETO, rotulo, formatarData } from '../utils/rotulos';
import Layout from '../components/Layout';
import '../components/Tela.css';

const FORM_VAZIO = {
  nome: '',
  cliente_id: '',
  modelo_lancamento_id: '',
  data_comeco: '',
  data_final: '',
};

const COR_STATUS = { andamento: 'azul', concluido: 'verde', cancelado: 'cinza' };

// Busca projetos, clientes, modelos (só o administrador tem acesso a eles)
// e o progresso de cada projeto.
async function buscarDados(admin) {
  const [projetos, clientes, modelos] = await Promise.all([
    listarProjetos(),
    listarClientes(),
    admin ? listarModelos() : Promise.resolve([]),
  ]);

  const progressos = await Promise.all(
    projetos.map((p) => buscarProgressoProjeto(p.id_projeto).catch(() => null)),
  );

  const progresso = {};
  projetos.forEach((p, i) => {
    progresso[p.id_projeto] = progressos[i];
  });

  return { projetos, clientes, modelos, progresso };
}

function Projetos() {
  const navigate = useNavigate();
  const admin = ehAdministrador(getUsuarioLogado());

  const colunas = {
    gridTemplateColumns: admin ? '1.5fr 1.2fr 1.3fr 1.6fr 1.1fr 1fr 2.1fr' : '1.8fr 1.4fr 1.4fr 1.4fr 1fr',
  };

  const [projetos, setProjetos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [progresso, setProgresso] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  // null = fechado; { id: null } = novo projeto; { id: 3 } = editando
  const [formulario, setFormulario] = useState(null);
  const [dados, setDados] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // Incrementar a versão faz os dados serem buscados de novo.
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;

    buscarDados(admin)
      .then((r) => {
        if (!ativo) return;
        setProjetos(r.projetos);
        setClientes(r.clientes);
        setModelos(r.modelos);
        setProgresso(r.progresso);
      })
      .catch((e) => ativo && setErro(mensagemDeErro(e, 'Não foi possível carregar os projetos.')))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [admin, versao]);

  const nomeCliente = (id) => clientes.find((c) => c.id_cliente === id)?.nome || '-';
  const nomeModelo = (id) => modelos.find((m) => m.id_modelo_lancamento === id)?.nome || '-';

  function abrirNovo() {
    setDados(FORM_VAZIO);
    setFormulario({ id: null });
  }

  function abrirEdicao(projeto) {
    setDados({
      ...FORM_VAZIO,
      nome: projeto.nome,
      data_comeco: projeto.data_comeco,
      data_final: projeto.data_final,
    });
    setFormulario({ id: projeto.id_projeto });
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');

    if (dados.data_final < dados.data_comeco) {
      setErro('A data final deve ser igual ou posterior à data de começo.');
      return;
    }

    setSalvando(true);

    try {
      if (formulario.id) {
        await editarProjeto(formulario.id, {
          nome: dados.nome.trim(),
          data_comeco: dados.data_comeco,
          data_final: dados.data_final,
        });
      } else {
        await criarProjeto({
          nome: dados.nome.trim(),
          cliente_id: Number(dados.cliente_id),
          modelo_lancamento_id: Number(dados.modelo_lancamento_id),
          data_comeco: dados.data_comeco,
          data_final: dados.data_final,
        });
      }

      setFormulario(null);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o projeto.'));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(projeto, status) {
    setErro('');

    try {
      await alterarStatusProjeto(projeto.id_projeto, status);
      recarregar();
    } catch (e) {
      // Ex.: concluir com tarefas pendentes é bloqueado pelo banco.
      setErro(mensagemDeErro(e, 'Não foi possível alterar o status.'));
    }
  }

  const termo = busca.trim().toLowerCase();
  const projetosFiltrados = projetos.filter((projeto) => {
    const correspondeBusca =
      !termo ||
      projeto.nome.toLowerCase().includes(termo) ||
      nomeCliente(projeto.cliente_id).toLowerCase().includes(termo);

    const correspondeStatus = !statusFiltro || projeto.status === statusFiltro;

    return correspondeBusca && correspondeStatus;
  });

  const clientesAtivos = clientes.filter((c) => c.status === 'ativa');
  const modelosAtivos = modelos.filter((m) => m.status === 'ativo');

  return (
    <Layout titulo="Projetos" subtitulo="Lançamentos da agência e seu andamento.">
      <div className="tela-conteudo">
        <div className="tela-filtros">
          <input
            type="text"
            placeholder="Buscar por projeto ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            <option value="">Status: Todos</option>
            {STATUS_PROJETO.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>

          {admin && (
            <button className="botao-primario" onClick={abrirNovo}>
              + Novo projeto
            </button>
          )}
        </div>

        {erro && <p className="tela-erro">{erro}</p>}

        {admin && formulario && (
          <form className="tela-form" onSubmit={salvar}>
            <h2>{formulario.id ? 'Editar projeto' : 'Novo projeto'}</h2>

            <label htmlFor="projeto-nome">Nome do projeto</label>
            <input
              id="projeto-nome"
              type="text"
              maxLength={150}
              value={dados.nome}
              onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              required
            />

            {!formulario.id && (
              <>
                <label htmlFor="projeto-cliente">Cliente</label>
                <select
                  id="projeto-cliente"
                  value={dados.cliente_id}
                  onChange={(e) => setDados({ ...dados, cliente_id: e.target.value })}
                  required
                >
                  <option value="">Selecione o cliente</option>
                  {clientesAtivos.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nome}
                    </option>
                  ))}
                </select>

                <label htmlFor="projeto-modelo">Modelo de lançamento</label>
                <select
                  id="projeto-modelo"
                  value={dados.modelo_lancamento_id}
                  onChange={(e) => setDados({ ...dados, modelo_lancamento_id: e.target.value })}
                  required
                >
                  <option value="">Selecione o modelo</option>
                  {modelosAtivos.map((m) => (
                    <option key={m.id_modelo_lancamento} value={m.id_modelo_lancamento}>
                      {m.nome}
                    </option>
                  ))}
                </select>

                {modelosAtivos.length === 0 && (
                  <p className="tela-carregando" style={{ marginBottom: 12 }}>
                    Nenhum modelo ativo. Cadastre um em Modelos de lançamento.
                  </p>
                )}
              </>
            )}

            <div className="tela-form-linha">
              <div>
                <label htmlFor="projeto-inicio">Início</label>
                <input
                  id="projeto-inicio"
                  type="date"
                  value={dados.data_comeco}
                  onChange={(e) => setDados({ ...dados, data_comeco: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="projeto-fim">Término</label>
                <input
                  id="projeto-fim"
                  type="date"
                  value={dados.data_final}
                  onChange={(e) => setDados({ ...dados, data_final: e.target.value })}
                  required
                />
              </div>
            </div>

            {!formulario.id && (
              <p className="tela-carregando" style={{ marginBottom: 12 }}>
                As tarefas padrão do modelo escolhido são criadas automaticamente.
              </p>
            )}

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
          <div className="tela-tabela-cabecalho" style={colunas}>
            <span>Projeto</span>
            <span>Cliente</span>
            {admin && <span>Modelo</span>}
            <span>Período</span>
            <span>Progresso</span>
            <span>Status</span>
            {admin && <span>Ações</span>}
          </div>

          {projetosFiltrados.map((projeto) => {
            const p = progresso[projeto.id_projeto];
            const percentual = Math.round(Number(p?.percentual_concluido) || 0);

            return (
              <div className="tela-tabela-linha" style={colunas} key={projeto.id_projeto}>
                <span>{projeto.nome}</span>
                <span>{nomeCliente(projeto.cliente_id)}</span>
                {admin && <span>{nomeModelo(projeto.modelo_lancamento_id)}</span>}
                <span>
                  {formatarData(projeto.data_comeco)} a {formatarData(projeto.data_final)}
                </span>
                <span
                  className="barra-progresso"
                  title={p ? `${p.tarefas_concluidas} de ${p.total_tarefas} tarefas concluídas` : ''}
                >
                  <span className="barra-progresso-trilho">
                    <span
                      className="barra-progresso-preenchida"
                      style={{ width: `${percentual}%`, display: 'block' }}
                    />
                  </span>
                  <span className="barra-progresso-texto">{percentual}%</span>
                </span>
                <span>
                  <span className={`selo ${COR_STATUS[projeto.status] || ''}`}>
                    {rotulo(STATUS_PROJETO, projeto.status)}
                  </span>
                </span>

                {admin && (
                  <span className="acoes">
                    <button onClick={() => navigate(`/tarefas?projeto=${projeto.id_projeto}`)}>Kanban</button>
                    <span>·</span>
                    <button onClick={() => abrirEdicao(projeto)}>Editar</button>
                    {projeto.status === 'andamento' ? (
                      <>
                        <span>·</span>
                        <button onClick={() => mudarStatus(projeto, 'concluido')}>Concluir</button>
                        <span>·</span>
                        <button className="perigo" onClick={() => mudarStatus(projeto, 'cancelado')}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span>·</span>
                        <button onClick={() => mudarStatus(projeto, 'andamento')}>Reabrir</button>
                      </>
                    )}
                  </span>
                )}
              </div>
            );
          })}

          {carregando && <p className="tela-vazio">Carregando...</p>}

          {!carregando && projetosFiltrados.length === 0 && (
            <p className="tela-vazio">Nenhum projeto encontrado.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Projetos;
