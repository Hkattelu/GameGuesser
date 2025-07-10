// Minimal shim so the TypeScript compiler recognises the Tailwind Vite plugin module.
declare module '@tailwindcss/vite' {
  import { Plugin } from 'vite';
  const plugin: () => Plugin;
  export default plugin;
}
