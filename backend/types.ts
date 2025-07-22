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
    // Fractional score awarded for this guess (1 = exact, 0.5 = near, 0 = wrong)
    score: z.number().optional(),
    // Whether the player had used a hint at the time of this guess
    usedHint: z.boolean().optional(),
  }),
});

export const PlayerQAResponseSchema = AnswerToGuessSchema.or(AnswerToQuestionSchema);

export const AIQuestionSchema = z.object({
  type: z.enum(['question']),
  content: z.string(),
});

export const AIGuessesGameSchema = z.object({
  type: z.enum(['guess']),
  content: z.boolean(),
});

export const AIJsonResponseSchema = AIQuestionSchema.or(AIGuessesGameSchema);

// -------------------------- Typescript types --------------------------

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
