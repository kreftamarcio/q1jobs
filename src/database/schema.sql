-- ===========================================
-- SCHEMA DO BANCO DE DADOS - RECRUTADOR (Supabase)
-- IDEMPOTENTE e À PROVA DE ERROS: pode colar quantas vezes quiser.
-- Não apaga dados das tabelas. Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard → Projeto → SQL Editor
-- ===========================================

-- Empresas
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    logo_url TEXT,
    website VARCHAR(500),
    description TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vagas
CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255),
    source VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    description TEXT,
    company_id BIGINT REFERENCES companies(id),
    company_name VARCHAR(255),
    location VARCHAR(255),
    location_type VARCHAR(50),
    job_type VARCHAR(50),
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency VARCHAR(10) DEFAULT 'USD',
    category VARCHAR(100),
    tags TEXT[],
    experience_level VARCHAR(50),
    apply_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(source, external_id)
);

-- Histórico de importações
CREATE TABLE IF NOT EXISTS import_logs (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    jobs_fetched INTEGER DEFAULT 0,
    jobs_inserted INTEGER DEFAULT 0,
    jobs_updated INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'running'
);

-- Alinha o DEFAULT da moeda a 'USD' (não altera linhas existentes)
ALTER TABLE jobs ALTER COLUMN salary_currency SET DEFAULT 'USD';

-- ===========================================
-- ÍNDICES básicos (IF NOT EXISTS)
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_location_type ON jobs(location_type);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at ON jobs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_name ON jobs(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_jobs_active_published ON jobs(is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);

-- ===========================================
-- Busca textual rápida (trigram) — RESILIENTE
-- Se pg_trgm não estiver disponível por qualquer motivo, é ignorado SEM erro.
-- ===========================================
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING GIN (title gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jobs_company_name_trgm ON jobs USING GIN (company_name gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm ON jobs USING GIN (location gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jobs_category_trgm ON jobs USING GIN (category gin_trgm_ops)';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Indices trigram pulados (pg_trgm indisponivel): %', SQLERRM;
END $$;

-- ===========================================
-- ROW LEVEL SECURITY (RLS) — recriação idempotente
-- Leitura pública; escrita apenas com a service_role key.
-- ===========================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vagas são públicas" ON jobs;
CREATE POLICY "Vagas são públicas" ON jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Empresas são públicas" ON companies;
CREATE POLICY "Empresas são públicas" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Logs são públicos" ON import_logs;
CREATE POLICY "Logs são públicos" ON import_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service pode inserir vagas" ON jobs;
CREATE POLICY "Service pode inserir vagas" ON jobs FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service pode atualizar vagas" ON jobs;
CREATE POLICY "Service pode atualizar vagas" ON jobs FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service pode inserir empresas" ON companies;
CREATE POLICY "Service pode inserir empresas" ON companies FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service pode atualizar empresas" ON companies;
CREATE POLICY "Service pode atualizar empresas" ON companies FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service pode inserir logs" ON import_logs;
CREATE POLICY "Service pode inserir logs" ON import_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service pode atualizar logs" ON import_logs;
CREATE POLICY "Service pode atualizar logs" ON import_logs FOR UPDATE USING (auth.role() = 'service_role');

-- ===========================================
-- updated_at automático (trigger)
-- ===========================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===========================================
-- VIEW: empresas com contagem de vagas ativas (recriação segura)
-- Remove o teto de 5000 linhas do endpoint /api/companies.
-- OBS: só retorna dados depois que a importação popular `companies`
-- e preencher `jobs.company_id` (correção da spec — tarefa 4.1).
-- ===========================================
DROP VIEW IF EXISTS companies_with_counts;
CREATE VIEW companies_with_counts AS
SELECT
    c.id,
    c.name,
    c.slug,
    c.industry,
    c.logo_url,
    c.website,
    c.location,
    COUNT(j.id) FILTER (WHERE j.is_active) AS active_jobs
FROM companies c
LEFT JOIN jobs j ON j.company_id = c.id
GROUP BY c.id;

GRANT SELECT ON companies_with_counts TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
