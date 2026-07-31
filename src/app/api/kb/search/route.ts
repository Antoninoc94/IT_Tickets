import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const settings = await getSettings();
  if (!settings.kbEnabled) return NextResponse.json({ articles: [] });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ articles: [] });

  const articles = await prisma.kbArticle.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body:  { contains: q, mode: "insensitive" } },
      ],
    },
    take: 3,
    select: { title: true, slug: true },
    orderBy: { views: "desc" },
  });

  return NextResponse.json({ articles });
}
