DO $$
DECLARE
    modelo RECORD;
    modelo_id INT;
BEGIN
    LOCK TABLE modelo_lancamento, tarefa_padrao IN SHARE ROW EXCLUSIVE MODE;

    FOR modelo IN
        SELECT nome, divisao, titulos
        FROM (VALUES
            (1, 'PRODUTO', 'produto', ARRAY[
                'Definir avatar e público-alvo',
                'Definir a promessa principal do lançamento',
                'Estruturar a oferta (preço, bônus, garantia e formas de pagamento)',
                'Montar o cronograma do lançamento',
                'Criar o produto e o checkout na plataforma de vendas',
                'Configurar a área de membros',
                'Criar a página de captura',
                'Criar a página de obrigado',
                'Criar a página de vendas',
                'Testar o fluxo completo de compra',
                'Liberar acesso e fazer o onboarding dos alunos',
                'Reunião de fechamento com o cliente'
            ]),
            (2, 'CONTEÚDO', 'conteudo', ARRAY[
                'Definir a linha editorial do pré-lançamento',
                'Roteirizar os conteúdos de aquecimento',
                'Gravar os conteúdos de aquecimento',
                'Editar e publicar os conteúdos de aquecimento',
                'Roteirizar as aulas do evento',
                'Roteirizar o pitch de vendas',
                'Gravar as aulas',
                'Editar as aulas',
                'Criar materiais de apoio das aulas',
                'Produzir stories de abertura de carrinho',
                'Produzir conteúdos de prova social e quebra de objeções',
                'Produzir conteúdos de último dia'
            ]),
            (3, 'TRÁFEGO', 'trafego', ARRAY[
                'Definir orçamento e distribuição por fase',
                'Instalar pixel, API de conversões e GTM nas páginas',
                'Configurar UTMs e eventos de conversão',
                'Criar os públicos (frio, semelhantes e remarketing)',
                'Fazer o briefing dos criativos de captação',
                'Produzir os criativos de captação',
                'Subir as campanhas de captação',
                'Acompanhar o CPL diário e otimizar as campanhas',
                'Subir a campanha de lembrete das aulas',
                'Produzir os criativos de remarketing de vendas',
                'Subir as campanhas de vendas',
                'Fazer o relatório final de tráfego'
            ]),
            (4, 'DISPAROS', 'disparos', ARRAY[
                'Configurar a ferramenta de disparos e integrar os leads',
                'Criar os grupos de WhatsApp do lançamento',
                'Escrever a mensagem de boas-vindas',
                'Escrever a sequência de aquecimento',
                'Escrever os lembretes das aulas (24h, 1h e "estamos ao vivo")',
                'Escrever o disparo de abertura do carrinho',
                'Escrever a sequência de carrinho aberto',
                'Configurar a recuperação de checkout, boleto e Pix',
                'Escrever os disparos de último dia',
                'Enviar o aviso de encerramento e o convite para a lista de espera',
                'Fazer o relatório dos disparos'
            ])
        ) AS dados(ordem, nome, divisao, titulos)
        ORDER BY ordem
    LOOP
        SELECT id_modelo_lancamento INTO modelo_id
        FROM modelo_lancamento
        WHERE status = 'ativo' AND lower(nome) = lower(modelo.nome)
        ORDER BY id_modelo_lancamento
        LIMIT 1;

        IF modelo_id IS NULL THEN
            INSERT INTO modelo_lancamento (nome)
            VALUES (modelo.nome)
            RETURNING id_modelo_lancamento INTO modelo_id;
        END IF;

        INSERT INTO tarefa_padrao (modelo_lancamento_id, titulo, divisao)
        SELECT modelo_id, item.titulo, modelo.divisao
        FROM unnest(modelo.titulos) WITH ORDINALITY AS item(titulo, ordem)
        WHERE NOT EXISTS (
            SELECT 1
            FROM tarefa_padrao AS existente
            WHERE existente.modelo_lancamento_id = modelo_id
              AND existente.titulo = item.titulo
              AND existente.divisao = modelo.divisao
        )
        ORDER BY item.ordem;
    END LOOP;
END;
$$;
