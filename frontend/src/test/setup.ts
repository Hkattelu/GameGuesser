import "@testing-library/jest-dom";
import { vi } from 'vitest';

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }) as Promise<Response>
);

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
  writable: true,
});

// Mock scrollIntoView
(window.HTMLElement.prototype as any).scrollIntoView = vi.fn();
