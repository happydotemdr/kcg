import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import clerk from '@clerk/astro';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://keepchoosinggood.com', // Update with your actual domain
  adapter: node({ mode: 'standalone' }),
  integrations: [clerk(), react(), tailwind()],
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
