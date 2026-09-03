-- Add kbEnabled flag to settings
ALTER TABLE "Setting" ADD COLUMN "kbEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Create KbArticle table
CREATE TABLE "KbArticle" (
  "id"         TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "slug"       TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "published"  BOOLEAN NOT NULL DEFAULT false,
  "views"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId"   TEXT NOT NULL,
  "categoryId" TEXT,
  CONSTRAINT "KbArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KbArticle_slug_key" ON "KbArticle"("slug");
CREATE INDEX "KbArticle_published_idx" ON "KbArticle"("published");
CREATE INDEX "KbArticle_categoryId_idx" ON "KbArticle"("categoryId");

ALTER TABLE "KbArticle" ADD CONSTRAINT "KbArticle_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KbArticle" ADD CONSTRAINT "KbArticle_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
