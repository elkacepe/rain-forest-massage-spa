import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` genera un único dist/index.html (fuentes incluidas) listo para publicar.
export default defineConfig({ plugins: [react(), viteSingleFile()], build: { assetsInlineLimit: 100000000 } });
