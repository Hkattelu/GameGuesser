import { z } from 'zod';
export declare const YesNoClarificationSchema: any;
export declare const AnswerToQuestionSchema: any;
export declare const AnswerToGuessSchema: any;
export declare const PlayerQAResponseSchema: any;
export declare const AIQuestionSchema: any;
export declare const AIGuessesGameSchema: any;
export declare const AIJsonResponseSchema: any;
export type YesNoClarification = z.infer<typeof YesNoClarificationSchema>;
export type AnswerToQuestion = z.infer<typeof AnswerToQuestionSchema>;
export type AnswerToGuess = z.infer<typeof AnswerToGuessSchema>;
export type PlayerQAResponse = z.infer<typeof PlayerQAResponseSchema>;
export type AIJsonResponse = z.infer<typeof AIJsonResponseSchema>;
/**
* Enum-like union of possible yes/no buttons that the player can press. The
* string literal names are intentionally capitalised to show nicely on UI
* buttons without additional `toUpperCase()` calls.
*/
export type ResponseOption = 'Yes' | 'No' | 'Unsure';
