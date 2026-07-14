const axios = require('axios');

/**
 * Remotive API - Vagas remotas globais
 * Docs: https://remotive.com/api/remote-jobs
 * Não precisa de API key!
 *
 * Resposta: { jobs: [ { id, url, title, company_name, company_logo,
 *   category, tags:[], job_type, publication_date,
 *   candidate_required_location, salary, description } ] }
 */
async function fetchRemotiveJobs(search = '', category = '') {
  console.log(`🟢 Buscando vagas do Remotive${search ? ` ("${search}")` : ''}...`);

  const params = {};
  if (search) params.search = search;
  if (category) params.category = category;

  try {
    const response = await axios.get('https://remotive.com/api/remote-jobs', {
      params,
      headers: { 'User-Agent': 'Recrutador/1.0' },
      timeout: 15000
    });

    const jobs = (response.data && response.data.jobs) || [];

    return jobs.map(job => ({
      external_id: String(job.id || job.url || ''),
      source: 'remotive',
      title: job.title || '',
      description: job.description || '',
      company_name: job.company_name || '',
      logo_url: job.company_logo || '',
      location: job.candidate_required_location || 'Remote',
      location_type: 'remote',
      job_type: mapJobType(job.job_type),
      // O campo `salary` do Remotive é texto livre; mantemos numéricos nulos.
      salary_min: null,
      salary_max: null,
      salary_currency: 'USD',
      category: job.category || 'Technology',
      tags: Array.isArray(job.tags) ? job.tags : [],
      apply_url: job.url || '',
      published_at: job.publication_date || new Date().toISOString()
    }));
  } catch (err) {
    console.error(`  ❌ Remotive: ${err.message}`);
    return [];
  }
}

function mapJobType(type) {
  if (!type) return 'full-time';
  const t = String(type).toLowerCase();
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract')) return 'contract';
  return 'full-time';
}

module.exports = { fetchRemotiveJobs };
