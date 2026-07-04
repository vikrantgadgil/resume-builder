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
  resolveSuggestedRole,
} from "@/lib/knowledge-merge";
import { renderProfileMarkdown } from "@/lib/profile-markdown";

const resolutionAction = z.enum(["keep_existing", "keep_new", "keep_both"]);
const factResolutionAction = z.enum([
  "keep_existing",
  "keep_new",
  "keep_both",
  "merge",
]);

const roleResolutionSchema = z.object({
  existingId: z.string(),
  action: resolutionAction,
  value: roleCandidateSchema,
});
const educationResolutionSchema = z.object({
  existingId: z.string(),
  action: resolutionAction,
  value: educationCandidateSchema,
});
const certificationResolutionSchema = z.object({
  existingId: z.string(),
  action: resolutionAction,
  value: certificationCandidateSchema,
});
const factResolutionSchema = z.object({
  existingFactId: z.string(),
  action: factResolutionAction,
  value: z.string(),
  tags: z.array(z.string()).default([]),
});

const bodySchema = z.object({
  header: profileHeaderSchema.optional(),
  approvedRoles: z.array(roleCandidateSchema).default([]),
  approvedEducation: z.array(educationCandidateSchema).default([]),
  approvedCertifications: z.array(certificationCandidateSchema).default([]),
  approvedFacts: z.array(factCandidateSchema).default([]),
  roleResolutions: z.array(roleResolutionSchema).default([]),
  educationResolutions: z.array(educationResolutionSchema).default([]),
  certificationResolutions: z.array(certificationResolutionSchema).default([]),
  factResolutions: z.array(factResolutionSchema).default([]),
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
    roleResolutions,
    educationResolutions,
    certificationResolutions,
    factResolutions,
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

  let roles = [...skeleton.roles, ...newRoles];
  let education = [...skeleton.education, ...newEducation];
  let certifications = [...skeleton.certifications, ...newCertifications];

  for (const resolution of roleResolutions) {
    if (resolution.action === "keep_existing") continue;
    if (resolution.action === "keep_new") {
      roles = roles.map((role) =>
        role.id === resolution.existingId
          ? { id: role.id, ...resolution.value }
          : role,
      );
    } else if (resolution.action === "keep_both") {
      roles = [...roles, { id: crypto.randomUUID(), ...resolution.value }];
    }
  }

  for (const resolution of educationResolutions) {
    if (resolution.action === "keep_existing") continue;
    if (resolution.action === "keep_new") {
      education = education.map((entry) =>
        entry.id === resolution.existingId
          ? { id: entry.id, ...resolution.value }
          : entry,
      );
    } else if (resolution.action === "keep_both") {
      education = [...education, { id: crypto.randomUUID(), ...resolution.value }];
    }
  }

  for (const resolution of certificationResolutions) {
    if (resolution.action === "keep_existing") continue;
    if (resolution.action === "keep_new") {
      certifications = certifications.map((entry) =>
        entry.id === resolution.existingId
          ? { id: entry.id, ...resolution.value }
          : entry,
      );
    } else if (resolution.action === "keep_both") {
      certifications = [
        ...certifications,
        { id: crypto.randomUUID(), ...resolution.value },
      ];
    }
  }

  const mergedSkeleton = { roles, education, certifications };

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
              roleRef: resolveSuggestedRole(
                f.suggestedRoleEmployer,
                f.suggestedRoleTitle,
                roles,
              ),
              tags: f.tags,
              source: "import" as const,
            })),
          )
          .returning()
      : [];

  for (const resolution of factResolutions) {
    if (resolution.action === "keep_existing") continue;
    if (resolution.action === "keep_new" || resolution.action === "merge") {
      await db
        .update(factsTable)
        .set({ text: resolution.value, tags: resolution.tags, updatedAt: new Date() })
        .where(eq(factsTable.id, resolution.existingFactId));
    } else if (resolution.action === "keep_both") {
      const [inserted] = await db
        .insert(factsTable)
        .values({
          userId,
          text: resolution.value,
          roleRef: null,
          tags: resolution.tags,
          source: "import" as const,
        })
        .returning();
      insertedFacts.push(inserted);
    }
  }

  const finalFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  const markdown = renderProfileMarkdown(header, mergedSkeleton, finalFacts);

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
    facts: finalFacts,
    addedRoles: newRoles.length,
    addedEducation: newEducation.length,
    addedCertifications: newCertifications.length,
    addedFacts: insertedFacts.length,
    skippedDuplicateRoles: approvedRoles.length - newRoles.length,
    skippedDuplicateEducation: approvedEducation.length - newEducation.length,
    skippedDuplicateCertifications:
      approvedCertifications.length - newCertifications.length,
    skippedDuplicateFacts: approvedFacts.length - newFacts.length,
    resolvedRoles: roleResolutions.length,
    resolvedEducation: educationResolutions.length,
    resolvedCertifications: certificationResolutions.length,
    resolvedFacts: factResolutions.length,
  });
}
