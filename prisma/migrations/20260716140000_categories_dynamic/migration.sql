-- Create the Category table
CREATE TABLE "Category" (
  "id"       TEXT    NOT NULL,
  "name"     TEXT    NOT NULL,
  "color"    TEXT    NOT NULL DEFAULT '#6366f1',
  "enabled"  BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Seed the five default categories with deterministic IDs
INSERT INTO "Category" ("id", "name", "color", "position") VALUES
  ('cat_hardware', 'Hardware', '#ef4444', 0),
  ('cat_software', 'Software', '#3b82f6', 1),
  ('cat_network',  'Rete',     '#10b981', 2),
  ('cat_account',  'Account',  '#f59e0b', 3),
  ('cat_other',    'Altro',    '#6b7280', 4);

-- ── Ticket ───────────────────────────────────────────────────────────────────
ALTER TABLE "Ticket" ADD COLUMN "categoryId" TEXT;

UPDATE "Ticket" SET "categoryId" = CASE category::text
  WHEN 'HARDWARE' THEN 'cat_hardware'
  WHEN 'SOFTWARE' THEN 'cat_software'
  WHEN 'NETWORK'  THEN 'cat_network'
  WHEN 'ACCOUNT'  THEN 'cat_account'
  ELSE                 'cat_other'
END;

ALTER TABLE "Ticket" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket" DROP COLUMN "category";

-- ── TicketTemplate ───────────────────────────────────────────────────────────
ALTER TABLE "TicketTemplate" ADD COLUMN "categoryId" TEXT;

UPDATE "TicketTemplate" SET "categoryId" = CASE category::text
  WHEN 'HARDWARE' THEN 'cat_hardware'
  WHEN 'SOFTWARE' THEN 'cat_software'
  WHEN 'NETWORK'  THEN 'cat_network'
  WHEN 'ACCOUNT'  THEN 'cat_account'
  WHEN 'OTHER'    THEN 'cat_other'
  ELSE NULL
END
WHERE category IS NOT NULL;

ALTER TABLE "TicketTemplate"
  ADD CONSTRAINT "TicketTemplate_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TicketTemplate" DROP COLUMN "category";

-- Drop the old enum type (only after all columns using it are gone)
DROP TYPE IF EXISTS "TicketCategory";
