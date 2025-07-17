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
  }),
});

export const PlayerQAResponseSchema = z.union([AnswerToQuestionSchema, AnswerToGuessSchema]);

export const AIJsonResponseSchema = z.object({
  type: z.union([z.literal('question'), z.literal('guess')]),
  content: z.string(),
});


// -------------------------- Inferred Types --------------------------

export type YesNoClarification = z.infer<typeof YesNoClarificationSchema>;
export type AnswerToQuestion = z.infer<typeof AnswerToQuestionSchema>;
export type AnswerToGuess = z.infer<typeof AnswerToGuessSchema>;
export type PlayerQAResponse = z.infer<typeof PlayerQAResponseSchema>;
export type AIJsonResponse = z.infer<typeof AIJsonResponseSchema>;
