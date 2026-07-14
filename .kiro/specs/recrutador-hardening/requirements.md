# Documento de Requisitos: Recrutador Hardening

## Introdução

Esta spec endurece ("hardening") o agregador de vagas `Recrutador` (marca "Q1Jobs") após a migração de armazenamento de PostgreSQL (AWS RDS) para Supabase. Os requisitos abaixo são **derivados do design aprovado** (`design.md`) e cobrem cinco frentes: limpeza do legado AWS/Postgres, correção da camada de empresas, endurecimento de segurança (CORS, 404 de API, CSP/DOMPurify), correções de consistência (moeda padrão de salário e chave canônica da fonte "The Muse") e introdução de testes automatizados.

As decisões abertas foram confirmadas pelo usuário na revisão do design: **D1** remover o legado AWS/Postgres; **D2** moeda configurável via `DEFAULT_SALARY_CURRENCY` com padrão `USD`; **D3** auto-hospedar o DOMPurify e reabilitar a CSP; **D4** popular a tabela `companies` na importação *e* usar view/RPC de contagem.

Itens já concluídos no repositório (sanitização de filtro `safeQ`, guardas de paginação contra `NaN`, cliente Supabase apenas com `ANON_KEY`, placeholders no `.env.example`, `.gitignore`) são linha de base e **não fazem parte do escopo de mudança**; aparecem apenas como alvos de testes de regressão.

## Requisitos

### Requisito 1 — Remoção do Legado AWS RDS / PostgreSQL

**História de usuário:** Como mantenedor do projeto, quero remover os artefatos legados de AWS RDS/PostgreSQL, para que o repositório reflita a arquitetura Supabase atual e reduza confusão e superfície de manutenção.

#### Critérios de Aceitação

1. QUANDO o repositório for inspecionado, O SISTEMA DEVERÁ não conter os arquivos `src/database/db.js`, `src/database/setup.js` e `aws/cloudformation-rds.yaml`.
2. QUANDO `package.json` for inspecionado, O SISTEMA DEVERÁ não listar a dependência `pg` nem o script `setup-db`.
3. ONDE a provisão de schema for necessária, O SISTEMA DEVERÁ documentar a execução de `src/database/schema.sql` no SQL Editor do Supabase.
4. QUANDO `README.md` e `.env.example` forem lidos, O SISTEMA DEVERÁ não conter referências a AWS RDS, CloudFormation ou variáveis `DB_*`.
5. QUANDO o servidor for iniciado, O SISTEMA DEVERÁ operar sem qualquer dependência de `pg` (sem regressão de runtime).
6. O SISTEMA DEVERÁ manter `src/database/schema.sql` como o schema oficial do Supabase.
7. QUANDO o rodapé do frontend for exibido, O SISTEMA DEVERÁ apresentar a tecnologia de dados como Supabase, sem mencionar AWS.

### Requisito 2 — Correção da Camada de Empresas

**História de usuário:** Como usuário do frontend, quero ver a lista de empresas e os detalhes de cada empresa corretamente, para que a navegação por empresas funcione e as contagens de vagas sejam precisas.

#### Critérios de Aceitação

1. QUANDO o pipeline de importação (`fetchJobs`) processar vagas com `company_name`, O SISTEMA DEVERÁ fazer upsert das empresas distintas na tabela `companies` usando `slug` como chave de conflito.
2. QUANDO uma vaga tiver `company_name` correspondente a uma empresa em `companies`, O SISTEMA DEVERÁ preencher `jobs.company_id` com o id correspondente.
3. SE uma vaga não possuir `company_name`, ENTÃO O SISTEMA DEVERÁ manter `company_id` nulo e não criar registro em `companies`.
4. QUANDO `GET /api/companies/:id` for chamado com id existente (modo Supabase), O SISTEMA DEVERÁ retornar 200 com os dados da empresa e suas vagas ativas.
5. QUANDO `GET /api/companies/:id` for chamado com id inexistente, O SISTEMA DEVERÁ retornar 404 com corpo JSON.
6. QUANDO `GET /api/companies` for chamado (modo Supabase), O SISTEMA DEVERÁ retornar contagens de vagas ativas agregadas no banco (view/RPC), sem o teto de 5000 linhas.
7. O SISTEMA DEVERÁ derivar `slug` a partir do nome (minúsculas, sem acentos, espaços e símbolos convertidos em hífen) de forma idempotente.
8. QUANDO a importação for reexecutada, O SISTEMA DEVERÁ não duplicar empresas (upsert idempotente por `slug`).
9. ONDE o modo offline estiver ativo, O SISTEMA DEVERÁ continuar agregando empresas a partir do JSON local.

### Requisito 3 — Allowlist de CORS

**História de usuário:** Como responsável pela segurança, quero restringir as origens permitidas no CORS, para que apenas domínios autorizados consumam a API.

#### Critérios de Aceitação

1. O SISTEMA DEVERÁ ler a lista de origens permitidas da variável de ambiente `ALLOWED_ORIGINS` (lista separada por vírgulas).
2. QUANDO uma requisição chegar com `Origin` presente na allowlist, O SISTEMA DEVERÁ permitir o CORS para essa origem.
3. QUANDO uma requisição chegar com `Origin` ausente da allowlist, O SISTEMA DEVERÁ não emitir cabeçalhos de CORS que autorizem a origem.
4. SE a requisição não possuir cabeçalho `Origin` (same-origin, curl, health check), ENTÃO O SISTEMA DEVERÁ permitir a requisição.
5. ONDE `ALLOWED_ORIGINS` estiver vazio em ambiente de desenvolvimento, O SISTEMA DEVERÁ permitir `http://localhost:PORT` por padrão.

### Requisito 4 — 404 JSON para Rotas de API Desconhecidas

**História de usuário:** Como consumidor da API, quero receber 404 em JSON ao acessar rotas de API inexistentes, para tratar erros corretamente em vez de receber HTML do SPA.

#### Critérios de Aceitação

1. QUANDO uma requisição atingir um caminho sob `/api/` sem rota correspondente, O SISTEMA DEVERÁ retornar 404 com corpo JSON `{ error }`.
2. QUANDO um método HTTP não suportado for usado em uma rota `/api/` existente, O SISTEMA DEVERÁ retornar 404 em JSON, não HTML.
3. QUANDO uma rota de navegação não-API for requisitada, O SISTEMA DEVERÁ continuar retornando `index.html` (SPA fallback preservado).
4. O SISTEMA DEVERÁ registrar o manipulador 404 da API antes do fallback SPA `app.get('*')`.

### Requisito 5 — DOMPurify Auto-hospedado e CSP Reabilitada

**História de usuário:** Como responsável pela segurança, quero eliminar a dependência de CDN sem SRI e ter uma Content-Security-Policy ativa, para reduzir o risco de XSS e de comprometimento via terceiros.

#### Critérios de Aceitação

1. QUANDO o frontend for servido, O SISTEMA DEVERÁ carregar o DOMPurify a partir de arquivo local (`public/js/vendor/purify.min.js`), não de CDN.
2. QUANDO as respostas HTTP forem inspecionadas, O SISTEMA DEVERÁ incluir cabeçalhos de Content-Security-Policy (CSP reabilitada no helmet).
3. O SISTEMA DEVERÁ definir uma CSP que permita `'self'` para scripts e os domínios do Google Fonts para estilos e fontes (`fonts.googleapis.com`, `fonts.gstatic.com`).
4. QUANDO uma descrição de vaga com HTML for renderizada no modal, O SISTEMA DEVERÁ sanitizá-la com DOMPurify, com fallback para `escapeHtml` caso o DOMPurify esteja ausente.
5. O SISTEMA DEVERÁ definir a CSP de modo a não quebrar os handlers inline existentes (`script-src 'self' 'unsafe-inline'` como passo inicial), registrando a migração para `addEventListener` como melhoria futura.

### Requisito 6 — Moeda Padrão de Salário Configurável e Consistente

**História de usuário:** Como usuário, quero que a moeda exibida seja coerente e nunca inventada, para não ver valores monetários enganosos.

#### Critérios de Aceitação

1. O SISTEMA DEVERÁ ler a moeda padrão da variável de ambiente `DEFAULT_SALARY_CURRENCY`, com valor padrão `USD`.
2. QUANDO o pipeline de importação gravar uma vaga sem moeda informada, O SISTEMA DEVERÁ usar a moeda padrão configurada.
3. QUANDO o fallback offline mapear vagas, O SISTEMA DEVERÁ usar a mesma moeda padrão configurada, sem valor hardcoded divergente.
4. QUANDO uma vaga não possuir `salary_min` nem `salary_max`, O frontend NÃO DEVERÁ exibir nenhuma moeda, apresentando "Não informado".
5. O SISTEMA DEVERÁ alinhar o `DEFAULT` da coluna `salary_currency` no schema à mesma escolha configurada (ou gravar a moeda sempre de forma explícita na importação).

### Requisito 7 — Chave Canônica da Fonte "The Muse"

**História de usuário:** Como usuário, quero filtrar por "The Muse" e ver o badge correto em qualquer modo (online/offline), para ter uma experiência consistente.

#### Critérios de Aceitação

1. O SISTEMA DEVERÁ adotar `'muse'` como chave canônica de fonte do The Muse em todas as camadas (importação, dados offline, filtro e estilos).
2. QUANDO `src/preview-jobs.js` gerar dados, O SISTEMA DEVERÁ emitir `source: 'muse'` para vagas do The Muse.
3. QUANDO o arquivo `public/data/vagas-preview.json` existente for considerado, O SISTEMA DEVERÁ normalizar registros com `source: 'themuse'` para `'muse'`.
4. QUANDO o usuário filtrar por The Muse no modo offline, O SISTEMA DEVERÁ retornar as vagas correspondentes.
5. QUANDO um badge de fonte do The Muse for renderizado, O SISTEMA DEVERÁ aplicar o estilo `.source-muse`.

### Requisito 8 — Testes Automatizados

**História de usuário:** Como mantenedor, quero uma suíte de testes automatizados, para validar o comportamento e prevenir regressões.

#### Critérios de Aceitação

1. O SISTEMA DEVERÁ fornecer um script `npm test` que executa o runner nativo `node --test`.
2. O SISTEMA DEVERÁ extrair a sanitização de busca para um helper puro `sanitizeSearch` e a normalização de paginação para `clampPagination`, exportáveis e sem alterar o comportamento observável das rotas.
3. O SISTEMA DEVERÁ incluir testes unitários para `sanitizeSearch` (remoção de `, ( ) * \ "`, `trim`, idempotência) e `clampPagination` (`page` ≥ 1; `1 ≤ limit ≤ 100`).
4. O SISTEMA DEVERÁ incluir testes de integração HTTP (via `supertest`), em modo offline, para `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/companies` e `GET /api/stats`.
5. QUANDO uma rota `/api/*` inexistente for testada, O teste DEVERÁ verificar resposta 404 em JSON.
6. O SISTEMA DEVERÁ incluir teste validando a agregação de empresas (contagem por empresa, ordenação decrescente por `active_jobs` e paginação).
7. ONDE funções puras forem testáveis por propriedade, O SISTEMA PODERÁ usar `fast-check` (opcional); caso contrário, deverá cobrir com tabelas de exemplos representativos no `node:test`.

### Requisito 9 — Atualização de Configuração e Documentação

**História de usuário:** Como novo desenvolvedor no projeto, quero que `.env.example` e `README.md` reflitam a configuração real, para conseguir rodar o projeto sem seguir instruções obsoletas.

#### Critérios de Aceitação

1. QUANDO `.env.example` for lido, O SISTEMA DEVERÁ documentar as variáveis `ALLOWED_ORIGINS` e `DEFAULT_SALARY_CURRENCY`.
2. QUANDO `.env.example` for lido, O SISTEMA DEVERÁ não conter a seção de variáveis `DB_*` (AWS RDS).
3. QUANDO `README.md` for lido, O SISTEMA DEVERÁ descrever o fluxo de provisão via Supabase (executar `schema.sql` no SQL Editor) e não mencionar `setup-db`, CloudFormation ou AWS RDS.
4. O SISTEMA DEVERÁ manter coerência entre os scripts listados em `package.json` e os documentados no `README.md`.
