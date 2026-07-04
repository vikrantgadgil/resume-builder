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

export const experienceEntrySchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;

export const educationEntrySchema = z.object({
  institution: z.string().default(""),
  degree: z.string().default(""),
  field: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  details: z.string().default(""),
});

export type EducationEntry = z.infer<typeof educationEntrySchema>;

export const projectEntrySchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  bullets: z.array(z.string()).default([]),
  link: z.string().default(""),
});

export type ProjectEntry = z.infer<typeof projectEntrySchema>;

export const profileContentSchema = z.object({
  summary: z.string().default(""),
  experience: z.array(experienceEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  skills: z.array(z.string()).default([]),
  projects: z.array(projectEntrySchema).default([]),
});

export type ProfileContent = z.infer<typeof profileContentSchema>;

export const structuredProfileSchema = z.object({
  header: profileHeaderSchema,
  content: profileContentSchema,
});

export type StructuredProfile = z.infer<typeof structuredProfileSchema>;

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

export function emptyContent(): ProfileContent {
  return {
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
  };
}
