# Manual restore script for Railway database
# Use this if the automated script gets stuck

$RAILWAY_DB = "postgresql://postgres:zQLrMLvvUyHVjBcNWobjRBYicRSBPNjP@mainline.proxy.rlwy.net:17048/railway"
$DUMP_FILE = "railway-dump-temp.sql"

# Parse connection string
$match = $RAILWAY_DB -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)"
if (-not $match) {
    Write-Output "Invalid database URL"
    exit 1
}

$dbUser = $matches[1]
$dbPassword = $matches[2]
$dbHost = $matches[3]
$dbPort = $matches[4]
$dbName = $matches[5]

# Find PostgreSQL bin
$pgBinPaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin"
)

$psqlPath = $null
foreach ($pgPath in $pgBinPaths) {
    $testPath = Join-Path $pgPath "psql.exe"
    if (Test-Path $testPath) {
        $psqlPath = $testPath
        break
    }
}

if (-not $psqlPath) {
    Write-Output "PostgreSQL not found. Please add to PATH or specify psql path."
    exit 1
}

Write-Output "Using PostgreSQL: $psqlPath"
Write-Output "Restoring from: $DUMP_FILE"
Write-Output ""

# Set password environment variable
$env:PGPASSWORD = $dbPassword

# Restore command
$restoreCmd = "& `"$psqlPath`" -h $dbHost -p $dbPort -U $dbUser -d $dbName -f `"$DUMP_FILE`""

Write-Output "Starting restore..."
Write-Output "This may take several minutes..."
Write-Output ""

try {
    Invoke-Expression $restoreCmd
    Write-Output ""
    Write-Output "✅ Restore completed!"
} catch {
    Write-Output ""
    Write-Output "❌ Restore failed: $_"
} finally {
    Remove-Item Env:\PGPASSWORD
}







