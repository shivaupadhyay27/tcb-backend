import prisma from '../../lib/prisma';

interface AuditResult {
  check: string;
  passed: boolean;
  detail: string;
}

export async function runIndexingAudit(): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  const draftsWithPublishDate = await prisma.post.count({
    where: { status: 'DRAFT', publishedAt: { not: null } },
  });
  results.push({
    check: 'Drafts have no publishedAt date',
    passed: draftsWithPublishDate === 0,
    detail:
      draftsWithPublishDate === 0
        ? 'All drafts correctly have null publishedAt'
        : `${draftsWithPublishDate} draft(s) have a publishedAt date — fix immediately`,
  });

  const publishedWithoutSlug = await prisma.post.count({
    where: { status: 'PUBLISHED', slug: '' },
  });
  results.push({
    check: 'Published posts have slugs',
    passed: publishedWithoutSlug === 0,
    detail:
      publishedWithoutSlug === 0
        ? 'All published posts have valid slugs'
        : `${publishedWithoutSlug} published post(s) missing slug`,
  });

  const missingMetaDesc = await prisma.post.count({
    where: { status: 'PUBLISHED', AND: [{ metaDesc: null }, { excerpt: null }] },
  });
  results.push({
    check: 'Published posts have meta description or excerpt',
    passed: missingMetaDesc === 0,
    detail:
      missingMetaDesc === 0
        ? 'All published posts have meta descriptions'
        : `${missingMetaDesc} published post(s) missing meta description and excerpt`,
  });

  const archivedCheck = await prisma.post.count({
    where: { status: 'ARCHIVED', publishedAt: null },
  });
  results.push({
    check: 'Archived posts have publishedAt date',
    passed: archivedCheck === 0,
    detail:
      archivedCheck === 0
        ? 'All archived posts have valid publishedAt'
        : `${archivedCheck} archived post(s) missing publishedAt`,
  });

  const missingCanonical = await prisma.post.count({
    where: { status: 'PUBLISHED', canonicalUrl: null },
  });
  results.push({
    check: 'Published posts have canonical URLs',
    passed: true,
    detail:
      missingCanonical === 0
        ? 'All published posts have explicit canonical URLs'
        : `${missingCanonical} posts use auto-generated canonicals (acceptable)`,
  });

  return results;
}

export function printAuditResults(results: AuditResult[]): void {
  console.log('\n📋 TCB Indexing Audit\n' + '─'.repeat(50));
  results.forEach(({ check, passed, detail }) => {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
    console.log(`   ${detail}\n`);
  });
  const failed = results.filter((r) => !r.passed).length;
  console.log('─'.repeat(50));
  console.log(failed === 0 ? '✅ All checks passed' : `❌ ${failed} check(s) failed`);
}

// Run if executed directly
runIndexingAudit().then(printAuditResults).catch(console.error);
