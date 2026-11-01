-- ============================================================
-- SISTEMA DE GESTÃO DE TAREFAS — FORGE GROWTH
-- Script Completo para PostgreSQL - Parte 2: Functions e Triggers
-- ============================================================

-- ============================================================
-- 4. FUNÇÃO AUXILIAR DE AUTORIZAÇÃO
-- ============================================================
-- As triggers de autorização abaixo dependem de a aplicação
-- definir, no início de cada transação, quem está fazendo a
-- operação:
--   SET LOCAL app.current_user_id = '7';
-- ============================================================

CREATE OR REPLACE FUNCTION fn_usuario_logado_id()
RETURNS INT AS $$
BEGIN
    RETURN current_setting('app.current_user_id')::INT;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'app.current_user_id não foi definido nesta sessão/transação (use SET LOCAL)';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_verifica_usuario_admin()
RETURNS VOID AS $$
DECLARE
    v_nivel VARCHAR;
BEGIN
    SELECT nivel_acesso INTO v_nivel
    FROM usuario
    WHERE id_usuario = fn_usuario_logado_id();

    IF v_nivel IS DISTINCT FROM 'administrador' THEN
        RAISE EXCEPTION 'Apenas administradores podem realizar esta operação';
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 5. TRIGGERS E FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION fn_restringe_cliente_admin()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_verifica_usuario_admin();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restringe_cliente_admin
BEFORE INSERT ON cliente
FOR EACH ROW
EXECUTE FUNCTION fn_restringe_cliente_admin();


CREATE OR REPLACE FUNCTION fn_restringe_projeto_admin()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_verifica_usuario_admin();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restringe_projeto_admin
BEFORE INSERT ON projeto
FOR EACH ROW
EXECUTE FUNCTION fn_restringe_projeto_admin();


CREATE OR REPLACE FUNCTION fn_valida_cliente_ativo_projeto()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT status FROM cliente WHERE id_cliente = NEW.cliente_id) <> 'ativa' THEN
        RAISE EXCEPTION 'Não é possível criar um projeto para um cliente inativo (id_cliente = %)', NEW.cliente_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_cliente_ativo_projeto
BEFORE INSERT ON projeto
FOR EACH ROW
EXECUTE FUNCTION fn_valida_cliente_ativo_projeto();


CREATE OR REPLACE FUNCTION fn_gerar_tarefas_padrao()
RETURNS TRIGGER AS $$
DECLARE
    v_criador_id INT := fn_usuario_logado_id();
BEGIN
    INSERT INTO tarefa (projeto_id, responsavel_id, criador_id, titulo, descricao, divisao, kanban_status, criado_em, atualizado_em)
    SELECT
        NEW.id_projeto,
        NULL,
        v_criador_id,
        tp.titulo,
        NULL,
        tp.divisao,
        'a_fazer',
        NOW(),
        NOW()
    FROM tarefa_padrao tp
    WHERE tp.modelo_lancamento_id = NEW.modelo_lancamento_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gerar_tarefas_padrao
AFTER INSERT ON projeto
FOR EACH ROW
EXECUTE FUNCTION fn_gerar_tarefas_padrao();


CREATE OR REPLACE FUNCTION fn_valida_responsavel_nivel()
RETURNS TRIGGER AS $$
DECLARE
    v_nivel_responsavel VARCHAR;
BEGIN
    IF NEW.responsavel_id IS NOT NULL THEN
        SELECT nivel_acesso INTO v_nivel_responsavel
        FROM usuario
        WHERE id_usuario = NEW.responsavel_id;

        IF v_nivel_responsavel <> 'colaborador' THEN
            RAISE EXCEPTION 'Uma tarefa só pode ter como responsável um usuário de nível colaborador';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_responsavel_nivel
BEFORE INSERT OR UPDATE OF responsavel_id ON tarefa
FOR EACH ROW
EXECUTE FUNCTION fn_valida_responsavel_nivel();


CREATE OR REPLACE FUNCTION fn_valida_movimentacao_kanban()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INT := fn_usuario_logado_id();
    v_nivel VARCHAR;
BEGIN
    IF v_user_id IS DISTINCT FROM NEW.responsavel_id THEN
        SELECT nivel_acesso INTO v_nivel FROM usuario WHERE id_usuario = v_user_id;
        IF v_nivel IS DISTINCT FROM 'administrador' THEN
            RAISE EXCEPTION 'Somente o responsável pela tarefa ou um administrador pode movê-la no Kanban';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_movimentacao_kanban
BEFORE UPDATE OF kanban_status ON tarefa
FOR EACH ROW
EXECUTE FUNCTION fn_valida_movimentacao_kanban();


CREATE OR REPLACE FUNCTION fn_atualiza_timestamp_tarefa()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualiza_timestamp_tarefa
BEFORE UPDATE ON tarefa
FOR EACH ROW
EXECUTE FUNCTION fn_atualiza_timestamp_tarefa();


CREATE OR REPLACE FUNCTION fn_restringe_exclusao_tarefa_admin()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_verifica_usuario_admin();
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restringe_exclusao_tarefa_admin
BEFORE DELETE ON tarefa
FOR EACH ROW
EXECUTE FUNCTION fn_restringe_exclusao_tarefa_admin();


CREATE OR REPLACE FUNCTION fn_valida_conclusao_projeto()
RETURNS TRIGGER AS $$
DECLARE
    v_pendentes INT;
BEGIN
    IF NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido' THEN
        SELECT COUNT(*) INTO v_pendentes
        FROM tarefa
        WHERE projeto_id = NEW.id_projeto
          AND kanban_status <> 'concluido';

        IF v_pendentes > 0 THEN
            RAISE EXCEPTION 'O projeto só pode ser concluído quando todas as tarefas estiverem na coluna Concluído (% pendente(s))', v_pendentes;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_conclusao_projeto
BEFORE UPDATE OF status ON projeto
FOR EACH ROW
EXECUTE FUNCTION fn_valida_conclusao_projeto();

-- ============================================================
-- 7. FUNÇÃO DE TABELA: KANBAN INDIVIDUAL
-- ============================================================

CREATE OR REPLACE FUNCTION fn_kanban_individual(p_usuario_id INT)
RETURNS TABLE (
    id_tarefa INT,
    projeto_id INT,
    projeto_nome VARCHAR,
    titulo VARCHAR,
    descricao TEXT,
    divisao VARCHAR,
    kanban_status VARCHAR,
    vencimento DATE,
    atrasada BOOLEAN,
    criado_em TIMESTAMP,
    atualizado_em TIMESTAMP
) AS $$
    SELECT
        t.id_tarefa,
        t.projeto_id,
        p.nome,
        t.titulo,
        t.descricao,
        t.divisao,
        t.kanban_status,
        t.vencimento,
        COALESCE(t.vencimento < CURRENT_DATE AND t.kanban_status <> 'concluido', FALSE),
        t.criado_em,
        t.atualizado_em
    FROM tarefa t
    LEFT JOIN projeto p ON p.id_projeto = t.projeto_id
    WHERE t.responsavel_id = p_usuario_id
       OR t.criador_id = p_usuario_id
    ORDER BY t.kanban_status, t.vencimento NULLS LAST;
$$ LANGUAGE sql STABLE;
