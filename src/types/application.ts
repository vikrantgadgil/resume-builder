import { z } from "zod";

export const rankedKeywordSchema = z.object({
  term: z.string(),
  score: z.number(),
});

export type RankedKeyword = z.infer<typeof rankedKeywordSchema>;

export const applicationDraftSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required."),
  company: z.string().min(1, "Company is required."),
  jobDescription: z.string().min(1, "Job description is required."),
  keywords: z.array(rankedKeywordSchema).default([]),
});

export type ApplicationDraft = z.infer<typeof applicationDraftSchema>;
