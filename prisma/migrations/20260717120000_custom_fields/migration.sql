CREATE TABLE "CustomField" (
    "id"         TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "type"       TEXT NOT NULL DEFAULT 'text',
    "options"    TEXT,
    "required"   BOOLEAN NOT NULL DEFAULT false,
    "position"   INTEGER NOT NULL DEFAULT 0,
    "hint"       TEXT,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketFieldValue" (
    "id"       TEXT NOT NULL,
    "value"    TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldId"  TEXT NOT NULL,
    CONSTRAINT "TicketFieldValue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketFieldValue" ADD CONSTRAINT "TicketFieldValue_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketFieldValue" ADD CONSTRAINT "TicketFieldValue_fieldId_fkey"
    FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "TicketFieldValue_ticketId_fieldId_key" ON "TicketFieldValue"("ticketId", "fieldId");
CREATE INDEX "CustomField_categoryId_idx" ON "CustomField"("categoryId");
CREATE INDEX "TicketFieldValue_ticketId_idx" ON "TicketFieldValue"("ticketId");
