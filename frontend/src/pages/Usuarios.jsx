import { useEffect, useState } from 'react';
import {
  listarUsuarios,
  criarUsuario,
  editarUsuario,
  alterarStatusUsuario,
  mensagemDeErro,
} from '../services/api';
import { getUsuarioLogado } from '../utils/perfil';
import { NIVEIS_ACESSO, STATUS_USUARIO, rotulo, formatarData } from '../utils/rotulos';
import Layout from '../components/Layout';
import '../components/Tela.css';

const COLUNAS = { gridTemplateColumns: '1.6fr 2fr 1fr 0.8fr 1fr 1.2fr' };
const FORM_VAZIO = { nome: '', email: '', senha: '', nivel_acesso: 'colaborador' };
const SENHA_MINIMA = 8;

function Usuarios() {
  const meuId = getUsuarioLogado()?.id_usuario;

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [busca, setBusca] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  // null = fechado; { id: null } = novo usuário; { id: 4 } = editando
  const [formulario, setFormulario] = useState(null);
  const [dados, setDados] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // Incrementar a versão faz a lista ser buscada de novo.
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;

    listarUsuarios()
      .then((lista) => ativo && setUsuarios(lista))
      .catch((e) => ativo && setErro(mensagemDeErro(e, 'Não foi possível carregar os usuários.')))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [versao]);

  function limparMensagens() {
    setErro('');
    setSucesso('');
  }

  function abrirNovo() {
    limparMensagens();
    setDados(FORM_VAZIO);
    setFormulario({ id: null });
  }

  function abrirEdicao(usuario) {
    limparMensagens();
    setDados({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      nivel_acesso: usuario.nivel_acesso,
    });
    setFormulario({ id: usuario.id_usuario });
  }

  async function salvar(e) {
    e.preventDefault();
    limparMensagens();
    setSalvando(true);

    const corpo = {
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      nivel_acesso: dados.nivel_acesso,
    };

    try {
      if (formulario.id) {
        // O próprio administrador não pode mudar o seu nível de acesso.
        if (formulario.id === meuId) delete corpo.nivel_acesso;

        await editarUsuario(formulario.id, corpo);
        setSucesso('Usuário atualizado.');
      } else {
        await criarUsuario({ ...corpo, senha: dados.senha });
        setSucesso(
          `Usuário criado. Informe a senha inicial para ${corpo.nome}; ` +
            'ele pode trocá-la depois em Alterar senha.',
        );
      }

      setFormulario(null);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o usuário.'));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(usuario) {
    limparMensagens();
    const novoStatus = usuario.status === 'ativo' ? 'inativo' : 'ativo';

    try {
      await alterarStatusUsuario(usuario.id_usuario, novoStatus);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível alterar o status.'));
    }
  }

  const termo = busca.trim().toLowerCase();
  const usuariosFiltrados = usuarios.filter((u) => {
    if (termo && !u.nome.toLowerCase().includes(termo) && !u.email.toLowerCase().includes(termo))
      return false;
    if (nivelFiltro && u.nivel_acesso !== nivelFiltro) return false;
    if (statusFiltro && u.status !== statusFiltro) return false;
    return true;
  });

  const editandoAMimMesmo = formulario?.id && formulario.id === meuId;

  return (
    <Layout titulo="Usuários" subtitulo="Contas de acesso da equipe.">
      <div className="tela-conteudo">
        <div className="tela-filtros">
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
            <option value="">Nível: Todos</option>
            {NIVEIS_ACESSO.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.rotulo}
              </option>
            ))}
          </select>

          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            <option value="">Status: Todos</option>
            {STATUS_USUARIO.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>

          <button className="botao-primario" onClick={abrirNovo}>
            + Novo usuário
          </button>
        </div>

        {erro && <p className="tela-erro">{erro}</p>}
        {sucesso && <p className="tela-sucesso">{sucesso}</p>}

        {formulario && (
          <form className="tela-form" onSubmit={salvar}>
            <h2>{formulario.id ? 'Editar usuário' : 'Novo usuário'}</h2>

            <label htmlFor="usuario-nome">Nome</label>
            <input
              id="usuario-nome"
              type="text"
              maxLength={150}
              value={dados.nome}
              onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              required
            />

            <label htmlFor="usuario-email">E-mail</label>
            <input
              id="usuario-email"
              type="email"
              maxLength={150}
              value={dados.email}
              onChange={(e) => setDados({ ...dados, email: e.target.value })}
              required
            />

            {!formulario.id && (
              <>
                <label htmlFor="usuario-senha">Senha inicial (mínimo {SENHA_MINIMA} caracteres)</label>
                <input
                  id="usuario-senha"
                  type="password"
                  minLength={SENHA_MINIMA}
                  maxLength={128}
                  autoComplete="new-password"
                  value={dados.senha}
                  onChange={(e) => setDados({ ...dados, senha: e.target.value })}
                  required
                />
              </>
            )}

            <label htmlFor="usuario-nivel">Nível de acesso</label>
            <select
              id="usuario-nivel"
              value={dados.nivel_acesso}
              onChange={(e) => setDados({ ...dados, nivel_acesso: e.target.value })}
              disabled={editandoAMimMesmo}
            >
              {NIVEIS_ACESSO.map((n) => (
                <option key={n.valor} value={n.valor}>
                  {n.rotulo}
                </option>
              ))}
            </select>

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
            <span>Nome</span>
            <span>E-mail</span>
            <span>Nível</span>
            <span>Status</span>
            <span>Desde</span>
            <span>Ações</span>
          </div>

          {usuariosFiltrados.map((u) => (
            <div className="tela-tabela-linha" style={COLUNAS} key={u.id_usuario}>
              <span>
                {u.nome}
                {u.id_usuario === meuId && ' (você)'}
              </span>
              <span>{u.email}</span>
              <span>
                <span className={`selo ${u.nivel_acesso === 'administrador' ? 'azul' : ''}`}>
                  {rotulo(NIVEIS_ACESSO, u.nivel_acesso)}
                </span>
              </span>
              <span>
                <span className={`selo ${u.status === 'ativo' ? 'verde' : 'cinza'}`}>
                  {rotulo(STATUS_USUARIO, u.status)}
                </span>
              </span>
              <span>{formatarData(u.criado_em)}</span>
              <span className="acoes">
                <button onClick={() => abrirEdicao(u)}>Editar</button>
                {u.id_usuario !== meuId && (
                  <>
                    <span>·</span>
                    <button onClick={() => alternarStatus(u)}>
                      {u.status === 'ativo' ? 'Inativar' : 'Ativar'}
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}

          {carregando && <p className="tela-vazio">Carregando...</p>}

          {!carregando && usuariosFiltrados.length === 0 && (
            <p className="tela-vazio">Nenhum usuário encontrado.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Usuarios;
