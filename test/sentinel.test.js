const { test } = require('node:test');
const assert = require('node:assert');

// Teste sentinela: valida apenas que o runner nativo `node --test` esta
// configurado e executando corretamente. Nao exercita codigo de producao.
test('sentinela: o runner de testes esta operacional', () => {
  assert.strictEqual(1 + 1, 2);
});
