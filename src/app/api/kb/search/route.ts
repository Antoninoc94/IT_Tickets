import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const settings = await getSettings();
  if (!settings.kbEnabled) return NextResponse.json({ articles: [] });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ articles: [] });

  const words = q.split(/\s+/).filter((w) => w.length >= 2);

  const articles = await prisma.kbArticle.findMany({
    where: {
      published: true,
      AND: words.map((word) => ({
        OR: [
          { title: { contains: word, mode: "insensitive" as const } },
          { body:  { contains: word, mode: "insensitive" as const } },
        ],
      })),
    },
    take: 3,
    select: { title: true, slug: true },
    orderBy: { views: "desc" },
  });

  return NextResponse.json({ articles });
}
