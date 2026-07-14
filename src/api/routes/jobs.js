const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const supabase = require('../../database/supabase');

// Carrega JSON local como fallback
let localJobs = [];
const localPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'vagas-preview.json');
if (fs.existsSync(localPath)) {
  localJobs = JSON.parse(fs.readFileSync(localPath, 'utf8'));
}

/**
 * GET /api/jobs/filters/options
 * IMPORTANTE: deve vir ANTES de /:id
 */
router.get('/filters/options', async (req, res) => {
  if (!supabase) {
    // Modo offline
    const sources = {};
    const types = {};
    localJobs.forEach(j => {
      sources[j.source] = (sources[j.source] || 0) + 1;
      types[j.type || 'onsite'] = (types[j.type || 'onsite'] || 0) + 1;
    });
    return res.json({
      categories: [],
      sources: Object.entries(sources).map(([source, count]) => ({ source, count })),
      location_types: Object.entries(types).map(([location_type, count]) => ({ location_type, count }))
    });
  }

  try {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('category, source, location_type')
      .eq('is_active', true);

    const categories = {};
    const sources = {};
    const types = {};
    (jobs || []).forEach(j => {
      if (j.category) categories[j.category] = (categories[j.category] || 0) + 1;
      sources[j.source] = (sources[j.source] || 0) + 1;
      if (j.location_type) types[j.location_type] = (types[j.location_type] || 0) + 1;
    });

    res.json({
      categories: Object.entries(categories).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 30),
      sources: Object.entries(sources).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      location_types: Object.entries(types).map(([location_type, count]) => ({ location_type, count })).sort((a, b) => b.count - a.count)
    });
  } catch (err) {
    console.error('Erro filtros:', err.message);
    res.status(500).json({ error: 'Erro ao buscar filtros' });
  }
});

/**
 * GET /api/jobs
 * Lista vagas com filtros e paginação
 */
router.get('/', async (req, res) => {
  const {
    q, location, type, job_type, category, source, company,
    page = 1, limit = 20, sort = 'published_at', order = 'desc'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

  // Modo offline (sem Supabase)
  if (!supabase) {
    return serveLocalJobs(req, res, { q, location, type, source, pageNum, limitNum, sort, order });
  }

  try {
    let query = supabase
      .from('jobs')
      .select('id, source, title, company_name, location, location_type, job_type, salary_min, salary_max, salary_currency, category, tags, apply_url, published_at, created_at', { count: 'exact' })
      .eq('is_active', true);

    if (q) {
      const safeQ = String(q).replace(/[,()*\\"]/g, ' ').trim();
      if (safeQ) query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%,company_name.ilike.%${safeQ}%`);
    }
    if (location) query = query.ilike('location', `%${location}%`);
    if (type) query = query.eq('location_type', type);
    if (job_type) query = query.eq('job_type', job_type);
    if (category) query = query.ilike('category', `%${category}%`);
    if (source) query = query.eq('source', source);
    if (company) query = query.ilike('company_name', `%${company}%`);

    const ascending = order === 'asc';
    query = query.order(sort, { ascending, nullsFirst: false });

    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    res.json({
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
        hasNext: pageNum * limitNum < (count || 0),
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error('Erro ao buscar vagas:', err.message);
    // Fallback para local
    serveLocalJobs(req, res, { q, location, type, source, pageNum, limitNum, sort, order });
  }
});

/**
 * GET /api/jobs/:id
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!supabase) {
    const job = localJobs[parseInt(id)] || null;
    if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
    return res.json({ data: { ...job, id: parseInt(id) } });
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Vaga não encontrada' });
    res.json({ data });
  } catch (err) {
    console.error('Erro detalhe:', err.message);
    res.status(500).json({ error: 'Erro ao buscar vaga' });
  }
});

/**
 * Serve vagas do JSON local com filtros
 */
function serveLocalJobs(req, res, { q, location, type, source, pageNum, limitNum, sort, order }) {
  let filtered = [...localJobs];

  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(j =>
      (j.title || '').toLowerCase().includes(query) ||
      (j.company || '').toLowerCase().includes(query)
    );
  }
  if (location) {
    const loc = location.toLowerCase();
    filtered = filtered.filter(j => (j.location || '').toLowerCase().includes(loc));
  }
  if (type) {
    filtered = filtered.filter(j => j.type === type);
  }
  if (source) {
    filtered = filtered.filter(j => j.source === source);
  }

  // Sort
  if (sort === 'title') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (order === 'desc') filtered.reverse();
  } else {
    // Por data (padrão)
    filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (order === 'asc') filtered.reverse();
  }

  const total = filtered.length;
  const start = (pageNum - 1) * limitNum;
  const paged = filtered.slice(start, start + limitNum);

  // Mapeia para formato da API
  const data = paged.map((job, index) => ({
    id: start + index,
    source: job.source,
    title: job.title,
    company_name: job.company,
    location: job.location,
    location_type: job.type || 'onsite',
    job_type: 'full-time',
    salary_min: null,
    salary_max: null,
    salary_currency: 'USD',
    category: (job.tags && job.tags[0]) || null,
    tags: job.tags || [],
    apply_url: job.url,
    published_at: job.date,
    created_at: job.date
  }));

  res.json({
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: start + limitNum < total,
      hasPrev: pageNum > 1
    }
  });
}

module.exports = router;
