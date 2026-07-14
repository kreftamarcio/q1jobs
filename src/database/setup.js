const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false } // AWS RDS requer SSL
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    const client = await pool.connect();
    
    console.log('📄 Executando schema...');
    const schema = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );
    await client.query(schema);
    
    console.log('✅ Banco de dados configurado com sucesso!');
    client.release();
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
