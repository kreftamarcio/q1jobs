const axios = require('axios');

/**
 * RemoteOK API - Vagas remotas globais
 * Docs: https://remoteok.com/api
 * Não precisa de API key!
 */
async function fetchRemoteOKJobs() {
  console.log('🌍 Buscando vagas do RemoteOK...');
  
  const response = await axios.get('https://remoteok.com/api', {
    headers: {
      'User-Agent': 'Recrutador/1.0'
    }
  });

  // Primeiro item é metadata, ignorar
  const jobs = response.data.slice(1);
  
  return jobs.map(job => ({
    external_id: String(job.id),
    source: 'remoteok',
    title: job.position || job.title || '',
    description: job.description || '',
    company_name: job.company || '',
    logo_url: job.company_logo || '',
    location: job.location || 'Remote',
    location_type: 'remote',
    job_type: 'full-time',
    salary_min: job.salary_min ? parseFloat(job.salary_min) : null,
    salary_max: job.salary_max ? parseFloat(job.salary_max) : null,
    salary_currency: 'USD',
    category: (job.tags && job.tags[0]) || 'Technology',
    tags: job.tags || [],
    apply_url: job.url || `https://remoteok.com/l/${job.id}`,
    published_at: job.date ? new Date(job.date) : new Date()
  }));
}

module.exports = { fetchRemoteOKJobs };
