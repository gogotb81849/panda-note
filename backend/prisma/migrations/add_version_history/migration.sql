-- CreateTable
CREATE TABLE "VersionHistory" (
    "id" SERIAL NOT NULL,
    "teamCode" VARCHAR(255) NOT NULL,
    "entityType" VARCHAR(255) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "changeSummary" TEXT NOT NULL DEFAULT '',
    "userId" INTEGER NOT NULL,
    "userName" VARCHAR(255) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VersionHistory_teamCode_entityType_entityId_idx" ON "VersionHistory"("teamCode", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "VersionHistory_teamCode_entityType_entityId_version_idx" ON "VersionHistory"("teamCode", "entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "VersionHistory_teamCode_createdAt_idx" ON "VersionHistory"("teamCode", "createdAt");
