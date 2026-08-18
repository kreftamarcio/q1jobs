# SPEC — Q1 Jobs Aggregator

Status: FATIA 1–2 neste commit.

## Objetivo

Agregar vagas de múltiplas fontes, normalizar, deduplicar e servir busca.
Aceite: filtrar mais de uma fonte, sem duplicata em `source+external_id`, abrir `apply_url`.

## Decisões

- [x] Quem paga mês 1: tráfego
- [x] Billing: depois
- [x] Stack: Node JS + Express + Supabase
- [x] Dedup MVP: `UNIQUE(source, external_id)`
- [x] Repo: q1jobs
- [ ] País: location texto (como a API hoje) até você pedir ISO
- [ ] Dedup cross-source: não nesta fatia

## Fatias

| # | Entrega | Verificação |
|---|---------|-------------|
| 0 | Spec | feito |
| 1 | Inventário | `INVENTORY.md` |
| 2 | normalizeJob + teste | `node --test test/normalizeJob.test.js` |
| 3 | Dedup na chave existente | depois |
| 4 | Isolar falha de provider | depois |
| 5 | GET /api/jobs offline | depois |
