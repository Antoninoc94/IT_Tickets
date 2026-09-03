ALTER TYPE "TicketEventType" ADD VALUE IF NOT EXISTS 'MERGED';

ALTER TABLE "Ticket" ADD COLUMN "mergedIntoId" TEXT;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_mergedIntoId_fkey"
  FOREIGN KEY ("mergedIntoId") REFERENCES "Ticket"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Ticket_mergedIntoId_idx" ON "Ticket"("mergedIntoId");
