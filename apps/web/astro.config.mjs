import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server', // Modo servidor para renderizado dinámico desde API
  build: {
    assets: '_assets'
  },
  server: {
    port: 4321,
    host: true
  }
});

