import { NextResponse } from "next/server";
import {
  MAX_UPLOAD_BYTES,
  detectFileType,
  parseDocument,
} from "@/lib/parse";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file was uploaded." },
      { status: 400 },
    );
  }

  const fileType = detectFileType(file.name);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a .pdf or .docx file." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum size is 5MB." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseDocument(buffer, fileType);

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            "No readable text was found in this file. Try a different file.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Could not read this file. It may be corrupted or password protected." },
      { status: 422 },
    );
  }
}
