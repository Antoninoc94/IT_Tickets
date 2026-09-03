"use client";

import { useEffect } from "react";
import { markTicketViewed } from "@/app/actions/tickets";

export function ViewTracker({ ticketId }: { ticketId: string }) {
  useEffect(() => {
    markTicketViewed(ticketId);
  }, [ticketId]);
  return null;
}
