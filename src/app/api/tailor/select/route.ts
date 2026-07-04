import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import { emptySkeleton } from "@/types/profile";
import { selectRelevantFacts } from "@/lib/ai/select-facts";

const bodySchema = z.object({
  jobDescription: z.string().min(1),
  keywords: z.array(z.string()).default([]),
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
      { error: "No job description was provided." },
      { status: 400 },
    );
  }

  const userId = session.user.id!;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!profile) {
    return NextResponse.json(
      { error: "No profile found. Build your profile first." },
      { status: 400 },
    );
  }

  const skeleton = { ...emptySkeleton(), ...(profile.content as object) };
  const allFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  const result = await selectRelevantFacts(
    parsed.data.jobDescription,
    parsed.data.keywords,
    skeleton.roles,
    allFacts,
  );

  if (!result.success) {
    return NextResponse.json({ fallback: true, reason: result.reason });
  }

  return NextResponse.json({
    fallback: false,
    selectedFactIds: result.selectedFactIds,
  });
}
