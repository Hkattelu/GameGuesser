import { z } from 'zod';

// -------------------------- Zod Schemas --------------------------

export const YesNoClarificationSchema = z.object({
  answer: z.union([
    z.literal('Yes'),
    z.literal('No'),
    z.literal("I don't know"),
  ]),
  clarification: z.string().optional(),
});

export const AnswerToQuestionSchema = z.object({
  type: z.enum(['answer']),
  questionCount: z.number(),
  content: YesNoClarificationSchema,
});

// Guess result now optionally contains a partial score (1, 0.5, 0) and a flag
// indicating whether the player used a hint before submitting the guess. Both
// fields are optional to keep backward-compatibility with historic session
// data that predates the partial scoring system.

export const AnswerToGuessSchema = z.object({
  type: z.enum(['guessResult']),
  questionCount: z.number(),
  content: z.object({
    correct: z.boolean(),
    response: z.string(),
    // 1 for an exact match, 0.5 for a near-miss, 0 otherwise.
    score: z.number().optional(),
    // True when the player requested at least one hint in this session before
    // making the guess that produced this result.
    usedHint: z.boolean().optional(),
  }),
});

export const PlayerQAResponseSchema = AnswerToGuessSchema.or(AnswerToQuestionSchema);

export const AIJsonResponseSchema = z.object({
  type: z.enum(['question', 'guess']),
  content: z.string(),
});


// -------------------------- Inferred Types --------------------------

export type YesNoClarification = z.infer<typeof YesNoClarificationSchema>;
export type AnswerToQuestion = z.infer<typeof AnswerToQuestionSchema>;
export type AnswerToGuess = z.infer<typeof AnswerToGuessSchema>;
export type PlayerQAResponse = z.infer<typeof PlayerQAResponseSchema>;
export type AIJsonResponse = z.infer<typeof AIJsonResponseSchema>;

declare global {
  namespace Express {
    export interface Request {
      user?: {
        username: string;
      };
    }
  }
}
