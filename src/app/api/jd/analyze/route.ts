import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { extractKeywords, extractTitleAndCompany } from "@/lib/keywords";

const bodySchema = z.object({
  text: z.string().min(1),
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
      { error: "No job description text was provided." },
      { status: 400 },
    );
  }

  const { title, company } = extractTitleAndCompany(parsed.data.text);
  const keywords = extractKeywords(parsed.data.text);

  return NextResponse.json({ title, company, keywords });
}
