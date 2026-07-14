const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const supabase = require('../../database/supabase');

/**
 * GET /api/stats
 */
router.get('/', async (req, res) => {
  if (!supabase) {
    const localPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'vagas-preview.json');
    let jobs = [];
    if (fs.existsSync(localPath)) {
      jobs = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    }
    const sources = {};
    const types = {};
    jobs.forEach(j => {
      sources[j.source] = (sources[j.source] || 0) + 1;
      types[j.type || 'onsite'] = (types[j.type || 'onsite'] || 0) + 1;
    });
    return res.json({
      total_jobs: jobs.length,
      total_companies: new Set(jobs.map(j => j.company)).size,
      by_source: Object.entries(sources).map(([source, count]) => ({ source, count })),
      by_type: [],
      by_location_type: Object.entries(types).map(([location_type, count]) => ({ location_type, count })),
      recent_imports: []
    });
  }

  try {
    // Contagens usando count exact (não precisa puxar rows)
    const { count: totalJobs } = await supabase
      .from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true);

    const { count: remoteCount } = await supabase
      .from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('location_type', 'remote');

    const { count: onsiteCount } = await supabase
      .from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('location_type', 'onsite');

    const { count: hybridCount } = await supabase
      .from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('location_type', 'hybrid');

    // Empresas distintas - pega amostra e conta
    const { data: compSample } = await supabase
      .from('jobs').select('company_name').eq('is_active', true).not('company_name', 'is', null).limit(1000);
    const totalCompanies = new Set((compSample || []).map(j => j.company_name)).size;

    // Sources - contagem por grupo
    const { data: sourceSample } = await supabase
      .from('jobs').select('source').eq('is_active', true).limit(1000);
    const sources = {};
    (sourceSample || []).forEach(j => { sources[j.source] = (sources[j.source] || 0) + 1; });

    // Logs
    const { data: logs } = await supabase
      .from('import_logs').select('*').order('started_at', { ascending: false }).limit(10);

    res.json({
      total_jobs: totalJobs || 0,
      total_companies: totalCompanies || 0,
      by_source: Object.entries(sources).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      by_type: [],
      by_location_type: [
        { location_type: 'remote', count: remoteCount || 0 },
        { location_type: 'onsite', count: onsiteCount || 0 },
        { location_type: 'hybrid', count: hybridCount || 0 }
      ],
      recent_imports: logs || []
    });
  } catch (err) {
    console.error('Erro stats:', err.message);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
