const axios = require('axios');

/**
 * Greenhouse Job Boards API - Vagas direto das empresas (ATS)
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
 * Não precisa de API key!
 *
 * ✏️  EDITE esta lista para adicionar/remover empresas.
 * Cada item: { token, name } onde token é o board do Greenhouse
 * e name é o nome de exibição da empresa.
 *
 * Verificado ao vivo (single request por token, mantidos só HTTP 200 + jobs > 0).
 * PRUNED (removidos por 404 / sem board ativo): doordash, plaid.
 */
const GREENHOUSE_COMPANIES = [
  { token: 'stripe', name: 'Stripe' },
  { token: 'airbnb', name: 'Airbnb' },
  { token: 'dropbox', name: 'Dropbox' },
  { token: 'coinbase', name: 'Coinbase' },
  { token: 'gitlab', name: 'GitLab' },
  { token: 'figma', name: 'Figma' },
  { token: 'databricks', name: 'Databricks' },
  { token: 'robinhood', name: 'Robinhood' },
  { token: 'instacart', name: 'Instacart' },
  { token: 'reddit', name: 'Reddit' },
  { token: 'lyft', name: 'Lyft' },
  { token: 'pinterest', name: 'Pinterest' },
  { token: 'cloudflare', name: 'Cloudflare' },
  { token: 'discord', name: 'Discord' },
  { token: 'brex', name: 'Brex' },
  { token: 'asana', name: 'Asana' },
  { token: 'twitch', name: 'Twitch' },
  { token: 'sofi', name: 'SoFi' }
];

async function fetchGreenhouseJobs(companies = GREENHOUSE_COMPANIES) {
  const list = Array.isArray(companies) && companies.length ? companies : GREENHOUSE_COMPANIES;
  console.log(`🌱 Buscando vagas do Greenhouse (${list.length} empresas)...`);

  let allJobs = [];

  for (const company of list) {
    const token = company && company.token;
    if (!token) continue;
    const name = (company && company.name) || token;

    try {
      const response = await axios.get(
        `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`,
        {
          params: { content: 'true' },
          headers: { 'User-Agent': 'Recrutador/1.0' },
          timeout: 15000
        }
      );

      const jobs = (response.data && response.data.jobs) || [];
      allJobs = allJobs.concat(jobs.map(job => {
        const location = (job.location && job.location.name) || 'Remote';
        const departments = Array.isArray(job.departments) ? job.departments : [];
        return {
          external_id: `${token}-${job.id}`,
          source: 'greenhouse',
          title: job.title || '',
          description: decodeHtmlEntities(job.content || ''),
          company_name: name,
          logo_url: '',
          location,
          location_type: /remote/i.test(location) ? 'remote' : 'onsite',
          job_type: 'full-time',
          salary_min: null,
          salary_max: null,
          salary_currency: 'USD',
          category: (departments[0] && departments[0].name) || 'Technology',
          tags: departments.map(d => d && d.name).filter(Boolean),
          apply_url: job.absolute_url || '',
          published_at: job.updated_at || new Date().toISOString()
        };
      }));
    } catch (err) {
      // 404 / board inexistente / erro de rede - pular empresa
    }
    await new Promise(r => setTimeout(r, 250));
  }

  return allJobs;
}

// Greenhouse retorna `content` com entidades HTML codificadas
// (frequentemente DUPLA-codificadas, ex.: "&amp;nbsp;").
// Decodifica pelo menos &lt; &gt; &amp; &#39; &quot; (exigência do contrato),
// além de entidades numéricas e algumas nomeadas comuns. &amp; por último para
// não criar entidades novas; 2ª passada só quando ainda restam entidades.
function decodeHtmlEntities(str) {
  if (!str) return '';
  let s = String(str);
  s = decodeOnce(s);
  if (/&(?:amp|lt|gt|quot|apos|nbsp|mdash|ndash|#\d+|#x[0-9a-fA-F]+);/.test(s)) {
    s = decodeOnce(s);
  }
  return s;
}

function decodeOnce(input) {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => fromCodePointSafe(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => fromCodePointSafe(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

function fromCodePointSafe(cp) {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10FFFF) return '';
  try { return String.fromCodePoint(cp); } catch (e) { return ''; }
}

module.exports = { fetchGreenhouseJobs, GREENHOUSE_COMPANIES };
