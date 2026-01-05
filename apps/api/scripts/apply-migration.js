/**
 * Script to apply migration SQL file directly using Prisma
 * Usage: node scripts/apply-migration.js
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    const migrationPath = join(__dirname, '../prisma/migrations/20250128000000_extend_provider_profiles/migration.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('Applying migration: extend_provider_profiles');
    console.log('Migration SQL file:', migrationPath);
    
    // Split SQL into individual statements (handling DO blocks as single statements)
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Track DO block depth
      if (trimmed.toUpperCase().startsWith('DO $$')) {
        inDoBlock = true;
        doBlockDepth = 1;
      } else if (inDoBlock) {
        if (trimmed.includes('$$')) {
          doBlockDepth--;
          if (doBlockDepth === 0) {
            inDoBlock = false;
            statements.push(currentStatement.trim());
            currentStatement = '';
          }
        }
        if (trimmed.toUpperCase().includes('DO $$')) {
          doBlockDepth++;
        }
      } else if (trimmed.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`\nFound ${statements.length} SQL statements to execute...\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await prisma.$executeRawUnsafe(stmt);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist (IF NOT EXISTS handling)
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration applied successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: pnpm prisma migrate resolve --applied 20250128000000_extend_provider_profiles');
    console.log('2. Run: pnpm prisma generate');
  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

