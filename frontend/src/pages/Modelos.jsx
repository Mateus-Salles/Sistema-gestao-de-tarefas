import { useEffect, useState } from 'react';
import {
  listarModelos,
  buscarModelo,
  criarModelo,
  editarModelo,
  excluirModelo,
  criarTarefaPadrao,
  editarTarefaPadrao,
  excluirTarefaPadrao,
  mensagemDeErro,
} from '../services/api';
import { DIVISOES, formatarData } from '../utils/rotulos';
import Layout from '../components/Layout';
import '../components/Tela.css';
import './Modelos.css';

const COLUNAS_MODELOS = { gridTemplateColumns: '1.7fr 0.9fr 1.9fr' };
const TAREFA_VAZIA = { titulo: '', divisao: 'produto' };

function Modelos() {
  const [modelos, setModelos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Formulário do modelo: null = fechado; { id: null } = novo; { id: 2 } = editando
  const [formModelo, setFormModelo] = useState(null);
  const [nomeModelo, setNomeModelo] = useState('');

  // Modelo aberto, com as tarefas padrão
  const [selecionado, setSelecionado] = useState(null);

  // Formulário de tarefa padrão: null = fechado; { id: null } = nova; { id: 9 } = editando
  const [formTarefa, setFormTarefa] = useState(null);
  const [tarefa, setTarefa] = useState(TAREFA_VAZIA);

  const [salvando, setSalvando] = useState(false);

  // Incrementar a versão faz a lista de modelos ser buscada de novo.
  const [versao, setVersao] = useState(0);
  const recarregarModelos = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;

    listarModelos()
      .then((lista) => ativo && setModelos(lista))
      .catch((e) => ativo && setErro(mensagemDeErro(e, 'Não foi possível carregar os modelos.')))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [versao]);

  async function abrirModelo(id) {
    setErro('');
    setFormTarefa(null);

    try {
      setSelecionado(await buscarModelo(id));
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível abrir o modelo.'));
    }
  }

  // ---------- Modelo ----------

  function novoModelo() {
    setErro('');
    setNomeModelo('');
    setFormModelo({ id: null });
  }

  function editarNomeModelo(modelo) {
    setErro('');
    setNomeModelo(modelo.nome);
    setFormModelo({ id: modelo.id_modelo_lancamento });
  }

  async function salvarModelo(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      if (formModelo.id) {
        await editarModelo(formModelo.id, nomeModelo.trim());
        if (selecionado?.id_modelo_lancamento === formModelo.id) {
          await abrirModelo(formModelo.id);
        }
      } else {
        const criado = await criarModelo(nomeModelo.trim());
        await abrirModelo(criado.id_modelo_lancamento);
      }

      setFormModelo(null);
      recarregarModelos();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o modelo.'));
    } finally {
      setSalvando(false);
    }
  }

  async function arquivarModelo(modelo) {
    const confirmado = window.confirm(
      `Arquivar o modelo "${modelo.nome}"? Ele deixa de aparecer na criação de ` +
        'projetos. Os projetos já criados com ele não são alterados.',
    );
    if (!confirmado) return;

    setErro('');

    try {
      await excluirModelo(modelo.id_modelo_lancamento);
      if (selecionado?.id_modelo_lancamento === modelo.id_modelo_lancamento) {
        setSelecionado(null);
      }
      recarregarModelos();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível arquivar o modelo.'));
    }
  }

  // ---------- Tarefas padrão ----------

  function novaTarefa(divisao = 'produto') {
    setErro('');
    setTarefa({ ...TAREFA_VAZIA, divisao });
    setFormTarefa({ id: null });
  }

  function editarTarefa(t) {
    setErro('');
    setTarefa({ titulo: t.titulo, divisao: t.divisao });
    setFormTarefa({ id: t.id_tarefa_padrao });
  }

  async function salvarTarefa(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    const modeloId = selecionado.id_modelo_lancamento;
    const corpo = { titulo: tarefa.titulo.trim(), divisao: tarefa.divisao };

    try {
      if (formTarefa.id) {
        await editarTarefaPadrao(modeloId, formTarefa.id, corpo);
      } else {
        await criarTarefaPadrao(modeloId, corpo);
      }

      setFormTarefa(null);
      await abrirModelo(modeloId);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar a tarefa padrão.'));
    } finally {
      setSalvando(false);
    }
  }

  async function removerTarefa(t) {
    if (!window.confirm(`Remover a tarefa padrão "${t.titulo}"?`)) return;

    setErro('');

    try {
      await excluirTarefaPadrao(selecionado.id_modelo_lancamento, t.id_tarefa_padrao);
      await abrirModelo(selecionado.id_modelo_lancamento);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível remover a tarefa padrão.'));
    }
  }

  const tarefasPadrao = selecionado?.tarefas_padrao || [];

  return (
    <Layout
      titulo="Modelos de lançamento"
      subtitulo="Tarefas padrão criadas automaticamente em cada novo projeto."
    >
      <div className="tela-conteudo">
        <div className="tela-filtros">
          <button className="botao-primario" onClick={novoModelo}>
            + Novo modelo
          </button>
        </div>

        {erro && <p className="tela-erro">{erro}</p>}

        {formModelo && (
          <form className="tela-form" onSubmit={salvarModelo}>
            <h2>{formModelo.id ? 'Renomear modelo' : 'Novo modelo'}</h2>

            <label htmlFor="modelo-nome">Nome do modelo</label>
            <input
              id="modelo-nome"
              type="text"
              maxLength={150}
              placeholder="Ex.: Lançamento semente"
              value={nomeModelo}
              onChange={(e) => setNomeModelo(e.target.value)}
              required
            />

            <div className="tela-form-botoes">
              <button type="submit" className="botao-primario" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" className="botao-secundario" onClick={() => setFormModelo(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="modelos-grade">
          <div className="tela-tabela">
            <div className="tela-tabela-cabecalho" style={COLUNAS_MODELOS}>
              <span>Modelo</span>
              <span>Criado em</span>
              <span>Ações</span>
            </div>

            {modelos.map((m) => (
              <div
                key={m.id_modelo_lancamento}
                className={
                  selecionado?.id_modelo_lancamento === m.id_modelo_lancamento
                    ? 'tela-tabela-linha selecionada'
                    : 'tela-tabela-linha'
                }
                style={COLUNAS_MODELOS}
              >
                <span>{m.nome}</span>
                <span>{formatarData(m.criado_em)}</span>
                <span className="acoes">
                  <button onClick={() => abrirModelo(m.id_modelo_lancamento)}>Tarefas</button>
                  <span>·</span>
                  <button onClick={() => editarNomeModelo(m)}>Renomear</button>
                  <span>·</span>
                  <button className="perigo" onClick={() => arquivarModelo(m)}>
                    Arquivar
                  </button>
                </span>
              </div>
            ))}

            {carregando && <p className="tela-vazio">Carregando...</p>}

            {!carregando && modelos.length === 0 && (
              <p className="tela-vazio">Nenhum modelo cadastrado. Crie um para poder criar projetos.</p>
            )}
          </div>

          <div className="modelo-detalhe">
            {!selecionado ? (
              <p className="tela-vazio">
                Clique em “Tarefas” para ver e editar as tarefas padrão de um modelo.
              </p>
            ) : (
              <>
                <div className="modelo-detalhe-topo">
                  <div>
                    <h2>{selecionado.nome}</h2>
                    <p>{tarefasPadrao.length} tarefa(s) padrão</p>
                  </div>
                  <button className="botao-primario" onClick={() => novaTarefa()}>
                    + Tarefa padrão
                  </button>
                </div>

                {formTarefa && (
                  <form className="tela-form modelo-form-tarefa" onSubmit={salvarTarefa}>
                    <label htmlFor="tarefa-titulo">Título</label>
                    <input
                      id="tarefa-titulo"
                      type="text"
                      maxLength={150}
                      value={tarefa.titulo}
                      onChange={(e) => setTarefa({ ...tarefa, titulo: e.target.value })}
                      required
                    />

                    <label htmlFor="tarefa-divisao">Divisão</label>
                    <select
                      id="tarefa-divisao"
                      value={tarefa.divisao}
                      onChange={(e) => setTarefa({ ...tarefa, divisao: e.target.value })}
                    >
                      {DIVISOES.map((d) => (
                        <option key={d.valor} value={d.valor}>
                          {d.rotulo}
                        </option>
                      ))}
                    </select>

                    <div className="tela-form-botoes">
                      <button type="submit" className="botao-primario" disabled={salvando}>
                        {formTarefa.id ? 'Salvar' : 'Adicionar'}
                      </button>
                      <button type="button" className="botao-secundario" onClick={() => setFormTarefa(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {DIVISOES.map((divisao) => {
                  const daDivisao = tarefasPadrao.filter((t) => t.divisao === divisao.valor);

                  return (
                    <div className="modelo-divisao" key={divisao.valor}>
                      <div className="modelo-divisao-titulo">
                        <span className={`tag ${divisao.valor}`}>{divisao.rotulo}</span>
                        <button onClick={() => novaTarefa(divisao.valor)}>+ adicionar</button>
                      </div>

                      {daDivisao.map((t) => (
                        <div className="modelo-tarefa" key={t.id_tarefa_padrao}>
                          <span>{t.titulo}</span>
                          <span className="acoes">
                            <button onClick={() => editarTarefa(t)}>Editar</button>
                            <span>·</span>
                            <button className="perigo" onClick={() => removerTarefa(t)}>
                              Remover
                            </button>
                          </span>
                        </div>
                      ))}

                      {daDivisao.length === 0 && (
                        <p className="modelo-divisao-vazia">Nenhuma tarefa nesta divisão.</p>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Modelos;
