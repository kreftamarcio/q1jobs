const axios = require('axios');

/**
 * Jooble API - Agregador global de vagas
 * Docs: https://jooble.org/api/about
 * PRECISA de API key (cadastro gratuito)
 */
async function fetchJoobleJobs(keywords = '', location = '') {
  const apiKey = process.env.JOOBLE_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  Jooble: API key não configurada. Cadastre-se em https://jooble.org/api/about');
    return [];
  }

  console.log(`🔍 Buscando vagas do Jooble (${keywords || 'todas'})...`);
  
  const response = await axios.post(
    `https://jooble.org/api/${apiKey}`,
    {
      keywords: keywords,
      location: location,
      page: 1
    }
  );

  const jobs = response.data.jobs || [];
  
  return jobs.map(job => ({
    external_id: String(job.id || job.link),
    source: 'jooble',
    title: job.title || '',
    description: job.snippet || '',
    company_name: job.company || '',
    logo_url: '',
    location: job.location || '',
    location_type: detectLocationType(job.location),
    job_type: job.type || 'full-time',
    salary_min: parseSalary(job.salary, 'min'),
    salary_max: parseSalary(job.salary, 'max'),
    salary_currency: 'BRL',
    category: 'General',
    tags: [],
    apply_url: job.link || '',
    published_at: job.updated ? new Date(job.updated) : new Date()
  }));
}

function detectLocationType(location) {
  if (!location) return 'onsite';
  const l = location.toLowerCase();
  if (l.includes('remote') || l.includes('remoto')) return 'remote';
  if (l.includes('hybrid') || l.includes('híbrido')) return 'hybrid';
  return 'onsite';
}

function parseSalary(salary, type) {
  if (!salary) return null;
  const numbers = salary.match(/[\d.,]+/g);
  if (!numbers) return null;
  if (type === 'min') return parseFloat(numbers[0].replace(/[.,]/g, ''));
  if (type === 'max' && numbers.length > 1) return parseFloat(numbers[1].replace(/[.,]/g, ''));
  return null;
}

module.exports = { fetchJoobleJobs };
