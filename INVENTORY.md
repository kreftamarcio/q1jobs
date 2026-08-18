# INVENTORY — q1jobs

Fonte: busca no código. Só o que apareceu em fragmento.

## Runtime

- `package.json` name `q1jobs`, main `src/server.js`
- scripts: `start` = `node src/server.js`; `test` = `node --test`; `preview` = `node src/preview-jobs.js`
- deps: `@supabase/supabase-js`, `axios`, `cors`, `dotenv`, `express`, `express-rate-limit`, `helmet`, `pg`
- porta: `process.env.PORT || 3000`
- static: `public/`
- helmet + cors + express.json()

## API

- `GET /api/jobs` query: `q`, `location`, `type`, `job_type`, `category`, `source`, `company`, `page` (min 1), `limit` (1–100), `sort` default `published_at`, `order` default `desc`
- `GET /api/jobs/filters/options` (antes de `/:id`)
- `GET /api/companies` query: `q`, `page`, `limit`
- `GET /api/companies/:id`
- `GET /api/stats`
- Sem Supabase: fallback JSON local
- NÃO CONFIRMADO: corpo de `GET /api/jobs/:id`

## Banco

- `companies`: `id`, `name`, `slug UNIQUE`, `logo_url`, `website`, `description`, `industry`
- `jobs`: `id`, `external_id`, `source NOT NULL`, `UNIQUE(source, external_id)`, `is_active`, `published_at`, `expires_at`
- Upsert: `onConflict: 'source,external_id'`
- Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `JOOBLE_API_KEY`

## Contrato de vaga (remoteok.js)

`external_id`, `source`, `title`, `description`, `company_name`, `logo_url`, `location`, `location_type`, `job_type`, `salary_min`, `salary_max`, `salary_currency`, `category`, `tags`, `apply_url`, `published_at`

## Lacunas

1. Dedup não é cross-source.
2. API não tem filtro `country`.
3. `remoteok.js` inventa `published_at` com `new Date()`.
