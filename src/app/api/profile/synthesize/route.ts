import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { synthesizeKnowledgeBase } from "@/lib/ai/synthesize-knowledge";

const bodySchema = z.object({
  sources: z
    .array(z.object({ label: z.string(), text: z.string().min(1) }))
    .min(1),
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
      { error: "No source material was provided." },
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
      {
        error:
          'A profile already exists. Use "Import another resume" to add to it instead.',
      },
      { status: 400 },
    );
  }

  const result = await synthesizeKnowledgeBase(parsed.data.sources);

  if (!result.success) {
    return NextResponse.json({ fallback: true, reason: result.reason });
  }

  return NextResponse.json({
    fallback: false,
    header: result.header,
    roles: result.data.roles,
    education: result.data.education,
    certifications: result.data.certifications,
    facts: result.data.facts,
  });
}
