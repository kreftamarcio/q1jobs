/**
 * BUSCA ESPECÍFICA - Jornalista / Assessor de Imprensa / Comunicação (REMOTO)
 *
 * Busca em todas as fontes disponíveis (Adzuna, Jooble, Reed, Jobicy, RemoteOK,
 * Arbeitnow) por termos de jornalismo/comunicação e filtra apenas vagas remotas.
 *
 * Execução: node src/buscar-jornalismo.js
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { fetchAdzunaJobs } = require('./providers/adzuna');
const { fetchJoobleJobs } = require('./providers/jooble');
const { fetchReedJobs } = require('./providers/reed');
const { fetchJobicyJobs } = require('./providers/jobicy');

// Termos de busca (PT + EN) para jornalismo / assessoria de imprensa / comunicação
const TERMOS_PT = [
  'jornalista', 'assessor de imprensa', 'assessoria de imprensa',
  'comunicação', 'analista de comunicação', 'redator', 'jornalismo'
];
const TERMOS_EN = [
  'journalist', 'press officer', 'press relations', 'public relations',
  'media relations', 'communications', 'PR specialist', 'content writer', 'copywriter'
];

// Regex para confirmar relevância no título/descrição/tags
const RE_RELEVANTE = /journalis|jornalis|press|imprensa|public relations|media relations|\bPR\b|assessor|comunica|copywriter|content writer|redator|reporter|editor|newsroom/i;

function ehRemoto(job) {
  const lt = (job.location_type || '').toLowerCase();
  if (lt === 'remote') return true;
  const loc = (job.location || '').toLowerCase();
  const txt = ((job.title || '') + ' ' + (job.description || '')).toLowerCase();
  return loc.includes('remote') || loc.includes('remoto') || loc.includes('anywhere') ||
         txt.includes('100% remote') || txt.includes('fully remote') || txt.includes('trabalho remoto');
}

function ehRelevante(job) {
  const campo = (job.title || '') + ' ' + (job.description || '') + ' ' + (job.tags || []).join(' ');
  return RE_RELEVANTE.test(campo);
}

function dedupe(jobs) {
  return [...new Map(jobs.map(j => [(j.external_id || '') + j.source, j])).values()];
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🗞️  BUSCA: Jornalista / Assessor de Imprensa (REMOTO)  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let todas = [];

  // ─── ADZUNA (BR + global) ───
  try {
    const paises = ['br', 'us', 'gb', 'pt'];
    for (const pais of paises) {
      const termos = pais === 'br' || pais === 'pt' ? TERMOS_PT : TERMOS_EN;
      for (const termo of termos) {
        try {
          const jobs = await fetchAdzunaJobs(pais, 1, termo);
          todas = todas.concat(jobs);
        } catch (e) {}
        await new Promise(r => setTimeout(r, 250));
      }
    }
    console.log(`  ✅ Adzuna: ${todas.filter(j => j.source === 'adzuna').length} brutas`);
  } catch (err) { console.error('  ❌ Adzuna:', err.message); }

  // ─── JOOBLE (global, ótimo p/ BR) ───
  try {
    const antes = todas.length;
    for (const termo of [...TERMOS_PT, ...TERMOS_EN]) {
      try {
        const jobs = await fetchJoobleJobs(termo, '');
        todas = todas.concat(jobs);
      } catch (e) {}
      await new Promise(r => setTimeout(r, 400));
    }
    console.log(`  ✅ Jooble: ${todas.length - antes} brutas`);
  } catch (err) { console.error('  ❌ Jooble:', err.message); }

  // ─── REED (UK) ───
  try {
    const antes = todas.length;
    for (const termo of TERMOS_EN) {
      try {
        const jobs = await fetchReedJobs(termo, 1);
        todas = todas.concat(jobs);
      } catch (e) {}
      await new Promise(r => setTimeout(r, 250));
    }
    console.log(`  ✅ Reed: ${todas.length - antes} brutas`);
  } catch (err) { console.error('  ❌ Reed:', err.message); }

  // ─── JOBICY (remoto, sem chave) ───
  try {
    const antes = todas.length;
    const tags = ['', 'copywriting', 'marketing', 'business'];
    for (const tag of tags) {
      try {
        const jobs = await fetchJobicyJobs(50, tag);
        todas = todas.concat(jobs);
      } catch (e) {}
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`  ✅ Jobicy: ${todas.length - antes} brutas`);
  } catch (err) { console.error('  ❌ Jobicy:', err.message); }

  // ─── REMOTEOK (remoto, sem chave) ───
  try {
    const antes = todas.length;
    const res = await axios.get('https://remoteok.com/api', { headers: { 'User-Agent': 'Recrutador/1.0' } });
    const jobs = res.data.slice(1).map(job => ({
      external_id: String(job.id), source: 'remoteok',
      title: job.position || '', description: job.description || '',
      company_name: job.company || '', location: job.location || 'Remote',
      location_type: 'remote', tags: job.tags || [],
      apply_url: job.url || `https://remoteok.com/l/${job.id}`,
      published_at: job.date || ''
    }));
    todas = todas.concat(jobs);
    console.log(`  ✅ RemoteOK: ${todas.length - antes} brutas`);
  } catch (err) { console.error('  ❌ RemoteOK:', err.message); }

  // ─── ARBEITNOW (Europa, sem chave) ───
  try {
    const antes = todas.length;
    for (let page = 1; page <= 5; page++) {
      const res = await axios.get('https://www.arbeitnow.com/api/job-board-api', { params: { page } });
      const jobs = (res.data.data || []).map(job => ({
        external_id: String(job.slug), source: 'arbeitnow',
        title: job.title || '', description: job.description || '',
        company_name: job.company_name || '', location: job.location || '',
        location_type: job.remote ? 'remote' : 'onsite', tags: job.tags || [],
        apply_url: job.url || '',
        published_at: job.created_at ? new Date(job.created_at * 1000).toISOString() : ''
      }));
      if (jobs.length === 0) break;
      todas = todas.concat(jobs);
    }
    console.log(`  ✅ Arbeitnow: ${todas.length - antes} brutas`);
  } catch (err) { console.error('  ❌ Arbeitnow:', err.message); }

  // ─── FILTRAGEM ───
  const unicas = dedupe(todas);
  const relevantes = unicas.filter(ehRelevante);
  const remotas = relevantes.filter(ehRemoto);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  📦 Total bruto coletado:       ${unicas.length}`);
  console.log(`  🎯 Relevantes (jornalismo):    ${relevantes.length}`);
  console.log(`  🏠 Remotas + relevantes:       ${remotas.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Salva resultado
  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'vagas-jornalismo.json');
  fs.writeFileSync(outFile, JSON.stringify(remotas, null, 2), 'utf8');
  console.log(`  💾 Salvo em: data/vagas-jornalismo.json\n`);

  // Lista
  console.log('📋 VAGAS ENCONTRADAS:');
  console.log('───────────────────────────────────────────────────────────');
  remotas.forEach((j, i) => {
    console.log(`  ${i + 1}. [${j.source}] ${j.title}`);
    console.log(`     🏢 ${j.company_name || '—'} | 📍 ${j.location || 'Remote'}`);
    console.log(`     🔗 ${j.apply_url || '—'}`);
    console.log('');
  });
}

main().catch(err => { console.error('💀 Erro:', err.message); process.exit(1); });
