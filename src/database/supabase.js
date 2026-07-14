const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase conectado:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️  Erro ao conectar Supabase:', err.message);
    console.warn('   Rodando em modo offline (JSON local).');
    supabase = null;
  }
} else {
  console.warn('⚠️  Supabase não configurado. Rodando em modo offline (JSON local).');
}

module.exports = supabase;
