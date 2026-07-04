import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable } from "@/lib/db/schema";
import { phraseBullets } from "@/lib/ai/phrase-bullets";

const bodySchema = z.object({
  jobDescription: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  factIds: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Phrasing request did not match the expected shape." },
      { status: 400 },
    );
  }

  const userId = session.user.id!;

  if (parsed.data.factIds.length === 0) {
    return NextResponse.json({ fallback: false, bullets: [] });
  }

  const selectedFacts = await db
    .select()
    .from(factsTable)
    .where(
      inArray(factsTable.id, parsed.data.factIds),
    );

  const ownFacts = selectedFacts.filter((f) => f.userId === userId);

  const result = await phraseBullets(
    parsed.data.jobDescription,
    parsed.data.keywords,
    ownFacts.map((f) => ({ id: f.id, text: f.text })),
  );

  if (!result.success) {
    return NextResponse.json({ fallback: true, reason: result.reason });
  }

  const phrasedById = new Map(result.bullets.map((b) => [b.factId, b.phrasedText]));

  const bullets = ownFacts.map((f) => ({
    factId: f.id,
    original: f.text,
    phrasedText: phrasedById.get(f.id) ?? f.text,
  }));

  return NextResponse.json({ fallback: false, bullets });
}
