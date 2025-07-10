// Minimal ambient module declarations so the TypeScript compiler succeeds
// without the full React / Vite type dependency tree.

declare module 'react' {
  // Minimal hook definitions – not complete.
  export function useState<T>(initial: T): [T, (value: T) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export const Fragment: unknown;
  const React: unknown;
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(element: unknown): void;
  };
}

declare module 'react/jsx-runtime' {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare module '@testing-library/react' {
  export const render: unknown;
  export const screen: unknown;
  export const fireEvent: unknown;
}

declare module 'vite' {
  export interface Plugin {}
  export function defineConfig(config: unknown): unknown;
}

declare module '@vitejs/plugin-react' {
  import { Plugin } from 'vite';
  const plugin: () => Plugin;
  export default plugin;
}

// Allow bare `import.meta.env` property access without full Vite typings.
interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
