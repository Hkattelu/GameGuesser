# Shared typing reference

All wire-level contracts (request/response bodies exchanged **between** the
browser, the backend, and the LLM) live in a *single* source of truth:

```ts title="shared/types.ts"
export const PlayerQAResponseSchema = z.object({
  // … trimmed for brevity
});

export type PlayerQAResponse = z.infer<typeof PlayerQAResponseSchema>;
```

The file is imported in three places:

- `backend/*` – runtime validation with `schema.parse()` and compile-time safety
- `frontend/src/*` – React components generically render `PlayerQAResponse`
- Test-suites – fixtures are quickly generated via `schema.parse({...})`

## Extending a schema

1. **Add** a field or variant in `shared/types.ts`.
2. Re-run `npx tsc -b` – both packages now see the change.
3. Update any failing TS errors in the backend *first* (runtime code).
4. Finally adapt the React renderers (usually under
   `frontend/src/components/...`).

Tip: The Zod → TypeScript inference means you never touch `.d.ts` files.

## Key exported contracts

| Name                  | Shape (simplified)                                | Used by            |
| --------------------- | -------------------------------------------------- | ------------------ |
| `PlayerQAResponse`    | `{ type: "answer" \| "guessResult", … }`         | FE ↔ BE ↔ LLM      |
| `AIJsonResponse`      | `{ type: "question" \| "guess", … }`            | FE ↔ BE ↔ LLM      |
| `ResponseOption`      | `'Yes' \| 'No' \| 'Unsure'`                       | FE buttons         |

### Example: strict parse in the backend

```ts
import { PlayerQAResponseSchema } from '../shared/types.js';

app.post('/ai-guesses/answer', async (req, res) => {
  const raw = await gemini.generate({ prompt: '…' });
  const data = PlayerQAResponseSchema.parse(raw);
  // `data` is now fully typed & validated ✅
});
```

### Example: discriminated rendering in React

```tsx
import type { PlayerQAResponse } from '@shared/types';

function Message({ msg }: { msg: PlayerQAResponse }) {
  if (msg.type === 'answer') {
    return <AnswerBubble answer={msg.content.answer} />;
  }
  return <GuessBubble correct={msg.content.correct} />;
}
```
