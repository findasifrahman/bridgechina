-- SQL script to release Prisma migration advisory locks
-- Run this in psql: psql -U postgres -d bridgechina -f scripts/release-lock.sql

-- Release all advisory locks for the current session
SELECT pg_advisory_unlock_all();

-- Check for any remaining active advisory locks
SELECT 
    locktype,
    objid,
    pid,
    mode,
    granted,
    pg_backend_pid() as current_pid
FROM pg_locks
WHERE locktype = 'advisory' AND objid = 72707369;

-- If locks are found, note the PID and kill that process:
-- Windows: taskkill /PID <pid> /F
-- Unix/Mac: kill -9 <pid>

