import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, type CoreMessage } from 'ai';

// Re-export the AI SDK's CoreMessage type under a project-specific alias so that
// existing game logic can migrate with minimal churn while still benefiting
// from the officially supported GenKit message structure.
export type GenKitMessage = CoreMessage;

/**
* Calls Gemini via the AI SDK (v5) using the Google provider.
*
* The legacy `callGeminiAPI` signature is preserved so that the rest of the
* codebase (and tests) do not need to change, but the underlying implementation
* now leverages the official GenKit integration instead of a handwritten
* `fetch` wrapper.
*
* The function expects Gemini to return JSON and attempts to parse it before
* returning. Any parsing or network issues are surfaced as regular `Error`s so
* that callers can handle them consistently.
*
* @param prompt       The prompt or question for the model.
* @param chatHistory  Optional prior messages to provide conversation context.
* @returns            The parsed JSON response, typed via the generic `T`.
*/
export async function callGeminiAPI<T = unknown>(
  prompt: string,
  chatHistory: GenKitMessage[] = [],
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set.');
  }

  // Lazily create the provider so that unit tests can stub/mutate env vars
  // on a per-test basis without requiring a fresh module import.
  const googleProvider = createGoogleGenerativeAI({ apiKey });

  // The AI SDK works with plain role/content message objects.
  const messages: GenKitMessage[] = [
    ...chatHistory,
    { role: 'user', content: prompt },
  ];

  const { text } = await generateText({
    model: googleProvider.chat('gemini-2.0-flash'),
    // Use the `messages` field rather than `prompt` so that multi-turn context
    // is handled uniformly by the provider.
    messages,
  });

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from Gemini response: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
