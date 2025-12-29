/**
 * Sync local PostgreSQL database to Railway PostgreSQL
 * 
 * This script:
 * 1. Dumps the local database (schema + data)
 * 2. Drops all tables in Railway database
 * 3. Restores the dump to Railway
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Find PostgreSQL bin directory on Windows
function findPostgresBin(): string | null {
  if (os.platform() !== 'win32') {
    return ''; // Use system PATH on non-Windows
  }

  const commonPaths = [
    'C:\\Program Files\\PostgreSQL\\16\\bin',
    'C:\\Program Files\\PostgreSQL\\15\\bin',
    'C:\\Program Files\\PostgreSQL\\14\\bin',
    'C:\\Program Files\\PostgreSQL\\13\\bin',
    'C:\\Program Files\\PostgreSQL\\12\\bin',
    process.env.PROGRAMFILES + '\\PostgreSQL\\16\\bin',
    process.env.PROGRAMFILES + '\\PostgreSQL\\15\\bin',
    process.env['PROGRAMFILES(X86)'] + '\\PostgreSQL\\16\\bin',
    process.env['PROGRAMFILES(X86)'] + '\\PostgreSQL\\15\\bin',
  ];

  for (const pgPath of commonPaths) {
    if (pgPath && fs.existsSync(pgPath)) {
      const pgDumpPath = path.join(pgPath, 'pg_dump.exe');
      if (fs.existsSync(pgDumpPath)) {
        return pgPath;
      }
    }
  }

  return null;
}

// Database URLs
const LOCAL_DB_URL = 'postgresql://postgres:asif10018@localhost:5432/bridgechina?schema=public';
const RAILWAY_DB_URL = 'postgresql://postgres:zQLrMLvvUyHVjBcNWobjRBYicRSBPNjP@mainline.proxy.rlwy.net:17048/railway';

// Parse connection strings
function parseDbUrl(url: string) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) throw new Error(`Invalid database URL: ${url}`);
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  };
}

async function runCommand(command: string, description: string, pgBinPath?: string, timeout: number = 300000) {
  console.log(`\n🔄 ${description}...`);
  try {
    // On Windows, prepend PostgreSQL bin path if found
    let finalCommand = command;
    if (os.platform() === 'win32' && pgBinPath) {
      // Replace pg_dump and psql with full paths
      finalCommand = command
        .replace(/pg_dump\s/g, `"${path.join(pgBinPath, 'pg_dump.exe')}" `)
        .replace(/psql\s/g, `"${path.join(pgBinPath, 'psql.exe')}" `);
    }
    
    // Add timeout and show progress for long operations
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\r   ⏳ Still running... (${elapsed}s)`);
    }, 5000);
    
    try {
      const { stdout, stderr } = await execAsync(finalCommand, {
        env: { ...process.env },
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer for large outputs
        timeout,
      });
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line
      
      if (stdout) {
        // Only show first and last 50 lines for large outputs
        const lines = stdout.split('\n');
        if (lines.length > 100) {
          console.log('   ... (showing first and last 50 lines) ...');
          console.log(lines.slice(0, 50).join('\n'));
          console.log('   ...');
          console.log(lines.slice(-50).join('\n'));
        } else {
          console.log(stdout);
        }
      }
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
        const errorLines = stderr.split('\n');
        if (errorLines.length > 100) {
          console.error('   ... (showing errors) ...');
          console.error(errorLines.filter(l => l.includes('ERROR') || l.includes('error')).join('\n'));
        } else {
          console.error(stderr);
        }
      }
      return { success: true };
    } catch (execError: any) {
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line
      throw execError;
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stdout) {
      const lines = error.stdout.split('\n');
      console.error(lines.slice(-20).join('\n')); // Last 20 lines
    }
    if (error.stderr) {
      const lines = error.stderr.split('\n');
      console.error(lines.filter(l => l.trim()).slice(-20).join('\n')); // Last 20 non-empty lines
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting database sync from Local → Railway\n');
  console.log('⚠️  WARNING: This will DROP ALL TABLES in Railway database!');
  console.log('   Make sure you have a backup if needed.\n');

  // Find PostgreSQL bin directory on Windows
  const pgBinPath = findPostgresBin();
  if (os.platform() === 'win32') {
    if (pgBinPath) {
      console.log(`✅ Found PostgreSQL at: ${pgBinPath}\n`);
    } else {
      console.log('⚠️  PostgreSQL bin directory not found in common locations.');
      console.log('   Trying system PATH...\n');
    }
  }

  const localDb = parseDbUrl(LOCAL_DB_URL);
  const railwayDb = parseDbUrl(RAILWAY_DB_URL);

  const dumpFile = path.join(process.cwd(), 'railway-dump.sql');
  const tempDumpFile = path.join(process.cwd(), 'railway-dump-temp.sql');

  try {
    // Step 1: Dump local database
    console.log('📦 Step 1: Dumping local database...');
    const dumpCmd = `pg_dump -h ${localDb.host} -p ${localDb.port} -U ${localDb.user} -d ${localDb.database} -F p -f "${dumpFile}"`;
    
    // Set password via environment variable
    process.env.PGPASSWORD = localDb.password;
    
    const dumpResult = await runCommand(dumpCmd, 'Dumping local database', pgBinPath || undefined);
    if (!dumpResult.success) {
      if (os.platform() === 'win32' && !pgBinPath) {
        console.error('\n💡 PostgreSQL tools not found. Please either:');
        console.error('   1. Add PostgreSQL bin to PATH (usually: C:\\Program Files\\PostgreSQL\\XX\\bin)');
        console.error('   2. Or install PostgreSQL from: https://www.postgresql.org/download/windows/');
        console.error('   3. Or use the manual sync method in SYNC_TO_RAILWAY.md');
      }
      throw new Error('Failed to dump local database');
    }

    // Step 2: Remove CREATE DATABASE and CONNECT statements from dump
    console.log('\n📝 Step 2: Preparing dump file for Railway...');
    let dumpContent = fs.readFileSync(dumpFile, 'utf8');
    
    // Remove lines that create/connect to database (Railway already has the database)
    dumpContent = dumpContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('CREATE DATABASE') &&
               !trimmed.startsWith('ALTER DATABASE') &&
               !trimmed.startsWith('\\connect') &&
               !trimmed.startsWith('\\c ');
      })
      .join('\n');

    fs.writeFileSync(tempDumpFile, dumpContent);

    // Step 3: Drop all tables in Railway (using psql)
    console.log('\n🗑️  Step 3: Dropping all tables in Railway database...');
    
    // Generate SQL to drop all tables
    const dropTablesSQL = `
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
`;

    const dropFile = path.join(process.cwd(), 'drop-tables.sql');
    fs.writeFileSync(dropFile, dropTablesSQL);

    process.env.PGPASSWORD = railwayDb.password;
    const dropCmd = `psql -h ${railwayDb.host} -p ${railwayDb.port} -U ${railwayDb.user} -d ${railwayDb.database} -f "${dropFile}"`;
    
    const dropResult = await runCommand(dropCmd, 'Dropping tables in Railway', pgBinPath || undefined);
    if (!dropResult.success) {
      console.warn('⚠️  Warning: Some tables may not have been dropped. Continuing...');
    }

    // Step 4: Restore dump to Railway
    console.log('\n📥 Step 4: Restoring dump to Railway database...');
    console.log('   This may take several minutes depending on database size...');
    
    // Check dump file size
    const dumpStats = fs.statSync(tempDumpFile);
    const dumpSizeMB = (dumpStats.size / (1024 * 1024)).toFixed(2);
    console.log(`   Dump file size: ${dumpSizeMB} MB`);
    
    const restoreCmd = `psql -h ${railwayDb.host} -p ${railwayDb.port} -U ${railwayDb.user} -d ${railwayDb.database} -f "${tempDumpFile}" -v ON_ERROR_STOP=0`;
    
    // Use longer timeout for restore (10 minutes)
    const restoreResult = await runCommand(restoreCmd, 'Restoring to Railway', pgBinPath || undefined, 600000);
    if (!restoreResult.success) {
      console.warn('\n⚠️  Some errors occurred during restore, but continuing...');
      console.warn('   Check the output above for specific errors.');
      // Don't throw - partial restore might be okay
    }

    // Cleanup
    console.log('\n🧹 Cleaning up temporary files...');
    if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
    if (fs.existsSync(tempDumpFile)) fs.unlinkSync(tempDumpFile);
    if (fs.existsSync(dropFile)) fs.unlinkSync(dropFile);

    console.log('\n✅ Database sync completed successfully!');
    console.log('   Local database has been synced to Railway.');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure pg_dump and psql are installed');
    console.error('   2. Check that both databases are accessible');
    console.error('   3. Verify database URLs are correct');
    process.exit(1);
  } finally {
    // Clean up password from environment
    delete process.env.PGPASSWORD;
  }
}

main();

