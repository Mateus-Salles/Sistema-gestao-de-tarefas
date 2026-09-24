# Sistema de Gestão de Tarefas — Forge Growth

Projeto Integrador: Sistema Web — Engenharia de Software  
Centro Universitário SATC — Prof. Hyan Dias Tavares — 2026

## Descrição

Aplicação web para a agência de marketing Forge Growth, que trabalha com lançamentos digitais.

O sistema é um gestor de tarefas inspirado no ClickUp, em versão simplificada. Ele organiza a
execução dos lançamentos em um quadro Kanban, com responsável e prazo em cada tarefa, e trabalha
com três entidades principais: cliente, projeto e tarefa.

Cada projeto é criado a partir de um modelo de lançamento, que já traz as tarefas padrão divididas
em quatro divisões fixas: Produto, Conteúdo, Tráfego e Disparos.

## Níveis de acesso

| Nível | O que pode fazer |
|---|---|
| Administrador | Cadastra clientes, cria projetos, atribui tarefas e enxerga todo o sistema |
| Colaborador | Vê apenas as tarefas atribuídas a ele e as que ele mesmo criou |

## Equipe

| Integrante | Função |
|---|---|
| Mateus Salles Melo | Back-end e Banco de Dados |
| Gabriel Dalmolin | Front-end |
| Yuri Ribeiro Nesi | UI/UX Design |
| Henrique Lucio Coral | Scrum Master e gestão do Kanban |

## Tecnologias

- **Front-end:** React, Vite, React-Bootstrap
- **Back-end:** Node.js, Express
- **Banco de dados:** PostgreSQL
- **Autenticação:** token JWT

## Estrutura do repositório

- `/frontend` — aplicação React
- `/backend` — API REST em Node.js

## Gestão do projeto

Quadro Kanban da equipe: https://trello.com/b/7yreWVfz

## Status

Em desenvolvimento — banco de dados criado, contrato da API definido e protótipo das telas
concluído. Próxima fase: implementação do front-end e do back-end.
