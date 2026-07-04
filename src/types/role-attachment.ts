import { z } from "zod";
import { attachmentConfidenceSchema } from "@/types/profile";

export const roleAttachmentSuggestionResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      factIndex: z.number(),
      roleIndex: z.number().nullable(),
      confidence: attachmentConfidenceSchema.nullable(),
    }),
  ),
});

export type RoleAttachmentSuggestionResponse = z.infer<
  typeof roleAttachmentSuggestionResponseSchema
>;

// Unlike Phase 3.6's pairwise comparison cap, this is a single classification
// call over all facts at once (N facts against M roles), not a combinatorial
// pair count, so it can afford to be much higher. This is a safety net for
// pathological knowledge base sizes, not a routine limit.
export const MAX_ATTACHMENT_SUGGESTIONS_PER_RUN = 200;
