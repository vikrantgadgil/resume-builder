import type { ProfileContent, ProfileHeader } from "@/types/profile";

function dateRange(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "";
  if (!endDate) return startDate;
  return `${startDate} - ${endDate}`;
}

export function renderProfileMarkdown(
  header: ProfileHeader,
  content: ProfileContent,
): string {
  const lines: string[] = [];

  if (header.name) lines.push(`# ${header.name}`);
  const contactParts = [
    header.email,
    header.phone,
    header.location,
    header.linkedin,
    header.github,
  ].filter(Boolean);
  if (contactParts.length > 0) lines.push(contactParts.join(" | "));

  if (content.summary) {
    lines.push("", "## Summary", content.summary);
  }

  if (content.experience.length > 0) {
    lines.push("", "## Experience");
    for (const entry of content.experience) {
      const heading = [entry.title, entry.company].filter(Boolean).join(", ");
      const range = dateRange(entry.startDate, entry.endDate);
      lines.push(
        "",
        `### ${heading}${entry.location ? ` (${entry.location})` : ""}`,
      );
      if (range) lines.push(range);
      for (const bullet of entry.bullets) {
        lines.push(`- ${bullet}`);
      }
    }
  }

  if (content.education.length > 0) {
    lines.push("", "## Education");
    for (const entry of content.education) {
      const heading = [entry.degree, entry.institution]
        .filter(Boolean)
        .join(", ");
      const range = dateRange(entry.startDate, entry.endDate);
      lines.push("", `### ${heading}`);
      if (range) lines.push(range);
      if (entry.details) lines.push(entry.details);
    }
  }

  if (content.skills.length > 0) {
    lines.push("", "## Skills", content.skills.join(", "));
  }

  if (content.projects.length > 0) {
    lines.push("", "## Projects");
    for (const entry of content.projects) {
      lines.push("", `### ${entry.name}${entry.link ? ` (${entry.link})` : ""}`);
      if (entry.description) lines.push(entry.description);
      for (const bullet of entry.bullets) {
        lines.push(`- ${bullet}`);
      }
    }
  }

  return lines.join("\n").trim();
}
