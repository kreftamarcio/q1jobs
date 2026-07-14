const express = require('express');
const router = express.Router();
const supabase = require('../../database/supabase');
const path = require('path');
const fs = require('fs');

let localJobs = [];
const localPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'vagas-preview.json');
if (fs.existsSync(localPath)) {
  try { localJobs = JSON.parse(fs.readFileSync(localPath, 'utf8')); } catch (e) { localJobs = []; }
}

/**
 * GET /api/companies
 * NOTA: Aproximação — agrega empresas a partir da tabela `jobs` (limitada a 5000
 * linhas amostradas, consistente com stats.js). A correção definitiva é popular a
 * tabela `companies` durante a importação ou usar uma view/RPC de agregação no banco.
 */
router.get('/', async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

  // Modo offline (sem Supabase): agrega a partir do JSON local pelo campo `company`
  if (!supabase) {
    const counts = {};
    localJobs.forEach(j => {
      const name = j.company;
      if (!name) return;
      counts[name] = (counts[name] || 0) + 1;
    });

    let companies = Object.entries(counts).map(([name, active_jobs]) => ({
      name,
      industry: null,
      active_jobs
    }));

    if (q) {
      const needle = String(q).toLowerCase();
      companies = companies.filter(c => c.name.toLowerCase().includes(needle));
    }

    companies.sort((a, b) => b.active_jobs - a.active_jobs);

    const total = companies.length;
    const start = (pageNum - 1) * limitNum;
    const data = companies.slice(start, start + limitNum);

    return res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  }

  try {
    // Aproximação: amostra até 5000 vagas ativas e agrega por company_name em JS.
    const { data: rows, error } = await supabase
      .from('jobs').select('company_name').eq('is_active', true).not('company_name', 'is', null).limit(5000);
    if (error) throw error;

    const counts = {};
    (rows || []).forEach(r => {
      const name = r.company_name;
      if (!name) return;
      counts[name] = (counts[name] || 0) + 1;
    });

    let companies = Object.entries(counts).map(([name, active_jobs]) => ({
      name,
      industry: null,
      active_jobs
    }));

    if (q) {
      const needle = String(q).toLowerCase();
      companies = companies.filter(c => c.name.toLowerCase().includes(needle));
    }

    companies.sort((a, b) => b.active_jobs - a.active_jobs);

    const total = companies.length;
    const start = (pageNum - 1) * limitNum;
    const data = companies.slice(start, start + limitNum);

    res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Erro empresas:', err.message);
    res.status(500).json({ error: 'Erro ao buscar empresas' });
  }
});

/**
 * GET /api/companies/:id
 */
router.get('/:id', async (req, res) => {
  if (!supabase) {
    return res.status(404).json({ error: 'Empresa não encontrada' });
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, location, location_type, job_type, salary_min, salary_max, salary_currency, published_at')
      .eq('company_id', req.params.id)
      .eq('is_active', true)
      .order('published_at', { ascending: false });

    res.json({ data: { ...data, jobs: jobs || [] } });
  } catch (err) {
    console.error('Erro empresa:', err.message);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

module.exports = router;
