-- CreateTable Tag
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateTable _TagToTicket (implicit many-to-many)
CREATE TABLE "_TagToTicket" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TagToTicket_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_TagToTicket_B_index" ON "_TagToTicket"("B");
ALTER TABLE "_TagToTicket" ADD CONSTRAINT "_TagToTicket_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TagToTicket" ADD CONSTRAINT "_TagToTicket_B_fkey" FOREIGN KEY ("B") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Setting: new columns
ALTER TABLE "Setting"
    ADD COLUMN IF NOT EXISTS "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "reminderDays" INTEGER,
    ADD COLUMN IF NOT EXISTS "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "mentionEmailSubject" TEXT NOT NULL DEFAULT 'Sei stato menzionato nel ticket: {{ticketTitle}}',
    ADD COLUMN IF NOT EXISTS "mentionEmailBody"    TEXT NOT NULL DEFAULT E'{{authorName}} ti ha menzionato in un commento.\n\n{{commentBody}}\n\n{{ticketUrl}}';
