# Baseline Cost Analysis Report

## 1. AI API Usage (Gemini 2.0 Flash)
- **Pattern:** Quadratic growth of input tokens per session due to sending full `chatHistory` on every turn.
- **Avg. Session (15 turns):**
    - Input Tokens: ~25,000 (Sum of growing history + system prompts).
    - Output Tokens: ~1,500.
- **Cost Impact:** Flash is cheap, but quadratically growing history makes long games unnecessarily expensive.

## 2. Firestore Usage
- **Pattern:** One full document write per turn.
- **Payload:** Entire session state (including history) is overwritten every turn.
- **Writes per Session:** ~15-20.
- **Storage:** No TTL implemented; session data persists indefinitely, leading to linear storage growth.

## 3. External API Usage (RAWG)
- **Pattern:** Fetches metadata on hint request.
- **Efficiency:** Good for daily game (once per day), but hints can trigger redundant calls if the server restarts (in-memory cache only).

## 4. Monetization Status
- **Current Revenue:** $0.00 (No ads, no donations).
- **Current Margin:** Negative (Costs are absorbed).
