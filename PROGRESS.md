# PROGRESS — q1jobs aggregator

## Agora

- Fatia 0–2 no branch `feat/slice-0-aggregator-spec`.
- `security.yml` sem gitleaks-action.
- `ci.yml` Node 22/24 + checkout@v5.

## Feito

- SPEC, CLAUDE, TRACKS, INVENTORY.
- `src/lib/normalizeJob.js` + `test/normalizeJob.test.js`.
- Fix CI Gitleaks (commit 720d7cf).

## Próximo

Fatia 3: teste de dedup `source+external_id`. Não ligar mapper nos 15 providers até esse teste existir.
