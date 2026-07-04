import type {
  CertificationCandidate,
  Certification,
  EducationCandidate,
  Education,
  RoleCandidate,
  Role,
} from "@/types/profile";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function isDuplicateRole(
  candidate: RoleCandidate,
  existing: Role[],
): boolean {
  return existing.some(
    (role) =>
      norm(role.employer) === norm(candidate.employer) &&
      norm(role.title) === norm(candidate.title) &&
      norm(role.startDate) === norm(candidate.startDate) &&
      norm(role.endDate) === norm(candidate.endDate),
  );
}

export function isDuplicateEducation(
  candidate: EducationCandidate,
  existing: Education[],
): boolean {
  return existing.some(
    (entry) =>
      norm(entry.institution) === norm(candidate.institution) &&
      norm(entry.degree) === norm(candidate.degree) &&
      norm(entry.year) === norm(candidate.year),
  );
}

export function isDuplicateCertification(
  candidate: CertificationCandidate,
  existing: Certification[],
): boolean {
  return existing.some(
    (entry) =>
      norm(entry.name) === norm(candidate.name) &&
      norm(entry.issuer) === norm(candidate.issuer) &&
      norm(entry.year) === norm(candidate.year),
  );
}

export function isDuplicateFact(
  candidateText: string,
  existing: { text: string }[],
): boolean {
  return existing.some((fact) => norm(fact.text) === norm(candidateText));
}
