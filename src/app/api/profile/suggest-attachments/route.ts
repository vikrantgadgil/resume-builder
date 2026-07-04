import { NextResponse } from "next/server";
import { eq, isNull, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { facts as factsTable, profiles } from "@/lib/db/schema";
import { emptySkeleton } from "@/types/profile";
import { suggestRoleAttachments } from "@/lib/ai/suggest-role-attachments";
import { MAX_ATTACHMENT_SUGGESTIONS_PER_RUN } from "@/types/role-attachment";

export async function POST() {
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

  if (!profile) {
    return NextResponse.json({ suggestions: [], skippedCount: 0 });
  }

  const skeleton = { ...emptySkeleton(), ...(profile.content as object) };

  if (skeleton.roles.length === 0) {
    return NextResponse.json({ suggestions: [], skippedCount: 0 });
  }

  const unattachedFacts = await db
    .select()
    .from(factsTable)
    .where(and(eq(factsTable.userId, userId), isNull(factsTable.roleRef)));

  if (unattachedFacts.length === 0) {
    return NextResponse.json({ suggestions: [], skippedCount: 0 });
  }

  const capped = unattachedFacts.slice(0, MAX_ATTACHMENT_SUGGESTIONS_PER_RUN);
  const skippedCount = unattachedFacts.length - capped.length;

  const result = await suggestRoleAttachments(
    capped.map((f) => ({ text: f.text })),
    skeleton.roles.map((r) => ({ employer: r.employer, title: r.title })),
  );

  if (result === null) {
    return NextResponse.json(
      {
        error:
          "The AI request failed or the response did not match the expected shape. No suggestions could be made.",
      },
      { status: 502 },
    );
  }

  const suggestions = result
    .map((s) => {
      const fact = capped[s.factIndex];
      const role =
        s.roleIndex !== null ? skeleton.roles[s.roleIndex] : undefined;
      if (!fact || (s.roleIndex !== null && !role)) return null;
      if (!role) return null;
      return {
        factId: fact.id,
        factText: fact.text,
        roleId: role.id,
        roleLabel: `${role.title} at ${role.employer}`,
        confidence: s.confidence,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return NextResponse.json({ suggestions, skippedCount });
}
