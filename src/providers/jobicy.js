const axios = require('axios');

/**
 * Jobicy API - Vagas remotas globais
 * Docs: https://jobicy.com/api/v2/remote-jobs
 * Não precisa de API key!
 */
async function fetchJobicyJobs(count = 50, tag = '') {
  console.log(`🌐 Buscando vagas do Jobicy${tag ? ` (${tag})` : ''}...`);

  const params = { count, geo: 'anywhere' };
  if (tag) params.tag = tag;

  const response = await axios.get('https://jobicy.com/api/v2/remote-jobs', { params });

  const jobs = response.data.jobs || [];

  return jobs.map(job => ({
    external_id: String(job.id || job.url),
    source: 'jobicy',
    title: job.jobTitle || '',
    description: job.jobDescription || job.jobExcerpt || '',
    company_name: job.companyName || '',
    logo_url: job.companyLogo || '',
    location: job.jobGeo || 'Remote',
    location_type: 'remote',
    job_type: mapJobType(job.jobType),
    salary_min: parseSalary(job.annualSalaryMin),
    salary_max: parseSalary(job.annualSalaryMax),
    salary_currency: job.salaryCurrency || 'USD',
    category: job.jobIndustry ? job.jobIndustry[0] : 'Technology',
    tags: job.jobIndustry || [],
    apply_url: job.url || '',
    published_at: job.pubDate || new Date().toISOString()
  }));
}

function mapJobType(type) {
  if (!type) return 'full-time';
  const t = type.toLowerCase();
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract')) return 'contract';
  return 'full-time';
}

function parseSalary(val) {
  if (!val) return null;
  const num = parseInt(String(val).replace(/[^0-9]/g, ''));
  return isNaN(num) ? null : num;
}

module.exports = { fetchJobicyJobs };
