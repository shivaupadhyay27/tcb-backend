-- CreateTable
CREATE TABLE "publish_audit_logs" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publish_audit_logs_postId_idx" ON "publish_audit_logs"("postId");
CREATE INDEX "publish_audit_logs_userId_idx" ON "publish_audit_logs"("userId");
CREATE INDEX "publish_audit_logs_action_idx" ON "publish_audit_logs"("action");
CREATE INDEX "publish_audit_logs_createdAt_idx" ON "publish_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "publish_audit_logs" ADD CONSTRAINT "publish_audit_logs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publish_audit_logs" ADD CONSTRAINT "publish_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
