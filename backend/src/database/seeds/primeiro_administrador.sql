WITH administrador_criado AS (
    INSERT INTO usuario (nome, email, senha_hash, nivel_acesso, status)
    SELECT 'admin', 'admin@email.com', $1, 'administrador', 'ativo'
    WHERE NOT EXISTS (
        SELECT 1 FROM usuario WHERE nivel_acesso = 'administrador'
    )
    RETURNING id_usuario
)
INSERT INTO usuario_perfil_inicial (usuario_id)
SELECT id_usuario FROM administrador_criado;
