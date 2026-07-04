import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import { emptySkeleton, type ProfileHeader } from "@/types/profile";
import { renderProfileMarkdown } from "@/lib/profile-markdown";

const bodySchema = z.object({
  accepted: z.array(
    z.object({
      factId: z.string(),
      roleId: z.string(),
    }),
  ),
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
      { error: "Attachment data did not match the expected shape." },
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
    return NextResponse.json({ error: "No profile to update." }, { status: 400 });
  }

  for (const { factId, roleId } of parsed.data.accepted) {
    await db
      .update(factsTable)
      .set({ roleRef: roleId, updatedAt: new Date() })
      .where(eq(factsTable.id, factId));
  }

  const finalFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  const skeleton = { ...emptySkeleton(), ...(profile.content as object) };
  const markdown = renderProfileMarkdown(
    profile.header as ProfileHeader,
    skeleton,
    finalFacts,
  );

  await db
    .update(profiles)
    .set({ markdown, updatedAt: new Date() })
    .where(eq(profiles.id, profile.id));

  return NextResponse.json({
    header: profile.header,
    skeleton,
    facts: finalFacts,
    attachedCount: parsed.data.accepted.length,
  });
}
