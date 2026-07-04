import { z } from "zod";

export const profileHeaderSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
});

export type ProfileHeader = z.infer<typeof profileHeaderSchema>;

export function emptyHeader(): ProfileHeader {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
  };
}

export const roleSchema = z.object({
  id: z.string(),
  employer: z.string().default(""),
  title: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  location: z.string().default(""),
});

export type Role = z.infer<typeof roleSchema>;

export const educationSchema = z.object({
  id: z.string(),
  institution: z.string().default(""),
  degree: z.string().default(""),
  field: z.string().default(""),
  year: z.string().default(""),
});

export type Education = z.infer<typeof educationSchema>;

export const certificationSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  issuer: z.string().default(""),
  year: z.string().default(""),
});

export type Certification = z.infer<typeof certificationSchema>;

export const skeletonSchema = z.object({
  roles: z.array(roleSchema).default([]),
  education: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
});

export type Skeleton = z.infer<typeof skeletonSchema>;

export function emptySkeleton(): Skeleton {
  return { roles: [], education: [], certifications: [] };
}

// Candidate shapes proposed by DeepSeek during import, before the user
// approves them and they are assigned real ids and saved.

export const roleCandidateSchema = z.object({
  employer: z.string().default(""),
  title: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  location: z.string().default(""),
});

export type RoleCandidate = z.infer<typeof roleCandidateSchema>;

export const educationCandidateSchema = z.object({
  institution: z.string().default(""),
  degree: z.string().default(""),
  field: z.string().default(""),
  year: z.string().default(""),
});

export type EducationCandidate = z.infer<typeof educationCandidateSchema>;

export const certificationCandidateSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  year: z.string().default(""),
});

export type CertificationCandidate = z.infer<typeof certificationCandidateSchema>;

export const factCandidateSchema = z.object({
  text: z.string(),
  tags: z.array(z.string()).default([]),
});

export type FactCandidate = z.infer<typeof factCandidateSchema>;

export const extractionResultSchema = z.object({
  roles: z.array(roleCandidateSchema).default([]),
  education: z.array(educationCandidateSchema).default([]),
  certifications: z.array(certificationCandidateSchema).default([]),
  facts: z.array(factCandidateSchema).default([]),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const factSchema = z.object({
  id: z.string(),
  text: z.string(),
  roleRef: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  source: z.enum(["import", "manual"]),
});

export type Fact = z.infer<typeof factSchema>;
