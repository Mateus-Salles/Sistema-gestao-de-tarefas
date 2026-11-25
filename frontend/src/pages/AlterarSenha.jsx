import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alterarSenha, mensagemDeErro } from '../services/api';
import { limparSessao } from '../services/sessao';
import Layout from '../components/Layout';
import '../components/Tela.css';

const SENHA_MINIMA = 8;

function AlterarSenha() {
  const navigate = useNavigate();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');

    if (senhaNova !== confirmacao) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }
    if (senhaNova === senhaAtual) {
      setErro('A nova senha deve ser diferente da atual.');
      return;
    }

    setSalvando(true);

    try {
      await alterarSenha(senhaAtual, senhaNova);

      // A API invalida o token atual quando a senha muda: é preciso entrar de novo.
      limparSessao();
      navigate('/', {
        replace: true,
        state: { aviso: 'Senha alterada. Entre novamente com a nova senha.' },
      });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível alterar a senha.'));
      setSalvando(false);
    }
  }

  return (
    <Layout titulo="Alterar senha" subtitulo="Troque a senha da sua conta.">
      <div className="tela-conteudo">
        {erro && (
          <p className="tela-erro" style={{ maxWidth: 520 }}>
            {erro}
          </p>
        )}

        <form className="tela-form" onSubmit={salvar}>
          <label htmlFor="senha-atual">Senha atual</label>
          <input
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            required
          />

          <label htmlFor="senha-nova">Nova senha (mínimo {SENHA_MINIMA} caracteres)</label>
          <input
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            minLength={SENHA_MINIMA}
            maxLength={128}
            value={senhaNova}
            onChange={(e) => setSenhaNova(e.target.value)}
            required
          />

          <label htmlFor="senha-confirmacao">Confirme a nova senha</label>
          <input
            id="senha-confirmacao"
            type="password"
            autoComplete="new-password"
            minLength={SENHA_MINIMA}
            maxLength={128}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            required
          />

          <p className="tela-carregando" style={{ marginBottom: 12 }}>
            Depois de alterar, você precisará entrar de novo com a nova senha.
          </p>

          <div className="tela-form-botoes">
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default AlterarSenha;
