// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-04-19',
  srcDir: '.',
  devtools: { enabled: true },
  nitro: {
    preset: 'cloudflare-module',
    cloudflare: {
      // Keep our root wrangler.jsonc as the source of truth (needed so `main`
      // points at worker.mjs which re-exports the RedirectLog Durable Object).
      // Otherwise Nitro auto-generates .output/server/wrangler.json on
      // Cloudflare Workers Builds and overrides `main` to index.mjs.
      deployConfig: false,
    },
  }
})
