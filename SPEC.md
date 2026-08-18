# SPEC — Q1 Jobs Aggregator

Status: FATIA 0. Sem implementação até você marcar cada INCERTO.
Fonte da verdade: árvore atual de `kreftamarcio/q1jobs` em `main` / este branch. Não a descrição do repo.

## Objetivo

Agregar vagas de múltiplas fontes globais (ATS + boards), normalizar, deduplicar e servir busca.
Uma frase de aceite: o usuário filtra vagas de mais de uma fonte, sem duplicata óbvia, e abre o link original.

## Fora de escopo do MVP

- Candidatura one-click / ATS outbound
- Rede social / feed / chat
- Matching por IA sem evidência de dado
- App mobile nativo
- Multi-tenant de clínica ou agentes neste repo
- Migrar o app inteiro para Next/Prisma nesta fatia

## O que existe (evidência na árvore)

- Runtime: JavaScript + `src/server.js`
- Providers em `src/providers/`: adzuna, arbeitnow, ashby, findwork, greenhouse, himalayas, jobicy, jooble, lever, reed, remoteok, remotive, themuse, weworkremotely, workingnomads
- Fetchers: `src/fetchJobs.js`, `src/fetchMax.js`, `src/fetchRemote.js`, `src/buscar-jornalismo.js`, `src/preview-jobs.js`
- API: `src/api/routes/jobs.js`, `companies.js`, `stats.js`
- Dados: `src/database/db.js`, `schema.sql`, `setup.js`, `supabase.js`
- Teste: só `test/sentinel.test.js`
- Também: `public/`, `aws/`, `data/`, `.env.example`

Não confirmado (arquivo não lido com sucesso nesta sessão): colunas de `schema.sql`, deps de `package.json`, corpo das rotas.

## Fatias

| # | Entrega | Verificação |
|---|---------|-------------|
| 0 | Este spec + contrato | Você aprovou os INCERTOs |
| 1 | Inventário: ler schema, package, rotas e documentar contratos reais | `INVENTORY.md` só com evidência |
| 2 | Contrato canônico de vaga + teste de normalização | teste unitário do mapper |
| 3 | Dedup (chave estável) + teste | 2 fontes, 1 vaga, 1 registro |
| 4 | Job de ingestão por provider com falha isolada | 1 provider ok não quebra os outros |
| 5 | Busca: q, país, remoto, fonte, paginação | teste HTTP em `/jobs` |
| 6 | i18n de UI (pt/en) + timezone da busca | fixture pt e en |
| 7 | Auth mínima (alerta / salvar busca) | signup/login/logout |
| 8 | Billing só se INCERTO de quem paga fechar | webhook de teste ou adiamento explícito |

## INCERTOS (bloqueiam fatia 2+)

- [ ] Quem paga no mês 1: candidato, empresa, API B2B, ou só tráfego
- [ ] Billing agora (`stripe`) ou `depois`
- [ ] Manter Node JS atual ou migrar stack (não misturar no mesmo commit)
- [ ] Chave de dedup: URL canônica vs company+title+location
- [ ] Países do MVP (lista fechada)
- [ ] Repo deste produto permanece `q1jobs` (sim, até você dizer o contrário)

## Trilhas irmãs

Ver `TRACKS.md`. Neste repo só a trilha Jobs. Clinic, Agents e Platform não recebem código aqui.
