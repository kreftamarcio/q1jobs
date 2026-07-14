const axios = require('axios');

/**
 * The Muse API - Vagas e perfis de empresas dos EUA
 * Docs: https://www.themuse.com/developers/api/v2
 * API key opcional (funciona sem, mas com rate limit menor)
 */
async function fetchMuseJobs(page = 0, category = '') {
  console.log(`✨ Buscando vagas do The Muse (página ${page})...`);
  
  const params = {
    page: page,
    descending: true
  };

  if (category) params.category = category;
  if (process.env.MUSE_API_KEY) params.api_key = process.env.MUSE_API_KEY;

  const response = await axios.get('https://www.themuse.com/api/public/jobs', {
    params
  });

  const jobs = response.data.results || [];
  
  return jobs.map(job => ({
    external_id: String(job.id),
    source: 'muse',
    title: job.name || '',
    description: job.contents || '',
    company_name: job.company?.name || '',
    logo_url: '',
    location: formatMuseLocations(job.locations),
    location_type: detectMuseLocationType(job.locations),
    job_type: mapMuseLevel(job.levels),
    salary_min: null,
    salary_max: null,
    salary_currency: 'USD',
    category: (job.categories && job.categories[0]?.name) || 'General',
    tags: (job.tags || []).map(t => t.name || t),
    apply_url: job.refs?.landing_page || '',
    published_at: job.publication_date ? new Date(job.publication_date) : new Date()
  }));
}

function formatMuseLocations(locations) {
  if (!locations || locations.length === 0) return '';
  return locations.map(l => l.name).join(', ');
}

function detectMuseLocationType(locations) {
  if (!locations || locations.length === 0) return 'onsite';
  const names = locations.map(l => l.name?.toLowerCase() || '');
  if (names.some(n => n.includes('remote') || n.includes('flexible'))) return 'remote';
  return 'onsite';
}

function mapMuseLevel(levels) {
  // The Muse uses levels for experience, not job type
  return 'full-time';
}

module.exports = { fetchMuseJobs };
