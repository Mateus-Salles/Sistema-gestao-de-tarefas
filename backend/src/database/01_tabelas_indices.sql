-- ============================================================
-- SISTEMA DE GESTÃO DE TAREFAS — FORGE GROWTH
-- Script Completo para PostgreSQL - Parte 1: Tabelas e Índices
-- ============================================================

-- ============================================================
-- 1. TABELAS
-- ============================================================

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    contato VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ativa',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE modelo_lancamento (
    id_modelo_lancamento SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE projeto (
    id_projeto SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL,
    modelo_lancamento_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    data_comeco DATE NOT NULL,
    data_final DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'andamento',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tarefa_padrao (
    id_tarefa_padrao SERIAL PRIMARY KEY,
    modelo_lancamento_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    divisao VARCHAR(50) NOT NULL
);

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nivel_acesso VARCHAR(20) NOT NULL DEFAULT 'colaborador',
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (email)
);

CREATE TABLE tarefa (
    id_tarefa SERIAL PRIMARY KEY,
    projeto_id INT,
    responsavel_id INT,
    criador_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    divisao VARCHAR(50) NOT NULL,
    kanban_status VARCHAR(30) NOT NULL DEFAULT 'a_fazer',
    vencimento DATE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Chaves estrangeiras
ALTER TABLE projeto
    ADD CONSTRAINT fk_projeto_cliente FOREIGN KEY (cliente_id)
    REFERENCES cliente (id_cliente);

ALTER TABLE projeto
    ADD CONSTRAINT fk_projeto_modelo FOREIGN KEY (modelo_lancamento_id)
    REFERENCES modelo_lancamento (id_modelo_lancamento);

ALTER TABLE tarefa_padrao
    ADD CONSTRAINT fk_tarefapadrao_modelo FOREIGN KEY (modelo_lancamento_id)
    REFERENCES modelo_lancamento (id_modelo_lancamento);

ALTER TABLE tarefa
    ADD CONSTRAINT fk_tarefa_projeto FOREIGN KEY (projeto_id)
    REFERENCES projeto (id_projeto);

ALTER TABLE tarefa
    ADD CONSTRAINT fk_tarefa_responsavel FOREIGN KEY (responsavel_id)
    REFERENCES usuario (id_usuario);

ALTER TABLE tarefa
    ADD CONSTRAINT fk_tarefa_criador FOREIGN KEY (criador_id)
    REFERENCES usuario (id_usuario);


-- ============================================================
-- 2. CONSTRAINTS (CHECK)
-- ============================================================

ALTER TABLE usuario
    ADD CONSTRAINT chk_usuario_nivel_acesso
    CHECK (nivel_acesso IN ('administrador', 'colaborador'));

ALTER TABLE usuario
    ADD CONSTRAINT chk_usuario_status
    CHECK (status IN ('ativo', 'inativo'));

ALTER TABLE usuario
    ADD CONSTRAINT chk_usuario_senha_hash
    CHECK (length(senha_hash) > 0);

ALTER TABLE usuario
    ADD CONSTRAINT chk_usuario_email_formato
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE cliente
    ADD CONSTRAINT chk_cliente_status
    CHECK (status IN ('ativa', 'inativa'));

ALTER TABLE modelo_lancamento
    ADD CONSTRAINT chk_modelo_status
    CHECK (status IN ('ativo', 'inativo'));

ALTER TABLE projeto
    ADD CONSTRAINT chk_projeto_status
    CHECK (status IN ('andamento', 'concluido', 'cancelado'));

ALTER TABLE projeto
    ADD CONSTRAINT chk_projeto_datas
    CHECK (data_final >= data_comeco);

ALTER TABLE tarefa
    ADD CONSTRAINT chk_tarefa_divisao
    CHECK (divisao IN ('produto', 'conteudo', 'trafego', 'disparos'));

ALTER TABLE tarefa_padrao
    ADD CONSTRAINT chk_tarefapadrao_divisao
    CHECK (divisao IN ('produto', 'conteudo', 'trafego', 'disparos'));

ALTER TABLE tarefa
    ADD CONSTRAINT chk_tarefa_kanban_status
    CHECK (kanban_status IN ('a_fazer', 'em_andamento', 'em_revisao', 'concluido'));


-- ============================================================
-- 3. ÍNDICES
-- ============================================================

-- Índices de FK (o Postgres não cria automaticamente)
CREATE INDEX idx_projeto_cliente_id ON projeto (cliente_id);
CREATE INDEX idx_projeto_modelo_lancamento_id ON projeto (modelo_lancamento_id);
CREATE INDEX idx_tarefapadrao_modelo_lancamento_id ON tarefa_padrao (modelo_lancamento_id);
CREATE INDEX idx_tarefa_projeto_id ON tarefa (projeto_id);
CREATE INDEX idx_tarefa_responsavel_id ON tarefa (responsavel_id);
CREATE INDEX idx_tarefa_criador_id ON tarefa (criador_id);

CREATE INDEX idx_cliente_status ON cliente (status);

CREATE INDEX idx_tarefa_projeto_divisao ON tarefa (projeto_id, divisao);
CREATE INDEX idx_tarefa_projeto_responsavel ON tarefa (projeto_id, responsavel_id);

CREATE INDEX idx_tarefa_responsavel_kanban ON tarefa (responsavel_id, kanban_status);
CREATE INDEX idx_tarefa_criador_kanban ON tarefa (criador_id, kanban_status);

CREATE INDEX idx_tarefa_vencimento ON tarefa (vencimento) WHERE kanban_status <> 'concluido';

CREATE INDEX idx_usuario_status ON usuario (status);

CREATE INDEX idx_projeto_status ON projeto (status);
