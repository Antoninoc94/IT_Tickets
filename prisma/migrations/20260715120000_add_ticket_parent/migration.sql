ALTER TABLE "Ticket" ADD COLUMN "parentTicketId" TEXT REFERENCES "Ticket"("id") ON DELETE SET NULL;
CREATE INDEX "Ticket_parentTicketId_idx" ON "Ticket"("parentTicketId");
