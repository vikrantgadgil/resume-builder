import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import { applicationDraftSchema } from "@/types/application";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const json = await request.json();
  const parsed = applicationDraftSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Application data did not match the expected shape." },
      { status: 400 },
    );
  }

  const [inserted] = await db
    .insert(applications)
    .values({
      userId: session.user.id!,
      jobTitle: parsed.data.jobTitle,
      company: parsed.data.company,
      jobDescription: parsed.data.jobDescription,
      keywords: parsed.data.keywords,
    })
    .returning();

  return NextResponse.json({ application: inserted });
}
