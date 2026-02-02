# Implementation Plan: Cost Reduction and Operational Efficiency

This plan outlines the steps to reduce operational costs by optimizing storage, API usage, and preparing for ad monetization.

## Phase 1: Baseline Analysis and Research [checkpoint: fdc67ba]
Establish a baseline for current costs and research optimization strategies.

- [x] **Task: Analyze current Firestore and AI API usage patterns** 0347f49
    - [ ] Audit `backend/game.ts` and `backend/ai.ts` to map Firestore write triggers and AI call frequency.
    - [ ] Document baseline "cost per game session" (estimates).
- [x] **Task: Research Ad Integration providers and technical requirements** 67dba82
    - [ ] Identify ad placement locations in `frontend/src/App.tsx` and game screens.
    - [ ] Define the technical interface for the `AdComponent`.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Baseline Analysis' (Protocol in workflow.md)**

## Phase 2: Conversation Storage Optimization
Reduce Firestore costs through better data management.

- [ ] **Task: Implement data compaction for game sessions**
    - [ ] **Sub-task: Write Tests** for `backend/dailyGameStore.ts` to ensure session data is stored minimally.
    - [ ] **Sub-task: Implement Implementation** to reduce redundant fields in the Firestore document schema.
- [ ] **Task: Configure Firestore TTL for temporary sessions**
    - [ ] Add a `expiresAt` field to game session documents.
    - [ ] **Sub-task: Write Tests** to verify expiration field calculation.
    - [ ] **Sub-task: Implement Implementation** for TTL field updates in `backend/game.ts`.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: Storage Optimization' (Protocol in workflow.md)**

## Phase 3: AI API and RAWG Call Optimization
Reduce per-session token usage and external API dependency.

- [ ] **Task: Refine Genkit prompts for token efficiency**
    - [ ] **Sub-task: Write Tests** in `backend/__tests__/prompts.test.ts` to verify Quiz Bot personality remains intact with shorter prompts.
    - [ ] **Sub-task: Implement Implementation** in `backend/prompts.ts` to condense system instructions.
- [ ] **Task: Implement caching for RAWG game metadata**
    - [ ] **Sub-task: Write Tests** for a new caching utility in `backend/rawg.ts`.
    - [ ] **Sub-task: Implement Implementation** using a simple in-memory or Firestore-based cache for RAWG details.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: API Optimization' (Protocol in workflow.md)**

## Phase 4: Ad Integration Infrastructure
Prepare the frontend for monetization.

- [ ] **Task: Create a reusable `AdSlot` component**
    - [ ] **Sub-task: Write Tests** for `frontend/src/components/AdSlot.tsx`.
    - [ ] **Sub-task: Implement Implementation** with pixel-art borders to match the retro aesthetic.
- [ ] **Task: Integrate AdSlots into the game loop**
    - [ ] Place `AdSlot` components in `frontend/src/StartScreen.tsx` and `frontend/src/AIGuessesGame.tsx`.
    - [ ] Ensure layout remains responsive on mobile.
- [ ] **Task: Conductor - User Manual Verification 'Phase 4: Ad Integration' (Protocol in workflow.md)**

## Phase 5: Final Verification and Checkpoint
Verify total savings and finalize the track.

- [ ] **Task: Benchmark optimized session against baseline**
    - [ ] Compare Firestore operation counts and AI token usage between old and new logic.
- [ ] **Task: Conductor - User Manual Verification 'Phase 5: Final Verification' (Protocol in workflow.md)**
