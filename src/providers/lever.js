const axios = require('axios');

/**
 * Lever Postings API - Vagas direto das empresas (ATS)
 * Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
 * Não precisa de API key!
 *
 * ✏️  EDITE esta lista para adicionar/remover empresas.
 * Cada item: { slug, name } onde slug é o identificador da empresa no Lever
 * e name é o nome de exibição.
 *
 * Verificado ao vivo (single request por slug, mantidos só HTTP 200 + jobs > 0).
 * PRUNED: plaid (vazio), brex (404), ramp (404), mongodb (404),
 *         netflix (vazio), kayak (404), nubank (404).
 */
const LEVER_COMPANIES = [
  { slug: 'palantir', name: 'Palantir' },
  { slug: 'spotify', name: 'Spotify' }
];

async function fetchLeverJobs(companies = LEVER_COMPANIES) {
  const list = Array.isArray(companies) && companies.length ? companies : LEVER_COMPANIES;
  console.log(`🎚️  Buscando vagas do Lever (${list.length} empresas)...`);

  let allJobs = [];

  for (const company of list) {
    const slug = company && company.slug;
    if (!slug) continue;
    const name = (company && company.name) || slug;

    try {
      const response = await axios.get(
        `https://api.lever.co/v0/postings/${slug}`,
        {
          params: { mode: 'json' },
          headers: { 'User-Agent': 'Recrutador/1.0' },
          timeout: 15000
        }
      );

      const jobs = Array.isArray(response.data) ? response.data : [];
      allJobs = allJobs.concat(jobs.map(job => {
        const categories = job.categories || {};
        const location = categories.location || 'Remote';
        const isRemote = job.workplaceType === 'remote' || /remote/i.test(location);
        return {
          external_id: `${slug}-${job.id}`,
          source: 'lever',
          title: job.text || '',
          description: job.descriptionPlain || job.description || '',
          company_name: name,
          logo_url: '',
          location,
          location_type: isRemote ? 'remote' : 'onsite',
          job_type: mapCommitment(categories.commitment),
          salary_min: null,
          salary_max: null,
          salary_currency: 'USD',
          category: categories.team || 'Technology',
          tags: [categories.team, categories.commitment].filter(Boolean),
          apply_url: job.hostedUrl || job.applyUrl || '',
          published_at: job.createdAt ? new Date(job.createdAt) : new Date()
        };
      }));
    } catch (err) {
      // 404 / slug inexistente / erro de rede - pular empresa
    }
    await new Promise(r => setTimeout(r, 250));
  }

  return allJobs;
}

function mapCommitment(commitment) {
  if (!commitment) return 'full-time';
  const c = String(commitment).toLowerCase();
  if (c.includes('full')) return 'full-time';
  if (c.includes('part')) return 'part-time';
  if (c.includes('contract')) return 'contract';
  if (c.includes('intern')) return 'internship';
  return 'full-time';
}

module.exports = { fetchLeverJobs, LEVER_COMPANIES };
