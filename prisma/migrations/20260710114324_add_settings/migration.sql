-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "brandColor" TEXT NOT NULL DEFAULT '#4f46e5',
    "newTicketEmailSubject" TEXT NOT NULL DEFAULT 'Nuovo ticket: {{ticketTitle}}',
    "newTicketEmailBody" TEXT NOT NULL DEFAULT '{{requesterName}} ha aperto un nuovo ticket.

{{ticketDescription}}

{{ticketUrl}}',
    "assignedEmailSubject" TEXT NOT NULL DEFAULT 'Ticket assegnato: {{ticketTitle}}',
    "assignedEmailBody" TEXT NOT NULL DEFAULT 'Ti è stato assegnato il ticket "{{ticketTitle}}".

{{ticketUrl}}',
    "statusChangedEmailSubject" TEXT NOT NULL DEFAULT 'Aggiornamento ticket: {{ticketTitle}}',
    "statusChangedEmailBody" TEXT NOT NULL DEFAULT 'Lo stato del tuo ticket è cambiato in "{{status}}".

{{ticketUrl}}',
    "newCommentEmailSubject" TEXT NOT NULL DEFAULT 'Nuovo commento sul ticket: {{ticketTitle}}',
    "newCommentEmailBody" TEXT NOT NULL DEFAULT '{{authorName}} ha commentato il tuo ticket.

{{commentBody}}

{{ticketUrl}}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
