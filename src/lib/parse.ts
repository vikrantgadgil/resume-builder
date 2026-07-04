import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"] as const;

export type ParsedFileType = "pdf" | "docx";

export function detectFileType(fileName: string): ParsedFileType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}

export async function parseDocument(
  buffer: Buffer,
  fileType: ParsedFileType,
): Promise<string> {
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText({ pageJoiner: "" });
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
