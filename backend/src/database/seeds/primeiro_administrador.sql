\set ON_ERROR_STOP on
\prompt 'Nome do administrador: ' admin_nome
\prompt 'E-mail do administrador: ' admin_email
\prompt 'Hash scrypt do administrador: ' admin_hash

BEGIN;

LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO usuario (nome, email, senha_hash, nivel_acesso, status)
SELECT TRIM(:'admin_nome'), LOWER(TRIM(:'admin_email')), :'admin_hash', 'administrador', 'ativo'
WHERE NOT EXISTS (
    SELECT 1 FROM usuario WHERE nivel_acesso = 'administrador'
);

COMMIT;
