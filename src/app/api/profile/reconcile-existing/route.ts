import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import { emptySkeleton } from "@/types/profile";
import {
  isLikelyMatchCertification,
  isLikelyMatchEducation,
  isLikelyMatchFact,
  isLikelyMatchRole,
} from "@/lib/knowledge-merge";
import {
  certificationLabel,
  educationLabel,
  reconcileSelfCollection,
  reconcileSelfFacts,
  roleLabel,
} from "@/lib/reconcile-engine";
import { MAX_COMPARISON_PAIRS } from "@/types/reconciliation";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = session.user.id!;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const existingFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  const skeleton = profile
    ? { ...emptySkeleton(), ...(profile.content as object) }
    : emptySkeleton();

  const [roleResult, educationResult, certificationResult, factResult] =
    await Promise.all([
      reconcileSelfCollection({
        kind: "role",
        items: skeleton.roles,
        isLikelyMatch: isLikelyMatchRole,
        label: roleLabel,
      }),
      reconcileSelfCollection({
        kind: "education",
        items: skeleton.education,
        isLikelyMatch: isLikelyMatchEducation,
        label: educationLabel,
      }),
      reconcileSelfCollection({
        kind: "certification",
        items: skeleton.certifications,
        isLikelyMatch: isLikelyMatchCertification,
        label: certificationLabel,
      }),
      reconcileSelfFacts({
        items: existingFacts,
        isLikelyMatch: isLikelyMatchFact,
      }),
    ]);

  return NextResponse.json({
    roles: roleResult,
    education: educationResult,
    certifications: certificationResult,
    facts: factResult,
    maxComparisonPairs: MAX_COMPARISON_PAIRS,
  });
}
