import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import { profileHeaderSchema, skeletonSchema } from "@/types/profile";
import { renderProfileMarkdown } from "@/lib/profile-markdown";

export async function GET() {
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

  const userFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  if (!profile) {
    return NextResponse.json({ profile: null, facts: userFacts });
  }

  return NextResponse.json({
    profile: {
      header: profile.header,
      skeleton: profile.content,
      markdown: profile.markdown,
    },
    facts: userFacts,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const headerResult = profileHeaderSchema.safeParse(body.header);
  const skeletonResult = skeletonSchema.safeParse(body.skeleton);

  if (!headerResult.success || !skeletonResult.success) {
    return NextResponse.json(
      { error: "Profile data did not match the expected shape." },
      { status: 400 },
    );
  }

  const header = headerResult.data;
  const skeleton = skeletonResult.data;
  const userId = session.user.id!;

  const userFacts = await db
    .select()
    .from(factsTable)
    .where(eq(factsTable.userId, userId));

  const markdown = renderProfileMarkdown(header, skeleton, userFacts);

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(profiles)
      .set({ header, content: skeleton, markdown, updatedAt: new Date() })
      .where(eq(profiles.id, existing.id));
  } else {
    await db.insert(profiles).values({
      userId,
      header,
      content: skeleton,
      markdown,
    });
  }

  return NextResponse.json({ header, skeleton, markdown });
}
