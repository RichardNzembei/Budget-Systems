export default defineNuxtConfig({
  compatibilityDate: '2025-01-15',

  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/color-mode'
  ],

  // Import the CSS file with @theme
  css: [
    '~/assets/css/app.css'
  ],

  app: {
    head: {
      title: 'Stock Management System',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Budget Hair Stock Management System - Track your inventory and sales'
        }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' }
      ]
    },
    // CRITICAL: Disable transitions to prevent overlays
    pageTransition: false,
    layoutTransition: false
  },

  // Nuxt UI Configuration
  ui: {
    global: true,
    theme: {
      colors: {
        primary: 'blue',
        gray: 'zinc'
      }
    }
  },

  // Color mode configuration
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },

  // Runtime configuration
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:5000'
    }
  },

  // Pinia store configuration
  pinia: {
    storesDirs: ['./stores/**']
  }
})
