import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderProfileMarkdown } from "@/lib/profile-markdown";
import { emptySkeleton, type ProfileHeader } from "@/types/profile";

const bodySchema = z.object({
  text: z.string().min(1),
  roleRef: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
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
      { error: "A fact needs at least some text." },
      { status: 400 },
    );
  }

  const userId = session.user.id!;
  const { text, roleRef, tags } = parsed.data;

  const [inserted] = await db
    .insert(factsTable)
    .values({
      userId,
      text,
      roleRef,
      tags,
      source: "manual",
    })
    .returning();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (profile) {
    const allFacts = await db
      .select()
      .from(factsTable)
      .where(eq(factsTable.userId, userId));
    const skeleton = { ...emptySkeleton(), ...(profile.content as object) };
    const markdown = renderProfileMarkdown(
      profile.header as ProfileHeader,
      skeleton,
      allFacts,
    );
    await db
      .update(profiles)
      .set({ markdown, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));
  }

  return NextResponse.json({ fact: inserted });
}
