// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Vercel deployment URL. Change to a custom domain once one is wired up;
// `astro build` uses this for the sitemap + <link rel="canonical">.
const SITE = 'https://swallowsrose-website.vercel.app';

export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
