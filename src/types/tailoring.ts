import { z } from "zod";

export const factSelectionResponseSchema = z.object({
  selectedFactIds: z.array(z.string()),
});

export type FactSelectionResponse = z.infer<typeof factSelectionResponseSchema>;

export const phrasedBulletSchema = z.object({
  factId: z.string(),
  phrasedText: z.string(),
});

export const phraseBulletsResponseSchema = z.object({
  bullets: z.array(phrasedBulletSchema),
});

export type PhraseBulletsResponse = z.infer<typeof phraseBulletsResponseSchema>;
