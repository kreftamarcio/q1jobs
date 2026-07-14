const axios = require('axios');

/**
 * Himalayas API - Vagas remotas globais (tech-focused)
 * Docs: https://himalayas.app/api
 * Não precisa de API key!
 */
async function fetchHimalayasJobs(page = 1) {
  console.log(`🏔️  Buscando vagas do Himalayas (página ${page})...`);

  const response = await axios.get('https://himalayas.app/jobs/api', {
    params: { page, limit: 50 }
  });

  const jobs = response.data.jobs || response.data || [];

  return jobs.map(job => ({
    external_id: String(job.id || job.slug || job.title),
    source: 'himalayas',
    title: job.title || '',
    description: job.description || job.excerpt || '',
    company_name: job.companyName || job.company_name || '',
    logo_url: job.companyLogo || '',
    location: job.location || 'Remote',
    location_type: 'remote',
    job_type: mapJobType(job.employmentType || job.type),
    salary_min: job.minSalary || job.salary_min || null,
    salary_max: job.maxSalary || job.salary_max || null,
    salary_currency: 'USD',
    category: job.category || (job.categories && job.categories[0]) || 'Technology',
    tags: job.tags || job.skills || [],
    apply_url: job.applicationUrl || job.url || `https://himalayas.app/jobs/${job.slug || job.id}`,
    published_at: job.pubDate || job.publishedAt || job.created_at || new Date().toISOString()
  }));
}

async function fetchHimalayasSearch(keyword = 'developer', page = 1) {
  console.log(`🏔️  Buscando Himalayas: "${keyword}" (página ${page})...`);

  try {
    const response = await axios.get('https://himalayas.app/jobs/api/search', {
      params: { query: keyword, page, limit: 50 }
    });

    const jobs = response.data.jobs || response.data || [];
    return jobs.map(job => ({
      external_id: String(job.id || job.slug || job.title + job.companyName),
      source: 'himalayas',
      title: job.title || '',
      description: job.description || job.excerpt || '',
      company_name: job.companyName || job.company_name || '',
      logo_url: job.companyLogo || '',
      location: job.location || 'Remote',
      location_type: 'remote',
      job_type: mapJobType(job.employmentType || job.type),
      salary_min: job.minSalary || null,
      salary_max: job.maxSalary || null,
      salary_currency: 'USD',
      category: job.category || 'Technology',
      tags: job.tags || job.skills || [],
      apply_url: job.applicationUrl || job.url || `https://himalayas.app/jobs/${job.slug || job.id}`,
      published_at: job.pubDate || job.publishedAt || new Date().toISOString()
    }));
  } catch (err) {
    return [];
  }
}

function mapJobType(type) {
  if (!type) return 'full-time';
  const t = type.toLowerCase();
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract')) return 'contract';
  if (t.includes('freelance')) return 'freelance';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

module.exports = { fetchHimalayasJobs, fetchHimalayasSearch };
