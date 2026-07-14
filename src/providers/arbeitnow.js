const axios = require('axios');

/**
 * Arbeitnow API - Vagas remotas e presenciais
 * Docs: https://arbeitnow.com/api
 * Não precisa de API key!
 */
async function fetchArbeitnowJobs(page = 1) {
  console.log(`🇪🇺 Buscando vagas do Arbeitnow (página ${page})...`);
  
  const response = await axios.get(`https://www.arbeitnow.com/api/job-board-api`, {
    params: { page }
  });

  const jobs = response.data.data || [];
  
  return jobs.map(job => ({
    external_id: String(job.slug || job.title),
    source: 'arbeitnow',
    title: job.title || '',
    description: job.description || '',
    company_name: job.company_name || '',
    logo_url: job.company_logo || '',
    location: job.location || '',
    location_type: job.remote ? 'remote' : 'onsite',
    job_type: mapJobType(job.job_types),
    salary_min: null,
    salary_max: null,
    salary_currency: 'EUR',
    category: (job.tags && job.tags[0]) || 'General',
    tags: job.tags || [],
    apply_url: job.url || '',
    published_at: job.created_at ? new Date(job.created_at * 1000) : new Date()
  }));
}

function mapJobType(types) {
  if (!types || types.length === 0) return 'full-time';
  const t = types[0].toLowerCase();
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract')) return 'contract';
  if (t.includes('freelance')) return 'freelance';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

module.exports = { fetchArbeitnowJobs };
