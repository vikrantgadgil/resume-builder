import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import {
  certificationCandidateSchema,
  educationCandidateSchema,
  factCandidateSchema,
  profileHeaderSchema,
  roleCandidateSchema,
  emptySkeleton,
} from "@/types/profile";
import { z } from "zod";
import {
  isDuplicateCertification,
  isDuplicateEducation,
  isDuplicateFact,
  isDuplicateRole,
  isLikelyMatchCertification,
  isLikelyMatchEducation,
  isLikelyMatchFact,
  isLikelyMatchRole,
} from "@/lib/knowledge-merge";
import {
  certificationLabel,
  educationLabel,
  reconcileFactCollection,
  reconcileSkeletonCollection,
  roleLabel,
} from "@/lib/reconcile-engine";
import { MAX_COMPARISON_PAIRS } from "@/types/reconciliation";

const bodySchema = z.object({
  header: profileHeaderSchema.optional(),
  roles: z.array(roleCandidateSchema).default([]),
  education: z.array(educationCandidateSchema).default([]),
  certifications: z.array(certificationCandidateSchema).default([]),
  facts: z.array(factCandidateSchema).default([]),
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
      { error: "Candidate data did not match the expected shape." },
      { status: 400 },
    );
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
      reconcileSkeletonCollection({
        kind: "role",
        candidates: parsed.data.roles,
        existing: skeleton.roles,
        isExactDuplicate: isDuplicateRole,
        isLikelyMatch: isLikelyMatchRole,
        label: roleLabel,
      }),
      reconcileSkeletonCollection({
        kind: "education",
        candidates: parsed.data.education,
        existing: skeleton.education,
        isExactDuplicate: isDuplicateEducation,
        isLikelyMatch: isLikelyMatchEducation,
        label: educationLabel,
      }),
      reconcileSkeletonCollection({
        kind: "certification",
        candidates: parsed.data.certifications,
        existing: skeleton.certifications,
        isExactDuplicate: isDuplicateCertification,
        isLikelyMatch: isLikelyMatchCertification,
        label: certificationLabel,
      }),
      reconcileFactCollection({
        candidates: parsed.data.facts,
        existing: existingFacts,
        isExactDuplicate: isDuplicateFact,
        isLikelyMatch: isLikelyMatchFact,
      }),
    ]);

  return NextResponse.json({
    header: parsed.data.header,
    roles: roleResult,
    education: educationResult,
    certifications: certificationResult,
    facts: factResult,
    maxComparisonPairs: MAX_COMPARISON_PAIRS,
  });
}
