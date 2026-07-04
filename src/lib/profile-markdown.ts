import type { ProfileHeader, Skeleton } from "@/types/profile";

type FactForRendering = {
  text: string;
  roleRef: string | null;
  tags: string[] | null;
};

function dateRange(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "";
  if (!endDate) return startDate;
  return `${startDate} - ${endDate}`;
}

export function renderProfileMarkdown(
  header: ProfileHeader,
  skeleton: Skeleton,
  facts: FactForRendering[],
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

  if (skeleton.roles.length > 0) {
    lines.push("", "## Experience");
    for (const role of skeleton.roles) {
      const heading = [role.title, role.employer].filter(Boolean).join(", ");
      const range = dateRange(role.startDate, role.endDate);
      lines.push(
        "",
        `### ${heading}${role.location ? ` (${role.location})` : ""}`,
      );
      if (range) lines.push(range);
      const roleFacts = facts.filter((f) => f.roleRef === role.id);
      for (const fact of roleFacts) {
        lines.push(`- ${fact.text}`);
      }
    }
  }

  if (skeleton.education.length > 0) {
    lines.push("", "## Education");
    for (const entry of skeleton.education) {
      const heading = [entry.degree, entry.institution]
        .filter(Boolean)
        .join(", ");
      lines.push("", `### ${heading}`);
      const parts = [entry.field, entry.year].filter(Boolean).join(", ");
      if (parts) lines.push(parts);
    }
  }

  if (skeleton.certifications.length > 0) {
    lines.push("", "## Certifications");
    for (const cert of skeleton.certifications) {
      const parts = [cert.name, cert.issuer, cert.year]
        .filter(Boolean)
        .join(", ");
      lines.push(`- ${parts}`);
    }
  }

  const unattachedFacts = facts.filter((f) => !f.roleRef);
  if (unattachedFacts.length > 0) {
    const byTag = new Map<string, FactForRendering[]>();
    for (const fact of unattachedFacts) {
      const tags = fact.tags && fact.tags.length > 0 ? fact.tags : ["General"];
      for (const tag of tags) {
        if (!byTag.has(tag)) byTag.set(tag, []);
        byTag.get(tag)!.push(fact);
      }
    }

    lines.push("", "## Additional Highlights");
    for (const [tag, tagFacts] of byTag) {
      lines.push("", `### ${tag}`);
      for (const fact of tagFacts) {
        lines.push(`- ${fact.text}`);
      }
    }
  }

  return lines.join("\n").trim();
}
