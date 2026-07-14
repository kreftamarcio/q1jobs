const axios = require('axios');

/**
 * Ashby Job Board API - Vagas direto das empresas (ATS)
 * Endpoint: https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true
 * Não precisa de API key!
 *
 * ✏️  EDITE esta lista para adicionar/remover empresas.
 * Cada item: { board, name } onde board é o identificador do job board no Ashby
 * e name é o nome de exibição.
 *
 * Verificado ao vivo (single request por board, mantidos só HTTP 200 + jobs > 0).
 * PRUNED (sem vagas ativas no momento): mercury, vercel.
 */
const ASHBY_COMPANIES = [
  { board: 'openai', name: 'OpenAI' },
  { board: 'ramp', name: 'Ramp' },
  { board: 'linear', name: 'Linear' },
  { board: 'runway', name: 'Runway' },
  { board: 'notion', name: 'Notion' },
  { board: 'replit', name: 'Replit' }
];

async function fetchAshbyJobs(boards = ASHBY_COMPANIES) {
  const list = Array.isArray(boards) && boards.length ? boards : ASHBY_COMPANIES;
  console.log(`🟣 Buscando vagas do Ashby (${list.length} empresas)...`);

  let allJobs = [];

  for (const company of list) {
    const board = company && company.board;
    if (!board) continue;
    const name = (company && company.name) || board;

    try {
      const response = await axios.get(
        `https://api.ashbyhq.com/posting-api/job-board/${board}`,
        {
          params: { includeCompensation: 'true' },
          headers: { 'User-Agent': 'Recrutador/1.0' },
          timeout: 15000
        }
      );

      const jobs = (response.data && response.data.jobs) || [];
      allJobs = allJobs.concat(jobs.map(job => ({
        external_id: `${board}-${job.id}`,
        source: 'ashby',
        title: job.title || '',
        description: job.descriptionPlain || '',
        company_name: name,
        logo_url: '',
        location: job.location || 'Remote',
        location_type: job.isRemote ? 'remote' : 'onsite',
        job_type: mapEmploymentType(job.employmentType),
        salary_min: null,
        salary_max: null,
        salary_currency: 'USD',
        category: job.department || job.team || 'Technology',
        tags: [job.department, job.team].filter(Boolean),
        apply_url: job.jobUrl || job.applyUrl || '',
        published_at: job.publishedAt || new Date().toISOString()
      })));
    } catch (err) {
      // 404 / board inexistente / erro de rede - pular empresa
    }
    await new Promise(r => setTimeout(r, 250));
  }

  return allJobs;
}

function mapEmploymentType(type) {
  if (!type) return 'full-time';
  const t = String(type).toLowerCase();
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract')) return 'contract';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

module.exports = { fetchAshbyJobs, ASHBY_COMPANIES };
