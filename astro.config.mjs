// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// Custom domain — used by `astro build` for the sitemap + <link rel="canonical">.
const SITE = 'https://swallowsrose.com';

export default defineConfig({
  site: SITE,
  // Default output stays static: the marketing one-pager is prerendered.
  // The member area opts into on-demand rendering per route via
  // `export const prerender = false` (login, /backend/*, /api/auth).
  adapter: vercel(),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
