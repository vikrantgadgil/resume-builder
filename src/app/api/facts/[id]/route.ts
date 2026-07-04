import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import { renderProfileMarkdown } from "@/lib/profile-markdown";
import { emptySkeleton, type ProfileHeader } from "@/types/profile";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id!;

  await db
    .delete(factsTable)
    .where(and(eq(factsTable.id, id), eq(factsTable.userId, userId)));

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (profile) {
    const remainingFacts = await db
      .select()
      .from(factsTable)
      .where(eq(factsTable.userId, userId));
    const skeleton = { ...emptySkeleton(), ...(profile.content as object) };
    const markdown = renderProfileMarkdown(
      profile.header as ProfileHeader,
      skeleton,
      remainingFacts,
    );
    await db
      .update(profiles)
      .set({ markdown, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));
  }

  return NextResponse.json({ success: true });
}
