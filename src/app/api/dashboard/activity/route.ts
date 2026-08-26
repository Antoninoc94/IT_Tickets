import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

// Cheap polling endpoint for the dashboard: returns the most recent
// updatedAt across the tickets this user can see (their own for a USER, all
// of them for staff) — a new ticket, comment, status/assignment/tag change
// all bump it, so the client can detect "something changed" without
// re-running the dashboard's full filtered/sorted/paginated query itself.
export async function GET() {
  const user = await getCurrentUser();
  const isStaff = user.role !== "USER";

  const result = await prisma.ticket.aggregate({
    _max: { updatedAt: true },
    where: isStaff ? {} : { requesterId: user.id },
  });

  return NextResponse.json({ updatedAt: result._max.updatedAt?.toISOString() ?? null });
}
