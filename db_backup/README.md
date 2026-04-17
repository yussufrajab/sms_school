# Database Backup & Restore

## Backup

```bash
./backup.sh [database_url]
# or
DATABASE_URL=postgres://user:pass@host:5432/dbname ./backup.sh
```

## Restore

```bash
# Auto-picks latest .dump file
./restore.sh

# Or specify file and custom DB URL
./restore.sh sms_backup_20260417.dump postgres://user:pass@host:5432/dbname
