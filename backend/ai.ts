import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { z, ZodType } from 'zod';

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

export const ai = genkit({
  plugins: [googleAI()],
  // If we need to switch to a different model later we can override per call.
  model: gemini15Flash,
});

// ---------------------------------------------------------------------------
// Typings shared with callers
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  /**
   * The message content can be provided in one of three forms:
   *   • A preformatted array of parts expected by Genkit.
   *   • A raw string – convenient for most callers.
   *   • A JSON-serializable object (e.g. {@link PlayerQAResponse}).
   *
   * The `generateStructured()` helper will stringify objects lazily just
   * before sending them to the model, ensuring we persist the full typed
   * payload in memory for later inspection or analytics.
   */
  content: { text: string }[] | string | Record<string, unknown>;
}

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
  const normalizedHistory = chatHistory.map((msg) => {
    if (Array.isArray(msg.content)) {
      return { role: msg.role, content: msg.content };
    }

    if (typeof msg.content === 'string') {
      return { role: msg.role, content: [{ text: msg.content }] };
    }

    // Fallback: assume JSON-serializable object
    return { role: msg.role, content: [{ text: JSON.stringify(msg.content) }] };
  });

  const messages = [
    ...normalizedHistory,
    { role: 'user' as const, content: [{ text: prompt }] },
  ];

  const { output } = await ai.generate({
    messages,
    output: { schema },
  });

  if (!output) {
    throw new Error('AI did not return a structured payload matching the schema');
  }

  return output;
}

// Convenience alias that mirrors the old `callGeminiAPI<T>()` signature to
// minimize churn in the codebase. New code should prefer `generateStructured`.
export const callAI = generateStructured;
