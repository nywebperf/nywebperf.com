// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-04-19',
  srcDir: '.',
  devtools: { enabled: true },
  nitro: {
    preset: 'cloudflare-module'
  }
})
