import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const user = await getCurrentUser();

  const result = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT t.id)::bigint AS count
      FROM "Ticket" t
      WHERE ${user.role === "USER" ? Prisma.sql`t."requesterId" = ${user.id} AND` : Prisma.sql``}
      EXISTS (
        SELECT 1 FROM "Comment" c
        WHERE c."ticketId" = t.id
          AND c.internal = false
          AND c."createdAt" > COALESCE(
            (SELECT tv."viewedAt" FROM "TicketView" tv
             WHERE tv."userId" = ${user.id} AND tv."ticketId" = t.id),
            '1970-01-01'::timestamptz
          )
          AND c."authorId" != ${user.id}
      )
    `
  );

  return NextResponse.json({ count: Number(result[0]?.count ?? 0) });
}
