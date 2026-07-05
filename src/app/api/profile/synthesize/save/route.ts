import { NextResponse } from "next/server";
import { z } from "zod";
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
} from "@/types/profile";
import { resolveSuggestedRole } from "@/lib/knowledge-merge";
import { renderProfileMarkdown } from "@/lib/profile-markdown";

const bodySchema = z.object({
  header: profileHeaderSchema,
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
      { error: "Synthesis data did not match the expected shape." },
      { status: 400 },
    );
  }

  const userId = session.user.id!;

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "A profile already exists." },
      { status: 400 },
    );
  }

  const roles = parsed.data.roles.map((r) => ({
    id: crypto.randomUUID(),
    ...r,
  }));
  const education = parsed.data.education.map((e) => ({
    id: crypto.randomUUID(),
    ...e,
  }));
  const certifications = parsed.data.certifications.map((c) => ({
    id: crypto.randomUUID(),
    ...c,
  }));
  const skeleton = { roles, education, certifications };

  const insertedFacts =
    parsed.data.facts.length > 0
      ? await db
          .insert(factsTable)
          .values(
            parsed.data.facts.map((f) => ({
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

  const markdown = renderProfileMarkdown(
    parsed.data.header,
    skeleton,
    insertedFacts,
  );

  await db.insert(profiles).values({
    userId,
    header: parsed.data.header,
    content: skeleton,
    markdown,
  });

  return NextResponse.json({
    header: parsed.data.header,
    skeleton,
    facts: insertedFacts,
  });
}
