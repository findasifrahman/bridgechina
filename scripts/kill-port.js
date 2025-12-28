#!/usr/bin/env node
/**
 * Kill process on a specific port (Windows-compatible)
 * Usage: node scripts/kill-port.js [port]
 */

const { execSync } = require('child_process');
const port = process.argv[2] || '3000';

try {
  console.log(`Looking for processes on port ${port}...`);
  
  // Find processes using the port
  const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
  const lines = result.trim().split('\n');
  
  const pids = new Set();
  lines.forEach(line => {
    const match = line.match(/\s+(\d+)$/);
    if (match) {
      pids.add(match[1]);
    }
  });
  
  if (pids.size === 0) {
    console.log(`No process found on port ${port}`);
    process.exit(0);
  }
  
  console.log(`Found ${pids.size} process(es) on port ${port}`);
  
  // Kill each process
  pids.forEach(pid => {
    try {
      console.log(`Killing PID ${pid}...`);
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
      console.log(`✓ Killed PID ${pid}`);
    } catch (err) {
      console.error(`✗ Failed to kill PID ${pid}:`, err.message);
    }
  });
  
  console.log('Done!');
} catch (err) {
  if (err.message.includes('findstr')) {
    console.log(`No process found on port ${port}`);
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

