import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = readFileSync('./drizzle/0006_catalog_schema.sql', 'utf-8');

async function migrate() {
  console.log('Connecting to database...');
  const client = neon(process.env.DATABASE_URL);
  
  console.log('Parsing migration file...');
  
  // Split by semicolons but preserve those in single quotes
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  
  for (const char of sql) {
    if (char === "'" && !inSingleQuote) {
      inSingleQuote = true;
      current += char;
    } else if (char === "'" && inSingleQuote) {
      inSingleQuote = false;
      current += char;
    } else if (char === ';' && !inSingleQuote) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  console.log(`Running ${statements.length} statements...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--') || stmt.length < 5) {
      continue;
    }
    
    try {
      await client.query(stmt);
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Progress: ${successCount}/${statements.length}`);
      }
    } catch (err: any) {
      // Skip certain errors that are OK (like ON CONFLICT)
      if (err.message?.includes('duplicate') || 
          err.message?.includes('already exists') ||
          err.message?.includes('ON CONFLICT')) {
        successCount++;
        continue;
      }
      console.error(`Error at statement ${i}:`, err.message?.slice(0, 100));
      errorCount++;
    }
  }
  
  console.log(`\nMigration complete: ${successCount} succeeded, ${errorCount} errors`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
