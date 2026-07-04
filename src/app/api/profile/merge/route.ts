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
  emptyHeader,
  emptySkeleton,
  type ProfileHeader,
} from "@/types/profile";
import { z } from "zod";
import {
  isDuplicateCertification,
  isDuplicateEducation,
  isDuplicateFact,
  isDuplicateRole,
} from "@/lib/knowledge-merge";
import { renderProfileMarkdown } from "@/lib/profile-markdown";

const bodySchema = z.object({
  header: profileHeaderSchema.optional(),
  approvedRoles: z.array(roleCandidateSchema).default([]),
  approvedEducation: z.array(educationCandidateSchema).default([]),
  approvedCertifications: z.array(certificationCandidateSchema).default([]),
  approvedFacts: z.array(factCandidateSchema).default([]),
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
      { error: "Merge data did not match the expected shape." },
      { status: 400 },
    );
  }

  const {
    header: incomingHeader,
    approvedRoles,
    approvedEducation,
    approvedCertifications,
    approvedFacts,
  } = parsed.data;

  const userId = session.user.id!;

  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const existingFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  const header = existingProfile
    ? (existingProfile.header as ProfileHeader)
    : (incomingHeader ?? emptyHeader());
  const skeleton = existingProfile
    ? { ...emptySkeleton(), ...(existingProfile.content as object) }
    : emptySkeleton();

  const newRoles = approvedRoles
    .filter((r) => !isDuplicateRole(r, skeleton.roles))
    .map((r) => ({ id: crypto.randomUUID(), ...r }));
  const newEducation = approvedEducation
    .filter((e) => !isDuplicateEducation(e, skeleton.education))
    .map((e) => ({ id: crypto.randomUUID(), ...e }));
  const newCertifications = approvedCertifications
    .filter((c) => !isDuplicateCertification(c, skeleton.certifications))
    .map((c) => ({ id: crypto.randomUUID(), ...c }));

  const mergedSkeleton = {
    roles: [...skeleton.roles, ...newRoles],
    education: [...skeleton.education, ...newEducation],
    certifications: [...skeleton.certifications, ...newCertifications],
  };

  const newFacts = approvedFacts.filter(
    (f) => !isDuplicateFact(f.text, existingFacts),
  );

  const insertedFacts =
    newFacts.length > 0
      ? await db
          .insert(factsTable)
          .values(
            newFacts.map((f) => ({
              userId,
              text: f.text,
              roleRef: null,
              tags: f.tags,
              source: "import" as const,
            })),
          )
          .returning()
      : [];

  const allFacts = [...existingFacts, ...insertedFacts];
  const markdown = renderProfileMarkdown(header, mergedSkeleton, allFacts);

  if (existingProfile) {
    await db
      .update(profiles)
      .set({ content: mergedSkeleton, markdown, updatedAt: new Date() })
      .where(eq(profiles.id, existingProfile.id));
  } else {
    await db.insert(profiles).values({
      userId,
      header,
      content: mergedSkeleton,
      markdown,
    });
  }

  return NextResponse.json({
    header,
    skeleton: mergedSkeleton,
    facts: allFacts,
    addedRoles: newRoles.length,
    addedEducation: newEducation.length,
    addedCertifications: newCertifications.length,
    addedFacts: insertedFacts.length,
    skippedDuplicateRoles: approvedRoles.length - newRoles.length,
    skippedDuplicateEducation: approvedEducation.length - newEducation.length,
    skippedDuplicateCertifications:
      approvedCertifications.length - newCertifications.length,
    skippedDuplicateFacts: approvedFacts.length - newFacts.length,
  });
}
