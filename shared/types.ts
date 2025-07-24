import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod Schemas (kept in a single place so both FE & BE stay in sync)
// ---------------------------------------------------------------------------

export const YesNoClarificationSchema = z.object({
  answer: z.union([
    z.literal('Yes'),
    z.literal('No'),
    z.literal("I don't know"),
  ]),
  clarification: z.string().optional(),
});

export const AnswerToQuestionSchema = z.object({
  type: z.literal('answer'),
  questionCount: z.number(),
  content: YesNoClarificationSchema,
});

export const AnswerToGuessSchema = z.object({
  type: z.literal('guessResult'),
  questionCount: z.number(),
  content: z.object({
    correct: z.boolean(),
    response: z.string(),
    // Fractional score awarded for this guess (1 = exact, 0.5 = near, 0 = wrong)
    score: z.number().optional(),
    // Whether the player had used a hint at the time of this guess
    usedHint: z.boolean().optional(),
  }),
});

export const PlayerQAResponseSchema = AnswerToQuestionSchema.or(AnswerToGuessSchema);

export const AIQuestionSchema = z.object({
  type: z.literal('question'),
  content: z.string(),
});

export const AIGuessesGameSchema = z.object({
  type: z.literal('guess'),
  content: z.boolean(),
});

export const AIJsonResponseSchema = AIQuestionSchema.or(AIGuessesGameSchema);

// ---------------------------------------------------------------------------
// TypeScript type aliases inferred from the schemas
// ---------------------------------------------------------------------------

export type YesNoClarification = z.infer<typeof YesNoClarificationSchema>;
export type AnswerToQuestion = z.infer<typeof AnswerToQuestionSchema>;
export type AnswerToGuess = z.infer<typeof AnswerToGuessSchema>;
export type PlayerQAResponse = z.infer<typeof PlayerQAResponseSchema>;
export type AIJsonResponse = z.infer<typeof AIJsonResponseSchema>;

// ---------------------------------------------------------------------------
// Misc shared enums / literals used in both FE & BE
// ---------------------------------------------------------------------------

/**
* Enum-like union of possible yes/no buttons that the player can press. The
* string literal names are intentionally capitalised to show nicely on UI
* buttons without additional `toUpperCase()` calls.
*/
export type ResponseOption = 'Yes' | 'No' | 'Unsure';
