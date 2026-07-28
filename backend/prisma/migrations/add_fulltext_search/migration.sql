-- 全文搜索增强：添加 tsvector 列和 GIN 索引

-- 1. Diary 表
ALTER TABLE "Diary" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

UPDATE "Diary" SET "searchVector" = 
  to_tsvector('simple', 
    coalesce("content", '') || ' ' || 
    coalesce("weather", '') || ' ' ||
    coalesce("seaCondition", '') || ' ' ||
    coalesce("dynamicStatus", '') || ' ' ||
    coalesce("departurePort", '') || ' ' ||
    coalesce("arrivalPort", '') || ' ' ||
    coalesce("shipName", '') || ' ' ||
    coalesce("categoryFirst", '') || ' ' ||
    coalesce("categorySecond", '')
  );

CREATE INDEX IF NOT EXISTS "Diary_searchVector_idx" ON "Diary" USING GIN ("searchVector");

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_diary_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    coalesce(NEW."content", '') || ' ' || 
    coalesce(NEW."weather", '') || ' ' ||
    coalesce(NEW."seaCondition", '') || ' ' ||
    coalesce(NEW."dynamicStatus", '') || ' ' ||
    coalesce(NEW."departurePort", '') || ' ' ||
    coalesce(NEW."arrivalPort", '') || ' ' ||
    coalesce(NEW."shipName", '') || ' ' ||
    coalesce(NEW."categoryFirst", '') || ' ' ||
    coalesce(NEW."categorySecond", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS diary_search_vector_trigger ON "Diary";
CREATE TRIGGER diary_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Diary"
  FOR EACH ROW
  EXECUTE FUNCTION update_diary_search_vector();

-- 2. Schedule 表
ALTER TABLE "Schedule" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

UPDATE "Schedule" SET "searchVector" = 
  to_tsvector('simple', 
    coalesce("title", '') || ' ' || 
    coalesce("description", '') || ' ' ||
    coalesce("eventDetail", '') || ' ' ||
    coalesce("firstType", '') || ' ' ||
    coalesce("secondType", '')
  );

CREATE INDEX IF NOT EXISTS "Schedule_searchVector_idx" ON "Schedule" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION update_schedule_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    coalesce(NEW."title", '') || ' ' || 
    coalesce(NEW."description", '') || ' ' ||
    coalesce(NEW."eventDetail", '') || ' ' ||
    coalesce(NEW."firstType", '') || ' ' ||
    coalesce(NEW."secondType", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_search_vector_trigger ON "Schedule";
CREATE TRIGGER schedule_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Schedule"
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_search_vector();

-- 3. MeetingRecord 表
ALTER TABLE "MeetingRecord" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

UPDATE "MeetingRecord" SET "searchVector" = 
  to_tsvector('simple', 
    coalesce("title", '') || ' ' || 
    coalesce("transcript", '') || ' ' ||
    coalesce("summary", '') || ' ' ||
    coalesce("customNotes", '') || ' ' ||
    coalesce("location", '')
  );

CREATE INDEX IF NOT EXISTS "MeetingRecord_searchVector_idx" ON "MeetingRecord" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION update_meeting_record_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    coalesce(NEW."title", '') || ' ' || 
    coalesce(NEW."transcript", '') || ' ' ||
    coalesce(NEW."summary", '') || ' ' ||
    coalesce(NEW."customNotes", '') || ' ' ||
    coalesce(NEW."location", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meeting_record_search_vector_trigger ON "MeetingRecord";
CREATE TRIGGER meeting_record_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "MeetingRecord"
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_record_search_vector();

-- 4. Experience 表
ALTER TABLE "Experience" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

UPDATE "Experience" SET "searchVector" = 
  to_tsvector('simple', 
    coalesce("title", '') || ' ' || 
    coalesce("content", '') || ' ' ||
    coalesce("category", '') || ' ' ||
    coalesce("authorName", '') || ' ' ||
    coalesce("shipName", '')
  );

CREATE INDEX IF NOT EXISTS "Experience_searchVector_idx" ON "Experience" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION update_experience_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    coalesce(NEW."title", '') || ' ' || 
    coalesce(NEW."content", '') || ' ' ||
    coalesce(NEW."category", '') || ' ' ||
    coalesce(NEW."authorName", '') || ' ' ||
    coalesce(NEW."shipName", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS experience_search_vector_trigger ON "Experience";
CREATE TRIGGER experience_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Experience"
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_search_vector();
