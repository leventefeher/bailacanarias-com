import { defineConfig } from 'astro/config';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://www.bailacanarias.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), keystatic()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
