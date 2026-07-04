import { z } from "zod";

export const skeletonClassificationSchema = z.enum([
  "duplicate",
  "likely_same",
  "different",
]);

export type SkeletonClassification = z.infer<
  typeof skeletonClassificationSchema
>;

export const factClassificationSchema = z.enum([
  "duplicate",
  "overlapping",
  "distinct",
]);

export type FactClassification = z.infer<typeof factClassificationSchema>;

export const skeletonComparisonResponseSchema = z.object({
  results: z.array(
    z.object({
      pairIndex: z.number(),
      classification: skeletonClassificationSchema,
    }),
  ),
});

export const factComparisonResponseSchema = z.object({
  results: z.array(
    z.object({
      pairIndex: z.number(),
      classification: factClassificationSchema,
    }),
  ),
});

export const MAX_COMPARISON_PAIRS = 40;
