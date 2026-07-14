const axios = require('axios');

/**
 * Findwork API - Vagas para desenvolvedores
 * Docs: https://findwork.dev/developers/
 * Precisa de API key (gratuita)
 */
async function fetchFindworkJobs(page = 1) {
  const apiKey = process.env.FINDWORK_API_KEY;

  if (!apiKey) {
    console.log('⚠️  Findwork: API key não configurada. Cadastre-se em https://findwork.dev/developers/');
    return [];
  }

  console.log(`💻 Buscando vagas do Findwork (página ${page})...`);

  const response = await axios.get('https://findwork.dev/api/jobs/', {
    headers: { Authorization: `Token ${apiKey}` },
    params: { page }
  });

  const jobs = response.data.results || [];

  return jobs.map(job => ({
    external_id: String(job.id || job.url),
    source: 'findwork',
    title: job.role || '',
    description: job.text || '',
    company_name: job.company_name || '',
    logo_url: job.logo || '',
    location: job.location || '',
    location_type: job.remote ? 'remote' : 'onsite',
    job_type: job.employment_type || 'full-time',
    salary_min: null,
    salary_max: null,
    salary_currency: 'USD',
    category: 'Technology',
    tags: job.keywords || [],
    apply_url: job.url || '',
    published_at: job.date_posted || new Date().toISOString()
  }));
}

module.exports = { fetchFindworkJobs };
