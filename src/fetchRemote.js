/**
 * IMPORTAÇÃO FOCADA EM VAGAS 100% REMOTAS
 */
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const { fetchRemoteOKJobs } = require('./providers/remoteok');
const { fetchArbeitnowJobs } = require('./providers/arbeitnow');
const { fetchAdzunaJobs } = require('./providers/adzuna');
const { fetchJoobleJobs } = require('./providers/jooble');
const { fetchReedJobs } = require('./providers/reed');
const { fetchMuseJobs } = require('./providers/themuse');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const delay = ms => new Promise(r => setTimeout(r, ms));

async function upsertJobs(jobs) {
  let inserted = 0, errors = 0;
  // Força todas como remote
  const remoteJobs = jobs.map(j => ({ ...j, location_type: 'remote' }));
  for (let i = 0; i < remoteJobs.length; i += 50) {
    const batch = remoteJobs.slice(i, i + 50).map(job => ({
      external_id: job.external_id, source: job.source, title: job.title,
      description: job.description || null, company_name: job.company_name || null,
      location: job.location || 'Remote', location_type: 'remote',
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

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🏠 IMPORTAÇÃO EXCLUSIVA - VAGAS REMOTAS DO MUNDO INTEIRO   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  let grandTotal = 0;

  // ═══════════════════════════════════
  // 1. REMOTEOK - 100% remote por natureza
  // ═══════════════════════════════════
  try {
    const jobs = await fetchRemoteOKJobs();
    console.log(`  ✅ RemoteOK: ${jobs.length} vagas remotas`);
    const s = await upsertJobs(jobs);
    grandTotal += s.inserted;
  } catch (e) { console.error('  ❌ RemoteOK:', e.message); }

  // ═══════════════════════════════════
  // 2. ARBEITNOW - Filtrar apenas remotas (20 páginas)
  // ═══════════════════════════════════
  console.log('\n📡 [ARBEITNOW] Filtrando vagas remotas...');
  let arbRemote = [];
  for (let page = 1; page <= 20; page++) {
    try {
      const jobs = await fetchArbeitnowJobs(page);
      if (jobs.length === 0) break;
      const remote = jobs.filter(j => j.location_type === 'remote');
      arbRemote = arbRemote.concat(remote);
      process.stdout.write(`\r  Arbeitnow remotas: ${arbRemote.length} (página ${page})...`);
    } catch (e) { break; }
    await delay(300);
  }
  console.log(`\n  ✅ Arbeitnow: ${arbRemote.length} vagas remotas`);
  const arbS = await upsertJobs(arbRemote);
  grandTotal += arbS.inserted;

  // ═══════════════════════════════════
  // 3. ADZUNA - Busca exclusivamente por "remote" em 10 países
  // ═══════════════════════════════════
  console.log('\n📡 [ADZUNA] Buscando "remote" em 10 países × 5 páginas...');
  const countries = ['us', 'gb', 'de', 'ca', 'au', 'fr', 'nl', 'in', 'sg', 'br'];
  const remoteQueries = [
    'remote', 'work from home', 'home office', 'remote developer',
    'remote software engineer', 'remote frontend', 'remote backend',
    'remote fullstack', 'remote devops', 'remote data scientist',
    'remote machine learning', 'remote AI', 'remote cloud',
    'remote python', 'remote javascript', 'remote react',
    'remote java', 'remote node.js', 'remote golang',
    'remote cybersecurity', 'remote QA', 'remote mobile',
    'telecommute', 'anywhere', 'distributed team'
  ];

  let adzRemote = [];
  for (const country of countries) {
    for (let page = 1; page <= 5; page++) {
      for (const query of remoteQueries) {
        try {
          const jobs = await fetchAdzunaJobs(country, page, query);
          adzRemote = adzRemote.concat(jobs);
        } catch (e) {}
        await delay(150);
      }
    }
    const unique = dedupe(adzRemote);
    console.log(`  Adzuna ${country.toUpperCase()}: ${unique.length} vagas remotas acumuladas`);
  }
  const adzUnique = dedupe(adzRemote);
  console.log(`  ✅ Adzuna TOTAL: ${adzUnique.length} vagas remotas únicas`);
  const adzS = await upsertJobs(adzUnique);
  grandTotal += adzS.inserted;

  // ═══════════════════════════════════
  // 4. JOOBLE - Termos com "remote" explícito
  // ═══════════════════════════════════
  console.log('\n📡 [JOOBLE] Buscando vagas remotas...');
  const joobleRemote = [
    'remote developer', 'remote software engineer', 'remote frontend developer',
    'remote backend developer', 'remote fullstack', 'remote react developer',
    'remote python developer', 'remote java developer', 'remote node.js',
    'remote golang', 'remote rust developer', 'remote typescript',
    'remote devops', 'remote SRE', 'remote cloud engineer',
    'remote AWS', 'remote azure', 'remote kubernetes',
    'remote data scientist', 'remote data engineer', 'remote machine learning',
    'remote AI engineer', 'remote deep learning', 'remote NLP',
    'remote cybersecurity', 'remote security engineer',
    'remote QA engineer', 'remote automation tester',
    'remote mobile developer', 'remote iOS', 'remote android',
    'remote product manager', 'remote tech lead',
    'remote UI designer', 'remote UX designer',
    'work from home developer', 'work from home engineer',
    'telecommute software', 'fully remote tech', 'anywhere developer'
  ];

  let joobleAll = [];
  for (const keyword of joobleRemote) {
    try {
      const jobs = await fetchJoobleJobs(keyword, '');
      joobleAll = joobleAll.concat(jobs);
      process.stdout.write(`\r  Jooble remotas: ${dedupe(joobleAll).length}...`);
    } catch (e) {}
    await delay(350);
  }
  const joobleUnique = dedupe(joobleAll);
  console.log(`\n  ✅ Jooble: ${joobleUnique.length} vagas remotas únicas`);
  const joobleS = await upsertJobs(joobleUnique);
  grandTotal += joobleS.inserted;

  // ═══════════════════════════════════
  // 5. REED - Apenas remote/home working
  // ═══════════════════════════════════
  console.log('\n📡 [REED] Buscando vagas remote UK...');
  const reedRemote = [
    'remote developer', 'remote software', 'remote frontend', 'remote backend',
    'remote devops', 'remote data', 'remote AI', 'remote machine learning',
    'remote python', 'remote javascript', 'remote react', 'remote java',
    'remote cloud', 'remote cybersecurity', 'home working developer',
    'home working software', 'work from home tech', 'fully remote',
    'remote engineer', 'remote architect', 'remote QA'
  ];

  let reedAll = [];
  for (const keyword of reedRemote) {
    for (let page = 1; page <= 3; page++) {
      try {
        const jobs = await fetchReedJobs(keyword, page);
        reedAll = reedAll.concat(jobs);
      } catch (e) {}
      await delay(200);
    }
    process.stdout.write(`\r  Reed remotas: ${dedupe(reedAll).length}...`);
  }
  const reedUnique = dedupe(reedAll);
  console.log(`\n  ✅ Reed: ${reedUnique.length} vagas remotas únicas`);
  const reedS = await upsertJobs(reedUnique);
  grandTotal += reedS.inserted;

  // ═══════════════════════════════════
  // 6. THE MUSE - Filtrar remotas
  // ═══════════════════════════════════
  console.log('\n📡 [THE MUSE] Buscando vagas tech...');
  const museCategories = ['Software Engineering', 'Data Science', 'IT', 'Design and UX', 'Product Management'];
  let museAll = [];
  for (const cat of museCategories) {
    for (let page = 0; page < 15; page++) {
      try {
        const jobs = await fetchMuseJobs(page, cat);
        if (jobs.length === 0) break;
        // Filtra remotas
        const remote = jobs.filter(j => j.location_type === 'remote' || (j.location || '').toLowerCase().includes('remote'));
        museAll = museAll.concat(remote);
      } catch (e) { break; }
      await delay(250);
    }
  }
  const museUnique = dedupe(museAll);
  console.log(`  ✅ The Muse: ${museUnique.length} vagas remotas únicas`);
  const museS = await upsertJobs(museUnique);
  grandTotal += museS.inserted;

  // ═══════════════════════════════════
  // RESULTADO
  // ═══════════════════════════════════
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  🏠 VAGAS REMOTAS INSERIDAS: ${String(grandTotal).padStart(6)}                         ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true);
  console.log(`  📊 TOTAL GERAL NO SUPABASE: ${count} vagas`);

  const { count: remoteCount } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('location_type', 'remote');
  console.log(`  🏠 TOTAL REMOTAS: ${remoteCount} vagas`);
  console.log('');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('💀', err.message);
  process.exit(1);
});
