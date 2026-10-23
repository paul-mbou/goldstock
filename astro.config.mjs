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
      // Base URL of the GOLDSTOCK API (login and signup). Leave empty until the backend is live.
      PUBLIC_API_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
