import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  structureFullProfile,
  structureProfileContent,
} from "@/lib/ai/structure-profile";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const rawText = typeof body.rawText === "string" ? body.rawText : "";
  const contentOnly = body.contentOnly === true;

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "No text was provided to structure." },
      { status: 400 },
    );
  }

  if (contentOnly) {
    const result = await structureProfileContent(rawText);
    if (!result.success) {
      return NextResponse.json({ fallback: true, reason: result.reason });
    }
    return NextResponse.json({ fallback: false, content: result.data });
  }

  const result = await structureFullProfile(rawText);
  if (!result.success) {
    return NextResponse.json({ fallback: true, reason: result.reason });
  }
  return NextResponse.json({
    fallback: false,
    header: result.data.header,
    content: result.data.content,
  });
}
