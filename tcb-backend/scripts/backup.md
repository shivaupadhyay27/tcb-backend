# Database Backup & Recovery SOP

## Backup

Run:
npx prisma db pull

OR export DB:
pg_dump %DATABASE_URL% > backup.sql

## Restore

psql %DATABASE_URL% < backup.sql

## Frequency
- Weekly backup recommended

## Notes
- Store backup securely
- Verify restore in staging