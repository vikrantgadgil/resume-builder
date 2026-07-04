import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import {
  certificationCandidateSchema,
  educationCandidateSchema,
  emptySkeleton,
  roleCandidateSchema,
  type ProfileHeader,
} from "@/types/profile";
import { renderProfileMarkdown } from "@/lib/profile-markdown";

const selfAction = z.enum(["keep_a", "keep_b", "keep_both"]);
const factSelfAction = z.enum(["keep_a", "keep_b", "keep_both", "merge"]);

const skeletonResolution = (valueSchema: z.ZodTypeAny) =>
  z.object({
    aId: z.string(),
    bId: z.string(),
    action: selfAction,
    value: valueSchema.optional(),
  });

const bodySchema = z.object({
  roleResolutions: z.array(skeletonResolution(roleCandidateSchema)).default([]),
  educationResolutions: z
    .array(skeletonResolution(educationCandidateSchema))
    .default([]),
  certificationResolutions: z
    .array(skeletonResolution(certificationCandidateSchema))
    .default([]),
  factResolutions: z
    .array(
      z.object({
        aId: z.string(),
        bId: z.string(),
        action: factSelfAction,
        value: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .default([]),
});

function applySkeletonResolutions<T extends { id: string }>(
  items: T[],
  resolutions: {
    aId: string;
    bId: string;
    action: "keep_a" | "keep_b" | "keep_both";
    value?: unknown;
  }[],
): T[] {
  const toDelete = new Set<string>();
  const updates = new Map<string, Record<string, unknown>>();

  for (const r of resolutions) {
    if (r.action === "keep_a") {
      toDelete.add(r.bId);
      if (r.value) updates.set(r.aId, r.value as Record<string, unknown>);
    } else if (r.action === "keep_b") {
      toDelete.add(r.aId);
      if (r.value) updates.set(r.bId, r.value as Record<string, unknown>);
    }
  }

  return items
    .filter((item) => !toDelete.has(item.id))
    .map((item) => {
      const update = updates.get(item.id);
      return update ? ({ ...item, ...update, id: item.id } as T) : item;
    });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Resolution data did not match the expected shape." },
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
    return NextResponse.json({ error: "No profile to reconcile." }, { status: 400 });
  }

  const skeleton = { ...emptySkeleton(), ...(profile.content as object) };

  const roles = applySkeletonResolutions(
    skeleton.roles,
    parsed.data.roleResolutions,
  );
  const education = applySkeletonResolutions(
    skeleton.education,
    parsed.data.educationResolutions,
  );
  const certifications = applySkeletonResolutions(
    skeleton.certifications,
    parsed.data.certificationResolutions,
  );

  const mergedSkeleton = { roles, education, certifications };

  for (const resolution of parsed.data.factResolutions) {
    if (resolution.action === "keep_a") {
      await db.delete(factsTable).where(eq(factsTable.id, resolution.bId));
      if (resolution.value) {
        await db
          .update(factsTable)
          .set({
            text: resolution.value,
            tags: resolution.tags ?? [],
            updatedAt: new Date(),
          })
          .where(eq(factsTable.id, resolution.aId));
      }
    } else if (resolution.action === "keep_b") {
      await db.delete(factsTable).where(eq(factsTable.id, resolution.aId));
      if (resolution.value) {
        await db
          .update(factsTable)
          .set({
            text: resolution.value,
            tags: resolution.tags ?? [],
            updatedAt: new Date(),
          })
          .where(eq(factsTable.id, resolution.bId));
      }
    } else if (resolution.action === "merge") {
      await db.delete(factsTable).where(eq(factsTable.id, resolution.bId));
      await db
        .update(factsTable)
        .set({
          text: resolution.value ?? "",
          tags: resolution.tags ?? [],
          updatedAt: new Date(),
        })
        .where(eq(factsTable.id, resolution.aId));
    }
    // keep_both: no-op
  }

  const finalFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  const markdown = renderProfileMarkdown(
    profile.header as ProfileHeader,
    mergedSkeleton,
    finalFacts,
  );

  await db
    .update(profiles)
    .set({ content: mergedSkeleton, markdown, updatedAt: new Date() })
    .where(eq(profiles.id, profile.id));

  return NextResponse.json({
    header: profile.header,
    skeleton: mergedSkeleton,
    facts: finalFacts,
  });
}
