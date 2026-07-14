const axios = require('axios');

/**
 * Working Nomads API - Vagas remotas
 * Endpoint: https://www.workingnomads.com/api/exposed_jobs/
 * Não precisa de API key!
 *
 * Resposta: ARRAY de { url, title, company_name, category_name,
 *   tags (string separada por vírgulas), description, location, pub_date, ... }
 */
async function fetchWorkingNomadsJobs() {
  console.log('🧳 Buscando vagas do Working Nomads...');

  try {
    const response = await axios.get('https://www.workingnomads.com/api/exposed_jobs/', {
      headers: { 'User-Agent': 'Recrutador/1.0' },
      timeout: 15000
    });

    const jobs = Array.isArray(response.data) ? response.data : [];

    return jobs.map(job => ({
      // url é estável e único por vaga
      external_id: String(job.url || job.title || ''),
      source: 'workingnomads',
      title: job.title || '',
      description: job.description || '',
      company_name: job.company_name || '',
      logo_url: '',
      location: job.location || 'Remote',
      location_type: 'remote',
      job_type: 'full-time',
      salary_min: null,
      salary_max: null,
      salary_currency: 'USD',
      category: job.category_name || 'Technology',
      tags: parseTags(job.tags),
      apply_url: job.url || '',
      published_at: job.pub_date || new Date().toISOString()
    }));
  } catch (err) {
    console.error(`  ❌ Working Nomads: ${err.message}`);
    return [];
  }
}

// tags vem como string separada por vírgulas -> array (trim + remove vazios)
function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

module.exports = { fetchWorkingNomadsJobs };
