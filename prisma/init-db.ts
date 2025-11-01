import { config } from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

const dbUrl = process.env.DATABASE_URL || '';
// Remove quotes if present
const cleanDbUrl = dbUrl.replace(/^["']|["']$/g, '');

if (!cleanDbUrl) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    // Read and execute schema SQL
    const schemaPath = path.join(process.cwd(), 'src/lib/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('📋 Creating database tables...');
    await client.query(schemaSQL);
    console.log('✅ Database tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase()
  .then(() => {
    console.log('✅ Database initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  });

