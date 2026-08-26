import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";

/**
 * SQL fragment for "does ticket t have unread activity for this user" —
 * shared by the dashboard's per-row indicator and the header badge count so
 * the two can't drift apart on what counts as unread (they previously did:
 * staff should see internal notes as unread activity too, regular users
 * shouldn't since they can't see internal notes in the first place).
 */
export function unreadTicketConditionSql(userId: string, role: Role) {
  return Prisma.sql`
    ${role === "USER" ? Prisma.sql`t."requesterId" = ${userId} AND` : Prisma.sql``}
    EXISTS (
      SELECT 1 FROM "Comment" c
      WHERE c."ticketId" = t.id
        AND ${role === "USER" ? Prisma.sql`c.internal = false AND` : Prisma.sql``}
        c."createdAt" > COALESCE(
          (SELECT tv."viewedAt" FROM "TicketView" tv
           WHERE tv."userId" = ${userId} AND tv."ticketId" = t.id),
          '1970-01-01'::timestamptz
        )
        AND c."authorId" != ${userId}
    )
  `;
}
