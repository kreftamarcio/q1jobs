# Plano de Implementação: Recrutador Hardening

> Cada tarefa é incremental e testável. As referências apontam para os requisitos em `requirements.md`. Nenhuma tarefa envolve deploy ou teste manual de usuário — apenas escrita/edição de código e execução de testes.

- [ ] 1. Estabelecer o harness de testes e extrair helpers puros
- [ ] 1.1 Adicionar runner de testes e script `test`
  - Adicionar `supertest` como devDependency e o script `"test": "node --test"` em `package.json`.
  - Criar a pasta `test/` e um teste sentinela mínimo para validar o runner.
  - _Requisitos: 8.1_

- [ ] 1.2 Extrair `sanitizeSearch` e `clampPagination` para helper puro
  - Criar `src/api/utils/query.js` exportando `sanitizeSearch(q)` (remove `, ( ) * \ "`, aplica `trim`) e `clampPagination(page, limit)` (page ≥ 1; 1 ≤ limit ≤ 100), replicando exatamente a lógica atual.
  - Substituir o código inline em `src/api/routes/jobs.js` e a normalização de paginação em `jobs.js`/`companies.js` pelas chamadas aos helpers, sem alterar o comportamento observável.
  - _Requisitos: 8.2_

- [ ] 1.3 (PBT) Testes unitários/propriedade dos helpers puros
  - Testar `sanitizeSearch`: saída nunca contém `, ( ) * \ "`; idempotência (`f(f(x)) === f(x)`); entrada não-string não quebra.
  - Testar `clampPagination`: para qualquer entrada (0, negativos, `NaN`, strings, valores enormes), `page ≥ 1` e `1 ≤ limit ≤ 100`.
  - Usar `fast-check` se aprovado; caso contrário, tabelas de exemplos representativos no `node:test`.
  - _Requisitos: 8.3, 8.7_

- [ ] 2. Endurecer a segurança no servidor Express
- [ ] 2.1 Implementar allowlist de CORS dirigida por env
  - Em `src/server.js`, substituir `cors()` por `cors({ origin: fn })` que lê `ALLOWED_ORIGINS` (CSV); permitir origem ausente (same-origin/curl); permitir `http://localhost:PORT` quando a lista estiver vazia em desenvolvimento; rejeitar as demais.
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2.2 Retornar 404 JSON para rotas `/api/*` desconhecidas
  - Em `src/server.js`, registrar `app.use('/api', (req, res) => res.status(404).json({ error: ... }))` **após** as rotas de API e **antes** do `app.get('*')`.
  - Garantir que o SPA fallback continue servindo `index.html` para rotas não-API.
  - _Requisitos: 4.1, 4.2, 4.3, 4.4_

- [ ] 2.3 Auto-hospedar DOMPurify e reabilitar a CSP
  - Adicionar `public/js/vendor/purify.min.js` (versão fixada) e atualizar `public/index.html` para referenciar o arquivo local em vez do CDN.
  - Em `src/server.js`, trocar `helmet({ contentSecurityPolicy: false })` por uma CSP explícita (`default-src 'self'`; `script-src 'self' 'unsafe-inline'`; `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'`; `font-src 'self' https://fonts.gstatic.com`; `img-src 'self' data:`; `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`).
  - Confirmar o fallback `sanitizeHtml` → `escapeHtml` em `app.js`.
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2.4 Testes de integração de segurança (supertest, modo offline)
  - Verificar: requisição com `Origin` fora da allowlist não recebe header CORS de autorização; `GET /api/rota-inexistente` → 404 JSON; rota não-API → 200 `text/html`; respostas incluem cabeçalho `Content-Security-Policy`.
  - _Requisitos: 3.2, 4.1, 4.3, 5.2_

- [ ] 3. Corrigir consistência de moeda e da chave de fonte
- [ ] 3.1 Centralizar a moeda padrão configurável
  - Introduzir leitura de `DEFAULT_SALARY_CURRENCY` (padrão `USD`) e aplicá-la em `src/fetchJobs.js` (upsert) e no fallback offline de `src/api/routes/jobs.js` (remover o `'USD'` hardcoded).
  - Ajustar `public/js/app.js` `formatSalary()` para não exibir moeda quando não há `salary_min`/`salary_max`.
  - Alinhar o `DEFAULT` de `salary_currency` em `src/database/schema.sql` à mesma escolha.
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.2 Canonizar a chave de fonte do The Muse para `muse`
  - Alterar `src/preview-jobs.js` para emitir `source: 'muse'`.
  - Normalizar o `public/data/vagas-preview.json` existente, substituindo `"themuse"` por `"muse"` (ou regerar o arquivo).
  - _Requisitos: 7.1, 7.2, 7.3, 7.5_

- [ ] 3.3 Testes de consistência (modo offline)
  - Verificar que filtrar por `source=muse` no modo offline retorna vagas do The Muse; verificar que vaga sem salário não expõe moeda na resposta.
  - _Requisitos: 6.4, 7.4_

- [ ] 4. Corrigir a camada de empresas
- [ ] 4.1 Popular `companies` e vincular `company_id` na importação
  - Criar helper `slugify(name)` (minúsculas, sem acento, espaços/símbolos → hífen, idempotente).
  - Em `src/fetchJobs.js`, adicionar `upsertCompanies()` que faz upsert das empresas distintas do lote por `slug` (`onConflict: 'slug'`) e resolve `{ name → company_id }`; preencher `company_id` no lote de vagas antes do upsert; vagas sem `company_name` mantêm `company_id` nulo.
  - _Requisitos: 2.1, 2.2, 2.3, 2.7, 2.8_

- [ ] 4.2 Criar agregação no banco e remover o teto de 5000 linhas
  - Adicionar ao `src/database/schema.sql` a view/RPC `companies_with_counts` (`LEFT JOIN jobs` com `COUNT(... ) FILTER (WHERE is_active)` agrupado por empresa).
  - Atualizar `GET /api/companies` em `src/api/routes/companies.js` para consumir a view/RPC com busca (`ilike`) e paginação no banco, eliminando o `.limit(5000)`.
  - _Requisitos: 2.6_

- [ ] 4.3 Garantir corretude de `GET /api/companies/:id`
  - Confirmar que, com `companies` populada e `company_id` vinculado, a rota retorna 200 com a empresa e suas vagas ativas; 404 JSON apenas quando o id realmente não existir.
  - Preservar o comportamento de agregação offline a partir do JSON local.
  - _Requisitos: 2.4, 2.5, 2.9_

- [ ] 4.4 Testes da camada de empresas (modo offline)
  - Verificar a agregação por empresa: contagem correta, ordenação decrescente por `active_jobs` e paginação coerente (`total`, `totalPages`); verificar 404 JSON de `/api/companies/:id` no modo offline.
  - _Requisitos: 8.6, 2.5_

- [ ] 5. Remover o legado AWS RDS / PostgreSQL
- [ ] 5.1 Excluir arquivos e infraestrutura legados
  - Remover `src/database/db.js`, `src/database/setup.js` e `aws/cloudformation-rds.yaml`; manter `src/database/schema.sql`.
  - _Requisitos: 1.1, 1.6_

- [ ] 5.2 Limpar dependências e scripts
  - Remover a dependência `pg` e o script `setup-db` de `package.json`; garantir que o servidor inicia e os testes passam sem `pg`.
  - _Requisitos: 1.2, 1.5_

- [ ] 5.3 Ajustar o texto do rodapé do frontend
  - Em `public/index.html`, ajustar o rodapé para apresentar a stack de dados como Supabase, sem menção a AWS.
  - _Requisitos: 1.7_

- [ ] 6. Atualizar configuração e documentação
- [ ] 6.1 Atualizar `.env.example`
  - Remover a seção `DB_*` (AWS RDS); adicionar `ALLOWED_ORIGINS` e `DEFAULT_SALARY_CURRENCY` com comentários.
  - _Requisitos: 1.4, 9.1, 9.2_

- [ ] 6.2 Atualizar `README.md`
  - Reescrever o fluxo de banco para Supabase (executar `schema.sql` no SQL Editor); remover `setup-db`, CloudFormation e AWS RDS; alinhar a lista de scripts ao `package.json`.
  - _Requisitos: 1.3, 1.4, 9.3, 9.4_

- [ ] 7. Validação final da suíte
  - Executar `npm test` e corrigir eventuais falhas; confirmar que todos os testes (helpers, segurança, consistência, empresas) passam de forma determinística no modo offline.
  - _Requisitos: 8.1, 8.3, 8.4, 8.5, 8.6_
