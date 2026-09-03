-- CreateTable CannedResponse
CREATE TABLE "CannedResponse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CannedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable TicketView
CREATE TABLE "TicketView" (
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketView_pkey" PRIMARY KEY ("userId", "ticketId")
);

-- AddForeignKey TicketView
ALTER TABLE "TicketView" ADD CONSTRAINT "TicketView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketView" ADD CONSTRAINT "TicketView_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend TicketEventType enum
ALTER TYPE "TicketEventType" ADD VALUE IF NOT EXISTS 'PRIORITY_CHANGED';
ALTER TYPE "TicketEventType" ADD VALUE IF NOT EXISTS 'CATEGORY_CHANGED';
