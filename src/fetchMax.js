/**
 * IMPORTAÇÃO MÁXIMA - Extrai o máximo possível de todas as APIs
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { fetchRemoteOKJobs } = require('./providers/remoteok');
const { fetchArbeitnowJobs } = require('./providers/arbeitnow');
const { fetchAdzunaJobs } = require('./providers/adzuna');
const { fetchJoobleJobs } = require('./providers/jooble');
const { fetchReedJobs } = require('./providers/reed');
const { fetchMuseJobs } = require('./providers/themuse');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function upsertJobs(jobs) {
  let inserted = 0, errors = 0;
  for (let i = 0; i < jobs.length; i += 50) {
    const batch = jobs.slice(i, i + 50).map(job => ({
      external_id: job.external_id, source: job.source, title: job.title,
      description: job.description || null, company_name: job.company_name || null,
      location: job.location || null, location_type: job.location_type || 'onsite',
      job_type: job.job_type || 'full-time', salary_min: job.salary_min || null,
      salary_max: job.salary_max || null, salary_currency: job.salary_currency || 'USD',
      category: job.category || null, tags: job.tags || [],
      apply_url: job.apply_url || null, is_active: true,
      published_at: job.published_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    const { error } = await supabase.from('jobs').upsert(batch, { onConflict: 'source,external_id', ignoreDuplicates: false });
    if (error) errors += batch.length;
    else inserted += batch.length;
  }
  return { inserted, errors };
}

function dedupe(jobs) {
  return [...new Map(jobs.map(j => [j.external_id + j.source, j])).values()];
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 IMPORTAÇÃO MÁXIMA - Todas as vagas possíveis            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  let grandTotal = 0;

  // ══════════════════════════════════════
  // ADZUNA - 10 países × 5 páginas × 20+ termos = MILHARES
  // ══════════════════════════════════════
  console.log('📡 [ADZUNA] Extraindo de 10 países...');
  const countries = ['br', 'us', 'gb', 'de', 'ca', 'au', 'fr', 'nl', 'in', 'sg'];
  const adzunaQueries = [
    'developer', 'software engineer', 'frontend', 'backend', 'fullstack',
    'react', 'angular', 'vue', 'node.js', 'python', 'java', 'golang',
    'rust', 'typescript', 'javascript', 'PHP', 'ruby', 'swift', 'kotlin',
    'devops', 'cloud engineer', 'AWS', 'azure', 'kubernetes', 'docker',
    'machine learning', 'artificial intelligence', 'data scientist',
    'data engineer', 'data analyst', 'deep learning', 'NLP',
    'cybersecurity', 'security engineer', 'network engineer',
    'QA engineer', 'test automation', 'mobile developer', 'iOS', 'android',
    'product manager', 'scrum master', 'tech lead', 'CTO',
    'remote developer', 'remote engineer', 'home office tech'
  ];

  let adzunaAll = [];
  for (const country of countries) {
    for (let page = 1; page <= 5; page++) {
      for (const query of adzunaQueries) {
        try {
          const jobs = await fetchAdzunaJobs(country, page, query);
          adzunaAll = adzunaAll.concat(jobs);
        } catch (e) {}
        await delay(150);
      }
    }
    const unique = dedupe(adzunaAll);
    process.stdout.write(`\r  Adzuna ${country.toUpperCase()}: ${unique.length} vagas únicas acumuladas...`);
  }
  const adzunaUnique = dedupe(adzunaAll);
  console.log(`\n  ✅ Adzuna TOTAL: ${adzunaUnique.length} vagas únicas`);
  const adzStats = await upsertJobs(adzunaUnique);
  grandTotal += adzStats.inserted;
  console.log(`     Inseridas: ${adzStats.inserted} | Erros: ${adzStats.errors}`);

  // ══════════════════════════════════════
  // JOOBLE - 40+ termos
  // ══════════════════════════════════════
  console.log('\n📡 [JOOBLE] Extraindo vagas globais...');
  const joobleQueries = [
    'software developer', 'senior developer', 'junior developer',
    'frontend developer', 'backend developer', 'fullstack developer',
    'react developer', 'angular developer', 'vue.js developer',
    'node.js developer', 'python developer', 'java developer',
    'golang developer', 'rust developer', 'C# developer', '.NET developer',
    'PHP developer', 'ruby developer', 'swift developer', 'kotlin developer',
    'mobile developer', 'iOS developer', 'android developer',
    'machine learning engineer', 'AI engineer', 'data scientist',
    'data engineer', 'data analyst', 'deep learning', 'NLP engineer',
    'computer vision', 'MLOps', 'DevOps engineer', 'SRE',
    'cloud architect', 'AWS engineer', 'Azure engineer', 'GCP engineer',
    'kubernetes engineer', 'docker', 'terraform',
    'cybersecurity analyst', 'security engineer', 'penetration tester',
    'QA engineer', 'automation tester', 'SDET',
    'product manager tech', 'engineering manager', 'tech lead', 'CTO',
    'blockchain developer', 'web3 developer', 'smart contract',
    'game developer', 'unity developer', 'unreal engine',
    'embedded systems', 'firmware engineer', 'IoT developer',
    'remote software', 'remote tech', 'work from home developer'
  ];

  let joobleAll = [];
  for (const keyword of joobleQueries) {
    try {
      const jobs = await fetchJoobleJobs(keyword, '');
      joobleAll = joobleAll.concat(jobs);
      process.stdout.write(`\r  Jooble: ${dedupe(joobleAll).length} vagas únicas...`);
    } catch (e) {}
    await delay(350);
  }
  const joobleUnique = dedupe(joobleAll);
  console.log(`\n  ✅ Jooble TOTAL: ${joobleUnique.length} vagas únicas`);
  const joobleStats = await upsertJobs(joobleUnique);
  grandTotal += joobleStats.inserted;
  console.log(`     Inseridas: ${joobleStats.inserted} | Erros: ${joobleStats.errors}`);

  // ══════════════════════════════════════
  // REED - 30+ termos × 3 páginas
  // ══════════════════════════════════════
  console.log('\n📡 [REED] Extraindo vagas UK...');
  const reedQueries = [
    'software developer', 'frontend developer', 'backend developer',
    'fullstack developer', 'react', 'angular', 'vue', 'node.js',
    'python developer', 'java developer', 'C# developer', '.NET',
    'golang', 'rust', 'typescript', 'PHP developer',
    'machine learning', 'artificial intelligence', 'data scientist',
    'data engineer', 'deep learning', 'NLP',
    'devops', 'cloud engineer', 'AWS', 'azure', 'kubernetes',
    'cybersecurity', 'security engineer', 'QA engineer',
    'mobile developer', 'iOS', 'android',
    'product manager', 'tech lead', 'engineering manager',
    'remote developer', 'remote software', 'home working developer'
  ];

  let reedAll = [];
  for (const keyword of reedQueries) {
    for (let page = 1; page <= 3; page++) {
      try {
        const jobs = await fetchReedJobs(keyword, page);
        reedAll = reedAll.concat(jobs);
      } catch (e) {}
      await delay(200);
    }
    process.stdout.write(`\r  Reed: ${dedupe(reedAll).length} vagas únicas...`);
  }
  const reedUnique = dedupe(reedAll);
  console.log(`\n  ✅ Reed TOTAL: ${reedUnique.length} vagas únicas`);
  const reedStats = await upsertJobs(reedUnique);
  grandTotal += reedStats.inserted;
  console.log(`     Inseridas: ${reedStats.inserted} | Erros: ${reedStats.errors}`);

  // ══════════════════════════════════════
  // ARBEITNOW - Todas as páginas disponíveis
  // ══════════════════════════════════════
  console.log('\n📡 [ARBEITNOW] Extraindo todas as páginas...');
  let arbeitnowAll = [];
  for (let page = 1; page <= 20; page++) {
    try {
      const jobs = await fetchArbeitnowJobs(page);
      if (jobs.length === 0) break;
      arbeitnowAll = arbeitnowAll.concat(jobs);
      process.stdout.write(`\r  Arbeitnow: ${arbeitnowAll.length} vagas (página ${page})...`);
    } catch (e) { break; }
    await delay(300);
  }
  console.log(`\n  ✅ Arbeitnow TOTAL: ${arbeitnowAll.length} vagas`);
  const arbStats = await upsertJobs(arbeitnowAll);
  grandTotal += arbStats.inserted;
  console.log(`     Inseridas: ${arbStats.inserted} | Erros: ${arbStats.errors}`);

  // ══════════════════════════════════════
  // THE MUSE - Todas as categorias × 20 páginas
  // ══════════════════════════════════════
  console.log('\n📡 [THE MUSE] Extraindo todas as categorias...');
  const museCategories = [
    'Software Engineering', 'Data Science', 'IT', 'Design and UX',
    'Product Management', 'Project Management', 'Business Operations',
    'Marketing', 'Finance', 'Healthcare', 'Education'
  ];
  let museAll = [];
  for (const category of museCategories) {
    for (let page = 0; page < 20; page++) {
      try {
        const jobs = await fetchMuseJobs(page, category);
        if (jobs.length === 0) break;
        museAll = museAll.concat(jobs);
      } catch (e) { break; }
      await delay(250);
    }
    process.stdout.write(`\r  The Muse: ${dedupe(museAll).length} vagas únicas...`);
  }
  const museUnique = dedupe(museAll);
  console.log(`\n  ✅ The Muse TOTAL: ${museUnique.length} vagas únicas`);
  const museStats = await upsertJobs(museUnique);
  grandTotal += museStats.inserted;
  console.log(`     Inseridas: ${museStats.inserted} | Erros: ${museStats.errors}`);

  // ══════════════════════════════════════
  // REMOTEOK
  // ══════════════════════════════════════
  console.log('\n📡 [REMOTEOK] Extraindo vagas remotas...');
  try {
    const jobs = await fetchRemoteOKJobs();
    console.log(`  ✅ RemoteOK: ${jobs.length} vagas`);
    const stats = await upsertJobs(jobs);
    grandTotal += stats.inserted;
    console.log(`     Inseridas: ${stats.inserted} | Erros: ${stats.errors}`);
  } catch (e) { console.error('  ❌', e.message); }

  // ══════════════════════════════════════
  // RESULTADO FINAL
  // ══════════════════════════════════════
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  🎯 NOVAS VAGAS INSERIDAS NESTA RODADA: ${String(grandTotal).padStart(6)}               ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Total geral no banco
  const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true);
  console.log(`  📊 TOTAL GERAL NO SUPABASE: ${count} vagas`);
  console.log('');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('💀', err.message);
  process.exit(1);
});
