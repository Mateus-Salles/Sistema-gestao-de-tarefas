import clientService from '../services/client.service.js';

async function list(req, res, next) {
  try {
    const { status, pagina, tamanho_pagina } = req.valid.query;

    const result = await clientService.list({ status, page: pagina, pageSize: tamanho_pagina });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const client = await clientService.getById(req.valid.params.id);

    res.status(200).json(client);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { nome, contato } = req.body;

    const client = await clientService.create(req.user.id, { nome, contato });

    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { nome, contato } = req.body;

    const client = await clientService.update(req.valid.params.id, { nome, contato });

    res.status(200).json(client);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const client = await clientService.updateStatus(req.valid.params.id, req.body.status);

    res.status(200).json(client);
  } catch (err) {
    next(err);
  }
}

export default { list, getById, create, update, updateStatus };
