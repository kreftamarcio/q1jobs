/**
 * RECRUTADOR - Frontend Application
 */

const API_BASE = '/api';
let currentPage = 1;
let currentView = 'jobs'; // jobs, companies, stats

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadJobs();
  loadHeaderStats();

  // Enter para buscar
  document.getElementById('search-query').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchJobs();
  });
  document.getElementById('search-location').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchJobs();
  });
});

// Carrega contadores do header e hero em tempo real
async function loadHeaderStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    const data = await response.json();

    const totalJobs = data.total_jobs || 0;
    const totalCompanies = data.total_companies || 0;

    // Header counter
    const headerEl = document.getElementById('header-count');
    if (headerEl) headerEl.textContent = totalJobs.toLocaleString('pt-BR');

    // Hero stats
    const statJobs = document.getElementById('stat-jobs');
    const statCompanies = document.getElementById('stat-companies');
    const statRemote = document.getElementById('stat-remote');
    const statSources = document.getElementById('stat-sources');

    if (statJobs) statJobs.textContent = totalJobs.toLocaleString('pt-BR');
    if (statCompanies) statCompanies.textContent = totalCompanies.toLocaleString('pt-BR');
    if (statSources) statSources.textContent = (data.by_source || []).length || '6';

    // Contar remotas
    const remoteCount = (data.by_location_type || []).find(t => t.location_type === 'remote');
    if (statRemote) statRemote.textContent = remoteCount ? parseInt(remoteCount.count).toLocaleString('pt-BR') : '0';

  } catch (err) {
    // Fallback - conta do JSON local
    try {
      const res = await fetch('/data/vagas-preview.json');
      const jobs = await res.json();
      const headerEl = document.getElementById('header-count');
      if (headerEl) headerEl.textContent = jobs.length.toLocaleString('pt-BR');
      const statJobs = document.getElementById('stat-jobs');
      if (statJobs) statJobs.textContent = jobs.length.toLocaleString('pt-BR');
    } catch (e) {}
  }

  // Atualiza a cada 30 segundos
  setTimeout(loadHeaderStats, 30000);
}

// ============================================
// BUSCA E LISTAGEM DE VAGAS
// ============================================

async function loadJobs(page = 1) {
  currentPage = page;
  const params = buildSearchParams();
  params.set('page', page);

  showLoading('jobs-list');

  try {
    const response = await fetch(`${API_BASE}/jobs?${params.toString()}`);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      renderJobs(data.data);
      renderPagination(data.pagination);
      document.getElementById('results-count').textContent = 
        `${data.pagination.total} vagas encontradas`;
    } else {
      showEmpty('jobs-list', 'Nenhuma vaga encontrada com esses filtros.');
      document.getElementById('results-count').textContent = '0 vagas encontradas';
      document.getElementById('pagination').innerHTML = '';
    }
  } catch (err) {
    // Se a API não está conectada ao banco, usa dados locais
    console.warn('API indisponível, carregando preview local...');
    await loadLocalPreview();
  }
}

async function loadLocalPreview() {
  try {
    const response = await fetch('/data/vagas-preview.json');
    const jobs = await response.json();

    const query = document.getElementById('search-query').value.toLowerCase();
    const location = document.getElementById('search-location').value.toLowerCase();
    const type = document.getElementById('filter-type').value;
    const source = document.getElementById('filter-source').value;

    let filtered = jobs;
    if (query) {
      filtered = filtered.filter(j => 
        j.title.toLowerCase().includes(query) || 
        j.company.toLowerCase().includes(query)
      );
    }
    if (location) {
      filtered = filtered.filter(j => j.location.toLowerCase().includes(location));
    }
    if (type) {
      filtered = filtered.filter(j => j.type === type);
    }
    if (source) {
      filtered = filtered.filter(j => j.source === source);
    }

    const pageSize = 20;
    const start = (currentPage - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    renderLocalJobs(paged);
    renderPagination({
      page: currentPage,
      limit: pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize),
      hasNext: start + pageSize < filtered.length,
      hasPrev: currentPage > 1
    });
    document.getElementById('results-count').textContent = 
      `${filtered.length} vagas encontradas (modo offline)`;
  } catch (err) {
    showEmpty('jobs-list', 'Execute "node src/preview-jobs.js" para carregar as vagas.');
  }
}

function searchJobs() {
  currentPage = 1;
  loadJobs(1);
}

function quickSearch(term) {
  document.getElementById('search-query').value = term;
  searchJobs();
}

function filterRemote(type) {
  document.getElementById('filter-type').value = type;
  document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('chip-active'));
  const evt = window.event;
  if (evt && evt.target) evt.target.classList.add('chip-active');
  searchJobs();
}

function clearFilters() {
  document.getElementById('search-query').value = '';
  document.getElementById('search-location').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-job-type').value = '';
  document.getElementById('filter-source').value = '';
  document.getElementById('sort-by').value = 'published_at';
  searchJobs();
}

function buildSearchParams() {
  const params = new URLSearchParams();
  const query = document.getElementById('search-query').value;
  const location = document.getElementById('search-location').value;
  const type = document.getElementById('filter-type').value;
  const jobType = document.getElementById('filter-job-type').value;
  const source = document.getElementById('filter-source').value;
  const sort = document.getElementById('sort-by').value;

  if (query) params.set('q', query);
  if (location) params.set('location', location);
  if (type) params.set('type', type);
  if (jobType) params.set('job_type', jobType);
  if (source) params.set('source', source);
  if (sort) params.set('sort', sort);
  params.set('limit', '20');

  return params;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderJobs(jobs) {
  const container = document.getElementById('jobs-list');
  container.innerHTML = jobs.map(job => `
    <article class="job-card" onclick="openJobDetail(${job.id})" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHtml(job.title)}">
      <div class="job-card-header">
        <div>
          <h3 class="job-card-title">${escapeHtml(job.title)}</h3>
          <p class="job-card-company">🏢 ${escapeHtml(job.company_name || 'Empresa não informada')}</p>
        </div>
        <span class="job-card-source source-${job.source}">${job.source}</span>
      </div>
      <div class="job-card-meta">
        <span class="job-meta-item">📍 ${escapeHtml(job.location || 'Não informado')}</span>
        <span class="job-meta-item badge-${job.location_type}">${formatLocationType(job.location_type)}</span>
        <span class="job-meta-item">📋 ${formatJobType(job.job_type)}</span>
        ${job.salary_max ? `<span class="job-meta-item">💰 ${formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>` : ''}
        <span class="job-meta-item">🕐 ${formatDate(job.published_at)}</span>
      </div>
      ${job.tags && job.tags.length > 0 ? `
        <div class="job-card-tags">
          ${job.tags.slice(0, 5).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </article>
  `).join('');
}

function renderLocalJobs(jobs) {
  const container = document.getElementById('jobs-list');
  container.innerHTML = jobs.map((job, index) => `
    <article class="job-card" onclick="openLocalJobDetail(${index})" tabindex="0" role="button">
      <div class="job-card-header">
        <div>
          <h3 class="job-card-title">${escapeHtml(job.title)}</h3>
          <p class="job-card-company">🏢 ${escapeHtml(job.company || 'Empresa não informada')}</p>
        </div>
        <span class="job-card-source source-${job.source}">${job.source}</span>
      </div>
      <div class="job-card-meta">
        <span class="job-meta-item">📍 ${escapeHtml(job.location || 'Não informado')}</span>
        <span class="job-meta-item badge-${job.type}">${formatLocationType(job.type)}</span>
        <span class="job-meta-item">💰 ${job.salary || 'Não informado'}</span>
        ${job.date ? `<span class="job-meta-item">🕐 ${formatDate(job.date)}</span>` : ''}
      </div>
      ${job.tags && job.tags.length > 0 ? `
        <div class="job-card-tags">
          ${job.tags.slice(0, 5).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </article>
  `).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button ${!pagination.hasPrev ? 'disabled' : ''} onclick="loadJobs(${pagination.page - 1})">← Anterior</button>`;

  const start = Math.max(1, pagination.page - 2);
  const end = Math.min(pagination.totalPages, pagination.page + 2);

  if (start > 1) {
    html += `<button onclick="loadJobs(1)">1</button>`;
    if (start > 2) html += `<span style="padding: 8px">...</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadJobs(${i})">${i}</button>`;
  }

  if (end < pagination.totalPages) {
    if (end < pagination.totalPages - 1) html += `<span style="padding: 8px">...</span>`;
    html += `<button onclick="loadJobs(${pagination.totalPages})">${pagination.totalPages}</button>`;
  }

  html += `<button ${!pagination.hasNext ? 'disabled' : ''} onclick="loadJobs(${pagination.page + 1})">Próxima →</button>`;

  container.innerHTML = html;
}

// ============================================
// DETALHE DA VAGA (Modal)
// ============================================

async function openJobDetail(id) {
  try {
    const response = await fetch(`${API_BASE}/jobs/${id}`);
    const data = await response.json();
    const job = data.data;

    document.getElementById('modal-body').innerHTML = `
      <h2 class="modal-title" id="modal-title">${escapeHtml(job.title)}</h2>
      <p class="modal-company">🏢 ${escapeHtml(job.company_name || '')} • 📍 ${escapeHtml(job.location || '')}</p>
      
      <div class="job-card-meta" style="margin: 16px 0;">
        <span class="job-meta-item badge-${job.location_type}">${formatLocationType(job.location_type)}</span>
        <span class="job-meta-item">📋 ${formatJobType(job.job_type)}</span>
        ${job.salary_max ? `<span class="job-meta-item">💰 ${formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>` : ''}
        <span class="job-meta-item">🕐 ${formatDate(job.published_at)}</span>
      </div>

      ${job.tags && job.tags.length > 0 ? `
        <div class="job-card-tags" style="margin: 16px 0;">
          ${job.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}

      <div class="modal-description">${job.description ? sanitizeHtml(job.description) : 'Descrição não disponível.'}</div>

      ${safeUrl(job.apply_url) ? `<a href="${escapeHtml(safeUrl(job.apply_url))}" target="_blank" rel="noopener noreferrer" class="modal-apply">Candidatar-se →</a>` : ''}
    `;

    document.getElementById('job-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Erro ao abrir detalhe:', err);
  }
}

function openLocalJobDetail(index) {
  // Para modo offline, abre direto a URL
  fetch('/data/vagas-preview.json')
    .then(r => r.json())
    .then(jobs => {
      const job = jobs[index];
      if (job && safeUrl(job.url)) {
        window.open(safeUrl(job.url), '_blank', 'noopener');
      }
    });
}

function closeModal() {
  document.getElementById('job-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ============================================
// EMPRESAS
// ============================================

function showCompanies(event) {
  event.preventDefault();
  currentView = 'companies';
  updateNav('empresas');
  
  document.querySelector('.hero').style.display = 'none';
  document.querySelector('.filters-section').style.display = 'none';
  document.getElementById('jobs-list').classList.add('hidden');
  document.getElementById('pagination').classList.add('hidden');
  document.querySelector('.results-header').classList.add('hidden');
  document.getElementById('stats-section').classList.add('hidden');
  document.getElementById('companies-section').classList.remove('hidden');

  loadCompanies();
}

async function loadCompanies() {
  try {
    const response = await fetch(`${API_BASE}/companies`);
    const data = await response.json();

    const container = document.getElementById('companies-list');
    if (data.data && data.data.length > 0) {
      container.innerHTML = data.data.map(company => `
        <div class="company-card">
          <h3 class="company-name">${escapeHtml(company.name)}</h3>
          ${company.industry ? `<p style="color: var(--gray-500); margin-bottom: 8px;">${escapeHtml(company.industry)}</p>` : ''}
          <p class="company-jobs-count">${company.active_jobs} vagas ativas</p>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏢</div><p>Nenhuma empresa cadastrada ainda.</p></div>';
    }
  } catch (err) {
    document.getElementById('companies-list').innerHTML = '<div class="empty-state"><p>Conecte o banco de dados para ver empresas.</p></div>';
  }
}

// ============================================
// STATS / DASHBOARD
// ============================================

function showStats(event) {
  event.preventDefault();
  currentView = 'stats';
  updateNav('stats');

  document.querySelector('.hero').style.display = 'none';
  document.querySelector('.filters-section').style.display = 'none';
  document.getElementById('jobs-list').classList.add('hidden');
  document.getElementById('pagination').classList.add('hidden');
  document.querySelector('.results-header').classList.add('hidden');
  document.getElementById('companies-section').classList.add('hidden');
  document.getElementById('stats-section').classList.remove('hidden');

  loadStats();
}

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    const data = await response.json();

    document.getElementById('stats-content').innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${data.total_jobs.toLocaleString()}</div>
        <div class="stat-label">Vagas Ativas</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${data.total_companies.toLocaleString()}</div>
        <div class="stat-label">Empresas</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${data.by_source.length}</div>
        <div class="stat-label">Fontes Integradas</div>
      </div>
      ${data.by_source.map(s => `
        <div class="stat-card">
          <div class="stat-number">${parseInt(s.count).toLocaleString()}</div>
          <div class="stat-label">${s.source}</div>
        </div>
      `).join('')}
      ${data.by_location_type.map(s => `
        <div class="stat-card">
          <div class="stat-number">${parseInt(s.count).toLocaleString()}</div>
          <div class="stat-label">${formatLocationType(s.location_type)}</div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    document.getElementById('stats-content').innerHTML = '<div class="empty-state"><p>Conecte o banco de dados para ver estatísticas.</p></div>';
  }
}

// ============================================
// NAVEGAÇÃO
// ============================================

function updateNav(active) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.toLowerCase().includes(active)) {
      link.classList.add('active');
    }
  });
}

// Voltar para vagas ao clicar em "Vagas"
document.addEventListener('click', (e) => {
  if (e.target.matches('.nav-link') && e.target.getAttribute('href') === '/') {
    e.preventDefault();
    currentView = 'jobs';
    updateNav('vagas');
    
    document.querySelector('.hero').style.display = '';
    document.querySelector('.filters-section').style.display = '';
    document.getElementById('jobs-list').classList.remove('hidden');
    document.getElementById('pagination').classList.remove('hidden');
    document.querySelector('.results-header').classList.remove('hidden');
    document.getElementById('companies-section').classList.add('hidden');
    document.getElementById('stats-section').classList.add('hidden');

    loadJobs(1);
  }
});

// ============================================
// UTILITÁRIOS
// ============================================

function formatLocationType(type) {
  const map = { remote: '🏠 Remoto', hybrid: '🔀 Híbrido', onsite: '🏢 Presencial' };
  return map[type] || type || 'Não informado';
}

function formatJobType(type) {
  const map = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contrato',
    'freelance': 'Freelance',
    'internship': 'Estágio'
  };
  return map[type] || type || 'Não informado';
}

function formatSalary(min, max, currency) {
  const curr = currency || 'USD';
  if (min && max) return `${curr} ${formatNumber(min)} - ${formatNumber(max)}`;
  if (max) return `Até ${curr} ${formatNumber(max)}`;
  if (min) return `A partir de ${curr} ${formatNumber(min)}`;
  return 'Não informado';
}

function formatNumber(num) {
  return new Intl.NumberFormat('pt-BR').format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff} dias atrás`;
  if (diff < 30) return `${Math.floor(diff / 7)} semanas atrás`;
  return date.toLocaleDateString('pt-BR');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeHtml(html) {
  if (!html) return '';
  return (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(html) : escapeHtml(html);
}

function safeUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  return /^https?:\/\//i.test(u) ? u : '';
}

function showLoading(containerId) {
  document.getElementById(containerId).innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p style="margin-top: 16px;">Carregando vagas...</p>
    </div>
  `;
}

function showEmpty(containerId, message) {
  document.getElementById(containerId).innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <p>${message}</p>
    </div>
  `;
}
