import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

// Cheap polling endpoint for the ticket detail page: returns only the
// timestamp of the last change, so the client can detect new activity
// (comments, status/tag/assignment changes all bump `updatedAt`) without
// re-fetching the whole ticket on every poll.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { updatedAt: true, requesterId: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket non trovato." }, { status: 404 });
  }

  const isStaff = user.role !== "USER";
  if (!isStaff && ticket.requesterId !== user.id) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  return NextResponse.json({ updatedAt: ticket.updatedAt.toISOString() });
}
