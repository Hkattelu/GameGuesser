# Ad Integration Research Report

## 1. Identified Ad Placements
- **Placement A (Global Footer):** A persistent banner at the bottom of the viewport, outside the main game container.
- **Placement B (Start Screen):** A medium rectangle between the "Arcade" header and the game selection cards.
- **Placement C (Post-Game):** A dedicated ad section within the `GameResultsDialog`.
- **Placement D (In-Game):** A small banner below the response buttons.

## 2. Technical Interface: `AdSlot` Component
A reusable React component to wrap ad provider logic.

```typescript
interface AdSlotProps {
  /** 'banner' | 'rectangle' | 'interstitial' */
  format: 'banner' | 'rectangle';
  /** Unique ID for the ad placement */
  placementId: string;
  /** Custom styles to maintain retro aesthetic (e.g., pixel borders) */
  className?: string;
}

const AdSlot: React.FC<AdSlotProps> = ({ format, placementId, className }) => {
  // Logic to load provider scripts (e.g., Google AdSense)
  // Logic to handle Fallback/Placeholder if ad fails to load
};
```

## 3. Provider Recommendations
- **Google AdSense:** Standard, reliable, and supports various sizes.
- **EthicalAds / Carbon:** Developer-focused, privacy-friendly, and often has a cleaner look.
- **In-house "Promoted Games":** Since this is an "Arcade", we could eventually cross-promote other games.

## 4. Visual Integration
- Ads will be wrapped in a `pixel-box` style container (white border with black inner border) to ensure they don't look like "AI Slop" injected into a retro world.
