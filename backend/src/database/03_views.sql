-- ============================================================
-- SISTEMA DE GESTÃO DE TAREFAS — FORGE GROWTH
-- Script Completo para PostgreSQL - Parte 3: Views
-- ============================================================

-- ============================================================
-- 6. VIEWS
-- ============================================================

-- Clientes ativos (listagem e combo de criação de projeto)
CREATE VIEW vw_clientes_ativos AS
SELECT id_cliente, nome, contato, criado_em
FROM cliente
WHERE status = 'ativa'
ORDER BY nome;


-- Colaboradores/usuários ativos (combo de atribuição de tarefas)
CREATE VIEW vw_usuarios_ativos AS
SELECT id_usuario, nome, email, nivel_acesso
FROM usuario
WHERE status = 'ativo'
ORDER BY nome;


-- Modelos de lançamento com suas tarefas padrão
CREATE VIEW vw_modelos_com_tarefas_padrao AS
SELECT
    ml.id_modelo_lancamento,
    ml.nome        AS modelo_nome,
    ml.status      AS modelo_status,
    tp.id_tarefa_padrao,
    tp.titulo      AS tarefa_titulo,
    tp.divisao
FROM modelo_lancamento ml
LEFT JOIN tarefa_padrao tp ON tp.modelo_lancamento_id = ml.id_modelo_lancamento
ORDER BY ml.nome, tp.divisao;


-- Kanban completo do projeto (app filtra por projeto_id/divisao/responsavel_id)
CREATE VIEW vw_kanban_projeto AS
SELECT
    t.id_tarefa,
    t.projeto_id,
    p.nome            AS projeto_nome,
    p.status          AS projeto_status,
    t.titulo,
    t.descricao,
    t.divisao,
    t.kanban_status,
    t.vencimento,
    COALESCE(t.vencimento < CURRENT_DATE AND t.kanban_status <> 'concluido', FALSE) AS atrasada,
    t.responsavel_id,
    ur.nome           AS responsavel_nome,
    t.criador_id,
    uc.nome           AS criador_nome,
    t.criado_em,
    t.atualizado_em
FROM tarefa t
JOIN projeto p        ON p.id_projeto = t.projeto_id
LEFT JOIN usuario ur  ON ur.id_usuario = t.responsavel_id
JOIN usuario uc       ON uc.id_usuario = t.criador_id;


-- Tarefas com prazo vencido, para destaque visual
CREATE VIEW vw_tarefas_atrasadas AS
SELECT
    t.id_tarefa,
    t.projeto_id,
    p.nome        AS projeto_nome,
    t.titulo,
    t.divisao,
    t.kanban_status,
    t.vencimento,
    (CURRENT_DATE - t.vencimento) AS dias_atraso,
    t.responsavel_id,
    u.nome        AS responsavel_nome
FROM tarefa t
JOIN projeto p       ON p.id_projeto = t.projeto_id
LEFT JOIN usuario u ON u.id_usuario = t.responsavel_id
WHERE t.vencimento < CURRENT_DATE
  AND t.kanban_status <> 'concluido';


-- Progresso de tarefas por projeto (apoia a checagem de conclusão)
CREATE VIEW vw_progresso_projeto AS
SELECT
    p.id_projeto,
    p.nome AS projeto_nome,
    p.status AS status_projeto,
    COUNT(t.id_tarefa) AS total_tarefas,
    COUNT(t.id_tarefa) FILTER (WHERE t.kanban_status = 'concluido') AS tarefas_concluidas,
    COUNT(t.id_tarefa) FILTER (WHERE t.kanban_status <> 'concluido') AS tarefas_pendentes,
    ROUND(
        100.0 * COUNT(t.id_tarefa) FILTER (WHERE t.kanban_status = 'concluido')
        / NULLIF(COUNT(t.id_tarefa), 0), 1
    ) AS percentual_concluido
FROM projeto p
LEFT JOIN tarefa t ON t.projeto_id = p.id_projeto
GROUP BY p.id_projeto, p.nome, p.status;


