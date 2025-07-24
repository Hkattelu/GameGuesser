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

export const AnswerToGuessSchema = z.object({
  type: z.enum(['guessResult']),
  questionCount: z.number(),
  content: z.object({
    correct: z.boolean(),
    response: z.string(),
    score: z.number().optional().describe('Fractional score awarded for this guess (1 = exact, 0.5 = near, 0 = wrong)'),
    usedHint: z.boolean().optional().describe('Whether the player had used a hint at the time of this guess'),
  }),
});

export const PlayerQAResponseSchema = AnswerToQuestionSchema.or(AnswerToGuessSchema);

export const AIQuestionSchema = z.object({
  type: z.enum(['question']),
  content: z.string(),
});

export const AIGuessesGameSchema = z.object({
  type: z.enum(['guess']),
  content: z.boolean(),
});

export const AIJsonResponseSchema = AIQuestionSchema.or(AIGuessesGameSchema);

export const specialHintSchema = z.object({ special: z.string() });

// -------------------------- Typescript types --------------------------

export type YesNoClarification = z.infer<typeof YesNoClarificationSchema>;
export type AnswerToQuestion = z.infer<typeof AnswerToQuestionSchema>;
export type AnswerToGuess = z.infer<typeof AnswerToGuessSchema>;
export type PlayerQAResponse = z.infer<typeof PlayerQAResponseSchema>;
export type AIJsonResponse = z.infer<typeof AIJsonResponseSchema>;

// Literal union shared with the frontend for button rendering.
export type ResponseOption = 'Yes' | 'No' | 'Unsure';

// Re-export everything from the canonical shared module so downstream imports
// can gradually move over while still relying on this file.

// -----------------------------------------------------------------------
// Augment Express `Request` so that `req.user` is recognised everywhere.
// -----------------------------------------------------------------------

declare global {
  namespace Express {
    export interface Request {
      user?: {
        username: string;
      };
    }
  }
}