const axios = require('axios');

/**
 * Adzuna API - Agregador global de vagas
 * Docs: https://developer.adzuna.com/
 * PRECISA de API key (cadastro gratuito)
 * Suporta: BR, US, UK, DE, FR, AU, etc.
 */
async function fetchAdzunaJobs(country = 'br', page = 1, query = '') {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  
  if (!appId || !appKey) {
    console.log('⚠️  Adzuna: API keys não configuradas. Cadastre-se em https://developer.adzuna.com/');
    return [];
  }

  console.log(`🔍 Buscando vagas do Adzuna (${country}, página ${page})...`);
  
  const params = {
    app_id: appId,
    app_key: appKey,
    results_per_page: 50
  };
  if (query) params.what = query;

  const response = await axios.get(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`, { params }
  );

  const jobs = response.data.results || [];
  
  return jobs.map(job => ({
    external_id: String(job.id),
    source: 'adzuna',
    title: job.title || '',
    description: job.description || '',
    company_name: job.company?.display_name || '',
    logo_url: '',
    location: job.location?.display_name || '',
    location_type: detectLocationType(job.location?.display_name),
    job_type: mapContractType(job.contract_type),
    salary_min: job.salary_min || null,
    salary_max: job.salary_max || null,
    salary_currency: country === 'br' ? 'BRL' : 'USD',
    category: job.category?.label || 'General',
    tags: job.category ? [job.category.tag] : [],
    apply_url: job.redirect_url || '',
    published_at: job.created ? new Date(job.created) : new Date()
  }));
}

function detectLocationType(location) {
  if (!location) return 'onsite';
  const l = location.toLowerCase();
  if (l.includes('remote') || l.includes('remoto')) return 'remote';
  if (l.includes('hybrid') || l.includes('híbrido')) return 'hybrid';
  return 'onsite';
}

function mapContractType(type) {
  if (!type) return 'full-time';
  const t = type.toLowerCase();
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract')) return 'contract';
  return 'full-time';
}

module.exports = { fetchAdzunaJobs };
