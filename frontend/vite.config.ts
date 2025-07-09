import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The Tailwind Vite plugin does not ship TypeScript typings – a local shim is
// declared in `src/tailwindcss-vite.d.ts` so it can be imported safely.
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
});
