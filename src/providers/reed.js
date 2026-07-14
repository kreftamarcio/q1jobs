const axios = require('axios');

/**
 * Reed API - Vagas do Reino Unido
 * Docs: https://www.reed.co.uk/developers/jobseeker
 * PRECISA de API key (cadastro gratuito)
 */
async function fetchReedJobs(keywords = '', page = 1) {
  const apiKey = process.env.REED_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  Reed: API key não configurada. Cadastre-se em https://www.reed.co.uk/developers/jobseeker');
    return [];
  }

  console.log(`🇬🇧 Buscando vagas do Reed (página ${page})...`);
  
  const response = await axios.get('https://www.reed.co.uk/api/1.0/search', {
    auth: {
      username: apiKey,
      password: ''
    },
    params: {
      keywords: keywords,
      resultsToTake: 100,
      resultsToSkip: (page - 1) * 100
    }
  });

  const jobs = response.data.results || [];
  
  return jobs.map(job => ({
    external_id: String(job.jobId),
    source: 'reed',
    title: job.jobTitle || '',
    description: job.jobDescription || '',
    company_name: job.employerName || '',
    logo_url: '',
    location: job.locationName || '',
    location_type: 'onsite',
    job_type: job.partTime ? 'part-time' : (job.contractType || 'full-time'),
    salary_min: job.minimumSalary || null,
    salary_max: job.maximumSalary || null,
    salary_currency: 'GBP',
    category: job.category || 'General',
    tags: [],
    apply_url: job.jobUrl || '',
    published_at: job.date ? new Date(job.date) : new Date()
  }));
}

module.exports = { fetchReedJobs };
