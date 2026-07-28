-- P2: 扩展 PublishTemplate 表（新增15个字段）
ALTER TABLE "PublishTemplate" 
ADD COLUMN IF NOT EXISTS "templateDesc" TEXT,
ADD COLUMN IF NOT EXISTS "coverImage" TEXT,
ADD COLUMN IF NOT EXISTS "categoryId" INTEGER,
ADD COLUMN IF NOT EXISTS "frequencyType" TEXT NOT NULL DEFAULT 'once',
ADD COLUMN IF NOT EXISTS "frequencyCron" TEXT,
ADD COLUMN IF NOT EXISTS "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "reminderDaysBefore" JSONB,
ADD COLUMN IF NOT EXISTS "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "aiPromptTemplate" TEXT,
ADD COLUMN IF NOT EXISTS "aiOutputFormat" TEXT DEFAULT 'summary',
ADD COLUMN IF NOT EXISTS "dashboardMetrics" JSONB,
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0;

-- 修改 templateType 默认值
ALTER TABLE "PublishTemplate" ALTER COLUMN "templateType" SET DEFAULT 'form_collect';

-- 创建 TaskCategory 表
CREATE TABLE IF NOT EXISTS "TaskCategory" (
    "id" SERIAL NOT NULL,
    "teamCode" "TeamCode" NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id")
);

-- 外键：PublishTemplate.categoryId -> TaskCategory.id
ALTER TABLE "PublishTemplate" ADD CONSTRAINT "PublishTemplate_categoryId_fkey" 
FOREIGN KEY ("categoryId") REFERENCES "TaskCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 索引
CREATE INDEX IF NOT EXISTS "TaskCategory_teamCode_idx" ON "TaskCategory"("teamCode");
CREATE INDEX IF NOT EXISTS "TaskCategory_parentId_idx" ON "TaskCategory"("parentId");
CREATE INDEX IF NOT EXISTS "PublishTemplate_categoryId_idx" ON "PublishTemplate"("categoryId");

-- P2: 扩展 ShipTaskStatus 表（新增6个字段）
ALTER TABLE "ShipTaskStatus" 
ADD COLUMN IF NOT EXISTS "geoLat" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "geoLng" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "geoAddress" TEXT,
ADD COLUMN IF NOT EXISTS "deviceInfo" JSONB,
ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

-- 添加 template 外键关联
ALTER TABLE "ShipTaskStatus" ADD CONSTRAINT "ShipTaskStatus_templateId_fkey" 
FOREIGN KEY ("templateId") REFERENCES "PublishTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;