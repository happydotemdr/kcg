import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://keepchoosinggood.com', // Update with your actual domain
  integrations: [],
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
