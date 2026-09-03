import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { unreadTicketConditionSql } from "@/lib/unread";

export async function GET() {
  const user = await getCurrentUser();

  const result = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT t.id)::bigint AS count
      FROM "Ticket" t
      WHERE ${unreadTicketConditionSql(user.id, user.role)}
    `
  );

  return NextResponse.json({ count: Number(result[0]?.count ?? 0) });
}
