import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
  profileContentSchema,
  profileHeaderSchema,
} from "@/types/profile";
import { renderProfileMarkdown } from "@/lib/profile-markdown";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id!))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({
    profile: {
      header: profile.header,
      content: profile.content,
      markdown: profile.markdown,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const headerResult = profileHeaderSchema.safeParse(body.header);
  const contentResult = profileContentSchema.safeParse(body.content);

  if (!headerResult.success || !contentResult.success) {
    return NextResponse.json(
      { error: "Profile data did not match the expected shape." },
      { status: 400 },
    );
  }

  const header = headerResult.data;
  const content = contentResult.data;
  const markdown = renderProfileMarkdown(header, content);
  const userId = session.user.id!;

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(profiles)
      .set({ header, content, markdown, updatedAt: new Date() })
      .where(eq(profiles.id, existing.id));
  } else {
    await db.insert(profiles).values({
      userId,
      header,
      content,
      markdown,
    });
  }

  return NextResponse.json({ header, content, markdown });
}
