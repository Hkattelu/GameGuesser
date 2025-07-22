
import { genkit, Genkit } from 'genkit';
import { googleAI, gemini20Flash } from '@genkit-ai/googleai';
import { ZodType } from 'zod';
import { PlayerQAResponse, AIJsonResponse } from './types.js';

/**
 * This file centralizes initialization of Firebase Genkit (v5 AI SDK)
 * for server-side use. All backend modules should import helpers from
 * here instead of talking to Gemini/Google AI endpoints directly.
 */

// ---------------------------------------------------------------------------
// Genkit client bootstrapping
// ---------------------------------------------------------------------------

// The GoogleAI plugin wires up Genkit to the Gemini model family. We default
// to the flash variant for latency. The plugin automatically picks up service
// account credentials from the standard Firebase env vars (GOOGLE_APPLICATION_CREDENTIALS
// or the Cloud Functions runtime). No explicit API key handling is required.

export const ai: Genkit = genkit({
  plugins: [googleAI()],
  // If we need to switch to a different model later we can override per call.
  model: gemini20Flash,
});

// ---------------------------------------------------------------------------
// Typings shared with callers
// ---------------------------------------------------------------------------

type UserMessage = {
  role: 'user';
  content: string;
};

type ModelMessage = {
  role: 'model';
  content: PlayerQAResponse | AIJsonResponse;
};

export type ChatMessage = UserMessage | ModelMessage;

/**
 * Thin wrapper around `ai.generate()` that returns strongly-typed structured
 * JSON using a Zod schema. This replaces the previous handcrafted HTTP call
 * logic.
 *
 * - `schema` describes the JSON shape we expect from the model.
 * - `prompt` is the user prompt to append as the last message in
 *   `chatHistory`.
 * - `chatHistory` (optional) carries the previous turns of the conversation.
 */
export async function generateStructured<T>(
  schema: ZodType<T>,
  prompt: string,
  chatHistory: ChatMessage[] = [],
): Promise<T> {
  const normalizedHistory = chatHistory.map((msg) => ({
    role: msg.role,
    content: [
      {
        text:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      },
    ],
  }));

  const messages = [
    ...normalizedHistory,
    { role: 'user' as const, content: [{ text: prompt }] },
  ];

  const { output } = await ai.generate({
    messages,
    prompt: [{text: prompt}],
    output: { schema },
  });

  if (!output) {
    throw new Error('AI did not return a structured payload matching the schema');
  }

  return output;
}

export const callAI = generateStructured;
