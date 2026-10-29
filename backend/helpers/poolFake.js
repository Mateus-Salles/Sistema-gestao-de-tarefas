import { mock } from 'node:test';

/**
 * Cria um "Pool" falso do pg, para testar a classe Database sem banco de verdade.
 *
 * Retorna:
 *  - PoolFake: classe para injetar no construtor de Database
 *  - pool:     o objeto devolvido por `new PoolFake(...)` (métodos espionáveis)
 *  - client:   o client devolvido por pool.connect()
 *  - estado:   quantas vezes o Pool foi criado e com qual config
 */
export function criarPoolFake({ queryImpl } = {}) {
  const resultadoVazio = async () => ({ rows: [], rowCount: 0 });

  const client = {
    query: mock.fn(resultadoVazio),
    release: mock.fn(),
  };

  const pool = {
    query: mock.fn(queryImpl ?? resultadoVazio),
    connect: mock.fn(async () => client),
    end: mock.fn(async () => {}),
    on: mock.fn(),
  };

  const estado = { criacoes: 0, configRecebida: null };

  class PoolFake {
    constructor(config) {
      estado.criacoes += 1;
      estado.configRecebida = config;
      return pool;
    }
  }

  return { PoolFake, pool, client, estado };
}
