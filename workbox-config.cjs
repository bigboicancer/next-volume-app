const basePath = (process.env.EXPO_BASE_PATH || '').replace(/^\/+|\/+$/g, '');
const appRoot = basePath ? `/${basePath}/` : '/';

module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,json,png,svg,ico,ttf,woff,woff2}'],
  globIgnores: ['sw.js', 'workbox-*.js'],
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  navigateFallback: `${appRoot}index.html`,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/(cdn\.myanimelist\.net|media\.kitsu\.app)\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-volume-covers',
        cacheableResponse: { statuses: [0, 200] },
        expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 60 }
      }
    },
    {
      urlPattern: /^https:\/\/(api\.jikan\.moe|kitsu\.io\/api\/edge|www\.googleapis\.com\/books|openlibrary\.org)\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-volume-catalogue',
        networkTimeoutSeconds: 8,
        cacheableResponse: { statuses: [0, 200] },
        expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 }
      }
    }
  ]
};
