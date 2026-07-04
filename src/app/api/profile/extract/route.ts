import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
  extractFullKnowledgeBase,
  extractKnowledgeBaseUpdate,
} from "@/lib/ai/extract-knowledge";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const rawText = typeof body.rawText === "string" ? body.rawText : "";

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "No text was provided to extract." },
      { status: 400 },
    );
  }

  const userId = session.user.id!;
  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!existing) {
    const result = await extractFullKnowledgeBase(rawText);
    if (!result.success) {
      return NextResponse.json({ fallback: true, reason: result.reason });
    }
    return NextResponse.json({
      fallback: false,
      hasHeader: true,
      header: result.header,
      roles: result.data.roles,
      education: result.data.education,
      certifications: result.data.certifications,
      facts: result.data.facts,
    });
  }

  const result = await extractKnowledgeBaseUpdate(rawText);
  if (!result.success) {
    return NextResponse.json({ fallback: true, reason: result.reason });
  }
  return NextResponse.json({
    fallback: false,
    hasHeader: false,
    roles: result.data.roles,
    education: result.data.education,
    certifications: result.data.certifications,
    facts: result.data.facts,
  });
}
