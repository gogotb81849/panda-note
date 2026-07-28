-- ============================================================
-- 安全增量迁移 - 新增字段，不删除任何数据
-- ============================================================

-- PublishTemplate 新增字段
ALTER TABLE "PublishTemplate"
ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceTaskId" INTEGER,
ADD COLUMN "creatorRole" TEXT,
ADD COLUMN "fileNamingRule" TEXT,
ADD COLUMN "allowedTypes" JSONB,
ADD COLUMN "progressTracking" BOOLEAN NOT NULL DEFAULT false;

-- ShipTaskStatus 新增字段
ALTER TABLE "ShipTaskStatus"
ADD COLUMN "checklistProgress" JSONB,
ADD COLUMN "fileList" JSONB,
ADD COLUMN "fileNamePrefix" TEXT;

-- 创建索引
CREATE INDEX "PublishTemplate_isSystem_idx" ON "PublishTemplate"("isSystem");
CREATE INDEX "PublishTemplate_sourceTaskId_idx" ON "PublishTemplate"("sourceTaskId");
