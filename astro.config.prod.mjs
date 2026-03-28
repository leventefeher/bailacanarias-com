import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Production config — no node adapter, no keystatic (CMS is local-only)
export default defineConfig({
  site: 'https://www.bailacanarias.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [react(), sitemap()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
