# Rollback Plan

If production issues occur:

1. Revert to previous stable commit:
git checkout v1.0

2. Restart server:
npm run dev

3. Restore database if needed:
psql %DATABASE_URL% < backup.sql

4. Verify system health endpoints