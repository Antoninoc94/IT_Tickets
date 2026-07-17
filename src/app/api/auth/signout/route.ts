import { type NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  await deleteSession();
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
