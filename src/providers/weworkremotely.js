const axios = require('axios');

/**
 * We Work Remotely - RSS Feed de vagas remotas
 * Uma das maiores plataformas de vagas remotas do mundo
 * Não precisa de API key (RSS público)
 */
async function fetchWeWorkRemotelyJobs() {
  console.log('🌍 Buscando vagas do We Work Remotely...');

  // WWR expõe um JSON feed
  const categories = [
    'programming',
    'design',
    'devops-sysadmin',
    'product',
    'customer-support',
    'sales-marketing',
    'data'
  ];

  let allJobs = [];

  for (const category of categories) {
    try {
      const response = await axios.get(
        `https://weworkremotely.com/categories/${category}/jobs.json`,
        { timeout: 10000 }
      );
      const jobs = response.data || [];
      allJobs = allJobs.concat(jobs.map(job => ({
        external_id: String(job.id || job.url || job.title + category),
        source: 'weworkremotely',
        title: job.title || '',
        description: job.description || '',
        company_name: job.company?.name || job.company_name || '',
        logo_url: job.company?.logo_url || '',
        location: 'Remote',
        location_type: 'remote',
        job_type: 'full-time',
        salary_min: null,
        salary_max: null,
        salary_currency: 'USD',
        category: category,
        tags: [category],
        apply_url: job.url || `https://weworkremotely.com${job.path || ''}`,
        published_at: job.published_at || job.created_at || new Date().toISOString()
      })));
    } catch (err) {
      // Algumas categorias podem não ter JSON endpoint
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return allJobs;
}

module.exports = { fetchWeWorkRemotelyJobs };
