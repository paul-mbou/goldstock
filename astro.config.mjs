// @ts-check
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://goldstock.cm',
  integrations: [react()],

  env: {
    schema: {
      // Supabase project used for login and signup. While either is unset, the forms open the demo.
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      // Names created by the Vercel ↔ Supabase integration (Next.js-style). Read as a fallback.
      NEXT_PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
