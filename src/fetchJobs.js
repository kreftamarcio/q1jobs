const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { fetchRemoteOKJobs } = require('./providers/remoteok');
const { fetchArbeitnowJobs } = require('./providers/arbeitnow');
const { fetchAdzunaJobs } = require('./providers/adzuna');
const { fetchJoobleJobs } = require('./providers/jooble');
const { fetchReedJobs } = require('./providers/reed');
const { fetchMuseJobs } = require('./providers/themuse');
const { fetchHimalayasJobs, fetchHimalayasSearch } = require('./providers/himalayas');
const { fetchJobicyJobs } = require('./providers/jobicy');
const { fetchWeWorkRemotelyJobs } = require('./providers/weworkremotely');
const { fetchFindworkJobs } = require('./providers/findwork');
const { fetchRemotiveJobs } = require('./providers/remotive');
const { fetchWorkingNomadsJobs } = require('./providers/workingnomads');
const { fetchGreenhouseJobs } = require('./providers/greenhouse');
const { fetchLeverJobs } = require('./providers/lever');
const { fetchAshbyJobs } = require('./providers/ashby');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function upsertJobs(jobs) {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < jobs.length; i += 50) {
    const batch = jobs.slice(i, i + 50).map(job => ({
      external_id: job.external_id,
      source: job.source,
      title: job.title,
      description: job.description || null,
      company_name: job.company_name || null,
      location: job.location || null,
      location_type: job.location_type || 'onsite',
      job_type: job.job_type || 'full-time',
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      salary_currency: job.salary_currency || 'USD',
      category: job.category || null,
      tags: job.tags || [],
      apply_url: job.apply_url || null,
      is_active: true,
      published_at: job.published_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('jobs')
      .upsert(batch, { onConflict: 'source,external_id', ignoreDuplicates: false });

    if (error) {
      errors += batch.length;
      if (errors <= 5) console.error(`  ❌ Erro:`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  return { inserted, errors };
}

async function logImport(source, stats, status = 'completed') {
  await supabase.from('import_logs').insert({
    source, jobs_fetched: stats.fetched || 0, jobs_inserted: stats.inserted || 0,
    errors: stats.errors || 0, finished_at: new Date().toISOString(), status
  });
}

function dedupe(jobs) {
  return [...new Map(jobs.map(j => [j.external_id + j.source, j])).values()];
}

async function fetchAllJobs() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🚀 RECRUTADOR - Importação GLOBAL                       ║');
  console.log('║  🎯 Foco: Tech + Remote + IA (Mundo inteiro)             ║');
  console.log('║  📦 Destino: Supabase                                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {};

  // ═══════════════════════════════════════════
  // 1. REMOTEOK (global, 100% remote)
  // ═══════════════════════════════════════════
  try {
    const jobs = await fetchRemoteOKJobs();
    console.log(`  ✅ RemoteOK: ${jobs.length} vagas`);
    const stats = await upsertJobs(jobs);
    results.remoteok = { fetched: jobs.length, ...stats };
  } catch (err) { console.error(`  ❌ RemoteOK:`, err.message); }

  // ═══════════════════════════════════════════
  // 2. ARBEITNOW (Europa, muitas remotas)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    for (let page = 1; page <= 10; page++) {
      const jobs = await fetchArbeitnowJobs(page);
      if (jobs.length === 0) break;
      allJobs = allJobs.concat(jobs);
    }
    console.log(`  ✅ Arbeitnow: ${allJobs.length} vagas`);
    const stats = await upsertJobs(allJobs);
    results.arbeitnow = { fetched: allJobs.length, ...stats };
  } catch (err) { console.error(`  ❌ Arbeitnow:`, err.message); }

  // ═══════════════════════════════════════════
  // 3. HIMALAYAS (remote-first, tech)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    // Páginas gerais
    for (let page = 1; page <= 5; page++) {
      const jobs = await fetchHimalayasJobs(page);
      if (jobs.length === 0) break;
      allJobs = allJobs.concat(jobs);
      await new Promise(r => setTimeout(r, 300));
    }
    // Busca por termos tech/IA
    const techTerms = ['developer', 'engineer', 'AI', 'machine learning', 'data', 'devops', 'frontend', 'backend', 'fullstack', 'python', 'react'];
    for (const term of techTerms) {
      const jobs = await fetchHimalayasSearch(term, 1);
      allJobs = allJobs.concat(jobs);
      await new Promise(r => setTimeout(r, 300));
    }
    const unique = dedupe(allJobs);
    console.log(`  ✅ Himalayas: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.himalayas = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Himalayas:`, err.message); }

  // ═══════════════════════════════════════════
  // 4. JOBICY (remote, global)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    const tags = ['', 'software-development', 'data-science', 'devops', 'machine-learning', 'frontend', 'backend', 'cloud', 'ai', 'cybersecurity'];
    for (const tag of tags) {
      const jobs = await fetchJobicyJobs(50, tag);
      allJobs = allJobs.concat(jobs);
      await new Promise(r => setTimeout(r, 500));
    }
    const unique = dedupe(allJobs);
    console.log(`  ✅ Jobicy: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.jobicy = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Jobicy:`, err.message); }

  // ═══════════════════════════════════════════
  // 5. WE WORK REMOTELY (premium remote jobs)
  // ═══════════════════════════════════════════
  try {
    const jobs = await fetchWeWorkRemotelyJobs();
    if (jobs.length > 0) {
      console.log(`  ✅ We Work Remotely: ${jobs.length} vagas`);
      const stats = await upsertJobs(jobs);
      results.weworkremotely = { fetched: jobs.length, ...stats };
    }
  } catch (err) { console.error(`  ❌ We Work Remotely:`, err.message); }

  // ═══════════════════════════════════════════
  // 6. ADZUNA (6 países, tech + IA + remote)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    const countries = ['br', 'us', 'gb', 'de', 'ca', 'au', 'fr', 'nl', 'in', 'sg'];
    const queries = [
      'remote developer', 'remote software engineer', 'remote AI',
      'remote machine learning', 'remote data scientist', 'remote devops',
      'remote frontend', 'remote backend', 'remote fullstack',
      'remote cloud engineer', 'remote python', 'remote javascript'
    ];

    for (const country of countries) {
      for (const query of queries) {
        try {
          const jobs = await fetchAdzunaJobs(country, 1, query);
          allJobs = allJobs.concat(jobs);
        } catch (e) {}
        await new Promise(r => setTimeout(r, 250));
      }
    }
    const unique = dedupe(allJobs);
    console.log(`  ✅ Adzuna (${countries.length} países): ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.adzuna = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Adzuna:`, err.message); }

  // ═══════════════════════════════════════════
  // 7. JOOBLE (agregador global)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    const searches = [
      'remote software developer', 'remote frontend', 'remote backend',
      'remote fullstack', 'remote machine learning', 'remote AI engineer',
      'remote data engineer', 'remote data scientist', 'remote devops',
      'remote cloud', 'remote react', 'remote python', 'remote java',
      'remote node.js', 'remote typescript', 'remote golang',
      'remote kubernetes', 'remote AWS', 'remote cybersecurity'
    ];
    for (const keyword of searches) {
      try {
        const jobs = await fetchJoobleJobs(keyword, '');
        allJobs = allJobs.concat(jobs);
      } catch (e) {}
      await new Promise(r => setTimeout(r, 400));
    }
    const unique = dedupe(allJobs);
    console.log(`  ✅ Jooble: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.jooble = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Jooble:`, err.message); }

  // ═══════════════════════════════════════════
  // 8. REED (UK, tech + remote)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    const searches = [
      'remote software developer', 'remote frontend', 'remote backend',
      'remote AI', 'remote machine learning', 'remote data scientist',
      'remote devops', 'remote cloud', 'remote python', 'remote javascript',
      'remote react', 'remote java', 'remote node.js', 'remote cybersecurity'
    ];
    for (const keyword of searches) {
      try {
        const jobs = await fetchReedJobs(keyword, 1);
        allJobs = allJobs.concat(jobs);
      } catch (e) {}
      await new Promise(r => setTimeout(r, 250));
    }
    const unique = dedupe(allJobs);
    console.log(`  ✅ Reed: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.reed = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Reed:`, err.message); }

  // ═══════════════════════════════════════════
  // 9. THE MUSE (US, global tech companies)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    const categories = ['Software Engineering', 'Data Science', 'IT', 'Design and UX', 'Product Management'];
    for (const category of categories) {
      for (let page = 0; page < 10; page++) {
        try {
          const jobs = await fetchMuseJobs(page, category);
          if (jobs.length === 0) break;
          allJobs = allJobs.concat(jobs);
        } catch (e) { break; }
        await new Promise(r => setTimeout(r, 300));
      }
    }
    const unique = dedupe(allJobs);
    console.log(`  ✅ The Muse: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.muse = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ The Muse:`, err.message); }

  // ═══════════════════════════════════════════
  // 10. FINDWORK (dev-focused)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    for (let page = 1; page <= 5; page++) {
      const jobs = await fetchFindworkJobs(page);
      if (jobs.length === 0) break;
      allJobs = allJobs.concat(jobs);
      await new Promise(r => setTimeout(r, 300));
    }
    if (allJobs.length > 0) {
      console.log(`  ✅ Findwork: ${allJobs.length} vagas`);
      const stats = await upsertJobs(allJobs);
      results.findwork = { fetched: allJobs.length, ...stats };
    }
  } catch (err) {
    if (!err.message.includes('API key')) console.error(`  ❌ Findwork:`, err.message);
  }

  // ═══════════════════════════════════════════
  // 11. REMOTIVE (remote, global, sem key)
  // ═══════════════════════════════════════════
  try {
    let allJobs = [];
    const searches = ['', 'software', 'data', 'devops', 'frontend', 'backend', 'machine learning', 'product', 'design'];
    for (const search of searches) {
      try {
        const jobs = await fetchRemotiveJobs(search);
        allJobs = allJobs.concat(jobs);
      } catch (e) {}
      await new Promise(r => setTimeout(r, 400));
    }
    const unique = dedupe(allJobs);
    console.log(`  ✅ Remotive: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.remotive = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Remotive:`, err.message); }

  // ═══════════════════════════════════════════
  // 12. WORKING NOMADS (remote, global, sem key)
  // ═══════════════════════════════════════════
  try {
    const jobs = await fetchWorkingNomadsJobs();
    if (jobs.length > 0) {
      console.log(`  ✅ Working Nomads: ${jobs.length} vagas`);
      const stats = await upsertJobs(jobs);
      results.workingnomads = { fetched: jobs.length, ...stats };
    }
  } catch (err) { console.error(`  ❌ Working Nomads:`, err.message); }

  // ═══════════════════════════════════════════
  // 13. GREENHOUSE (ATS, vagas direto das empresas)
  // ═══════════════════════════════════════════
  try {
    const jobs = await fetchGreenhouseJobs();
    const unique = dedupe(jobs);
    console.log(`  ✅ Greenhouse: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.greenhouse = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Greenhouse:`, err.message); }

  // ═══════════════════════════════════════════
  // 14. LEVER (ATS, vagas direto das empresas)
  // ═══════════════════════════════════════════
  try {
    const jobs = await fetchLeverJobs();
    const unique = dedupe(jobs);
    console.log(`  ✅ Lever: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.lever = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Lever:`, err.message); }

  // ═══════════════════════════════════════════
  // 15. ASHBY (ATS, vagas direto das empresas)
  // ═══════════════════════════════════════════
  try {
    const jobs = await fetchAshbyJobs();
    const unique = dedupe(jobs);
    console.log(`  ✅ Ashby: ${unique.length} vagas únicas`);
    const stats = await upsertJobs(unique);
    results.ashby = { fetched: unique.length, ...stats };
  } catch (err) { console.error(`  ❌ Ashby:`, err.message); }

  // ═══════════════════════════════════════════
  // RESUMO FINAL
  // ═══════════════════════════════════════════
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMO FINAL - IMPORTAÇÃO GLOBAL:');
  console.log('═══════════════════════════════════════════════════════════');
  let totalInserted = 0;
  for (const [source, stats] of Object.entries(results)) {
    if (stats && stats.fetched > 0) {
      console.log(`  ${source.padEnd(16)} ${String(stats.fetched).padStart(6)} buscadas | ${String(stats.inserted).padStart(6)} inseridas | ${stats.errors} erros`);
      totalInserted += stats.inserted;
      await logImport(source, { fetched: stats.fetched, inserted: stats.inserted, errors: stats.errors });
    }
  }
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  🎯 TOTAL INSERIDO NO SUPABASE: ${totalInserted} vagas`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

fetchAllJobs().then(() => process.exit(0)).catch(err => {
  console.error('💀 Erro fatal:', err.message);
  process.exit(1);
});
