const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const supabase = require('./database/supabase');
const jobsRouter = require('./api/routes/jobs');
const companiesRouter = require('./api/routes/companies');
const statsRouter = require('./api/routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// Segurança
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' }
}));

// Servir frontend estático
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rotas da API
app.use('/api/jobs', jobsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: supabase ? 'supabase' : 'offline',
    timestamp: new Date().toISOString()
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║  🚀 Q1Jobs rodando na porta ${PORT}              ║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  🌐 Frontend: http://localhost:${PORT}          ║`);
  console.log(`║  📡 API:      http://localhost:${PORT}/api      ║`);
  console.log(`║  💾 Modo:     ${supabase ? 'Supabase ✅' : 'Offline (JSON) ⚡'}       ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
