/**
 * PREVIEW - Busca vagas das APIs gratuitas e salva em JSON
 * Use isso para ver as vagas ANTES de configurar o banco AWS
 * 
 * Execução: node src/preview-jobs.js
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchRemoteOK() {
  console.log('🌍 Buscando RemoteOK...');
  const res = await axios.get('https://remoteok.com/api', {
    headers: { 'User-Agent': 'Recrutador/1.0' }
  });
  return res.data.slice(1).map(job => ({
    source: 'remoteok',
    title: job.position || '',
    company: job.company || '',
    location: job.location || 'Remote',
    type: 'remote',
    salary: job.salary_min ? `${job.salary_min}-${job.salary_max} USD` : 'Não informado',
    tags: job.tags || [],
    url: job.url || `https://remoteok.com/l/${job.id}`,
    date: job.date
  }));
}

async function fetchArbeitnow() {
  console.log('🇪🇺 Buscando Arbeitnow...');
  let allJobs = [];
  for (let page = 1; page <= 3; page++) {
    const res = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
      params: { page }
    });
    const jobs = res.data.data || [];
    if (jobs.length === 0) break;
    allJobs = allJobs.concat(jobs.map(job => ({
      source: 'arbeitnow',
      title: job.title || '',
      company: job.company_name || '',
      location: job.location || '',
      type: job.remote ? 'remote' : 'onsite',
      salary: 'Não informado',
      tags: job.tags || [],
      url: job.url || '',
      date: job.created_at ? new Date(job.created_at * 1000).toISOString() : ''
    })));
  }
  return allJobs;
}

async function fetchTheMuse() {
  console.log('✨ Buscando The Muse...');
  let allJobs = [];
  for (let page = 0; page < 3; page++) {
    const res = await axios.get('https://www.themuse.com/api/public/jobs', {
      params: { page, descending: true }
    });
    const jobs = res.data.results || [];
    if (jobs.length === 0) break;
    allJobs = allJobs.concat(jobs.map(job => ({
      source: 'themuse',
      title: job.name || '',
      company: job.company?.name || '',
      location: (job.locations || []).map(l => l.name).join(', '),
      type: (job.locations || []).some(l => l.name?.toLowerCase().includes('remote')) ? 'remote' : 'onsite',
      salary: 'Não informado',
      tags: (job.categories || []).map(c => c.name),
      url: job.refs?.landing_page || '',
      date: job.publication_date || ''
    })));
  }
  return allJobs;
}

async function fetchRemotive() {
  console.log('🟢 Buscando Remotive...');
  const res = await axios.get('https://remotive.com/api/remote-jobs', {
    headers: { 'User-Agent': 'Recrutador/1.0' }
  });
  const jobs = (res.data && res.data.jobs) || [];
  return jobs.map(job => ({
    source: 'remotive',
    title: job.title || '',
    company: job.company_name || '',
    location: job.candidate_required_location || 'Remote',
    type: 'remote',
    salary: job.salary || 'Não informado',
    tags: Array.isArray(job.tags) ? job.tags : [],
    url: job.url || '',
    date: job.publication_date || ''
  }));
}

async function fetchWorkingNomads() {
  console.log('🧳 Buscando Working Nomads...');
  const res = await axios.get('https://www.workingnomads.com/api/exposed_jobs/', {
    headers: { 'User-Agent': 'Recrutador/1.0' }
  });
  const jobs = Array.isArray(res.data) ? res.data : [];
  return jobs.map(job => ({
    source: 'workingnomads',
    title: job.title || '',
    company: job.company_name || '',
    location: job.location || 'Remote',
    type: 'remote',
    salary: 'Não informado',
    tags: typeof job.tags === 'string'
      ? job.tags.split(',').map(t => t.trim()).filter(Boolean)
      : (Array.isArray(job.tags) ? job.tags : []),
    url: job.url || '',
    date: job.pub_date || ''
  }));
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  🔍 PREVIEW - Vagas Disponíveis nas APIs    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  const allJobs = [];
  
  try {
    const remoteok = await fetchRemoteOK();
    console.log(`  ✅ RemoteOK: ${remoteok.length} vagas`);
    allJobs.push(...remoteok);
  } catch (err) {
    console.error(`  ❌ RemoteOK: ${err.message}`);
  }

  try {
    const arbeitnow = await fetchArbeitnow();
    console.log(`  ✅ Arbeitnow: ${arbeitnow.length} vagas`);
    allJobs.push(...arbeitnow);
  } catch (err) {
    console.error(`  ❌ Arbeitnow: ${err.message}`);
  }

  try {
    const muse = await fetchTheMuse();
    console.log(`  ✅ The Muse: ${muse.length} vagas`);
    allJobs.push(...muse);
  } catch (err) {
    console.error(`  ❌ The Muse: ${err.message}`);
  }

  try {
    const remotive = await fetchRemotive();
    console.log(`  ✅ Remotive: ${remotive.length} vagas`);
    allJobs.push(...remotive);
  } catch (err) {
    console.error(`  ❌ Remotive: ${err.message}`);
  }

  try {
    const workingnomads = await fetchWorkingNomads();
    console.log(`  ✅ Working Nomads: ${workingnomads.length} vagas`);
    allJobs.push(...workingnomads);
  } catch (err) {
    console.error(`  ❌ Working Nomads: ${err.message}`);
  }

  // Salva resultado em JSON
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, 'vagas-preview.json');
  fs.writeFileSync(outputFile, JSON.stringify(allJobs, null, 2), 'utf8');

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`📊 TOTAL: ${allJobs.length} vagas encontradas`);
  console.log(`💾 Salvo em: public/data/vagas-preview.json`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
  
  // Mostra amostra
  console.log('📋 AMOSTRA (primeiras 10 vagas):');
  console.log('───────────────────────────────────────────────');
  allJobs.slice(0, 10).forEach((job, i) => {
    console.log(`  ${i + 1}. [${job.source}] ${job.title}`);
    console.log(`     🏢 ${job.company} | 📍 ${job.location} | 💰 ${job.salary}`);
    console.log('');
  });
}

main().catch(err => {
  console.error('💀 Erro:', err.message);
  process.exit(1);
});
