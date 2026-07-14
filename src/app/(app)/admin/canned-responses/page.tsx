import { getCurrentUser } from "@/lib/dal";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CannedResponsesClient } from "./canned-responses-client";

export default async function CannedResponsesPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const responses = await prisma.cannedResponse.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="page-title">Risposte predefinite</h1>
        <p className="page-subtitle">Modelli di risposta rapida disponibili per lo staff durante la gestione dei ticket.</p>
      </div>
      <CannedResponsesClient responses={responses} />
    </div>
  );
}
