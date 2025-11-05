import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import clerk from '@clerk/astro';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://keepchoosinggood.com', // Update with your actual domain
  adapter: node({ mode: 'standalone' }),
  integrations: [clerk(), react()],
  output: 'hybrid',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
