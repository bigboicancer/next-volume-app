# Next Volume

Next Volume is a private, local-first manga and light-novel tracker for iPhone, Android and web. It is designed to answer two questions quickly:

1. What have I already read?
2. Which volume should I pick up next?

## What it does

- Searches manga and light novels online.
- Retrieves cover art, publication status and known original volume totals.
- Estimates currently indexed English volumes using public book catalogues.
- Separates the full series total from the exact volumes you own, including gaps.
- Lets you enter owned volumes as individual numbers or ranges such as `1-3, 7, 12-14`.
- Tracks every volume separately rather than storing only a single progress number.
- Requires a volume to be owned before it can be marked as read.
- Sorts your library by recent activity, title or reading progress.
- Provides a one-tap **Finish next volume** action.
- Queues the next unread volume you own while measuring completion against the full series total.
- Refreshes online counts without ever reducing a manually chosen total.
- Stores the shelf on the device with no account required.
- Supports completely manual entries for obscure editions and box sets.

## Install it on an iPhone Home Screen

Once the `dist` folder is deployed to any HTTPS host:

1. Open the website link in **Safari** on the iPhone.
2. Tap Safari's **Share** button.
3. Scroll down and choose **Add to Home Screen**.
4. Keep the name **Next Volume**, then tap **Add**.

Next Volume will have its own icon and open without Safari's browser controls. The computer does
not need to stay on. Your shelf and reading progress work offline; title search, cover downloads and
online volume refreshes still need an internet connection.

Reading data belongs to that installed website on that iPhone. Removing its Safari website data can
also remove the shelf, so avoid clearing it unless you intend to reset the app.

## Build the installable website

```bash
npm install
npm run build:web
```

The finished site is written to `dist`. It includes the app manifest, iPhone icon and an automatically
generated service worker that caches the application shell for offline launches.

To test the production build locally:

```bash
npm run serve:web
```

## Host it for free

### GitHub Pages

The included `.github/workflows/deploy-pages.yml` workflow builds and publishes the PWA whenever
the `main` branch is updated. In the GitHub repository's **Settings → Pages**, set **Source** to
**GitHub Actions**. The workflow automatically handles the repository's URL path.

### Netlify

You can also drag the generated `dist` folder into Netlify's manual deploy page. The included
`public/_redirects` file handles the single-page app route.

Both options provide the HTTPS address needed for iPhone Home Screen installation.

## Preview it with Expo Go

You need a Mac or Windows computer, [Node.js LTS](https://nodejs.org/) and the free
[Expo Go](https://apps.apple.com/app/expo-go/id982107779) app on your iPhone. You do not need
Xcode or an Apple Developer account for this preview method.

1. Extract the ZIP into a new folder.
2. Open Terminal (macOS) or PowerShell (Windows) in that folder.
3. Install the project and start it:

   ```bash
   npm install
   npm start
   ```

4. Keep that terminal window open. It will display a QR code.
5. Put the iPhone and computer on the same Wi-Fi network.
6. Open the normal iPhone Camera app, scan the QR code and tap the banner that appears.
7. Choose **Open in Expo Go** if iOS asks.

If the phone cannot connect, stop Expo with `Control-C`, then try:

```bash
npx expo start --tunnel
```

Tunnel mode is slower, but it usually works around public Wi-Fi, router and firewall restrictions.
For a development web preview, press `w` in the Expo terminal or run `npm run web`.

## Checks

```bash
npm run check
```

This runs the strict TypeScript check and volume-title parser tests.

## How online volume lookup works

- Series metadata comes from MyAnimeList through the public Jikan API.
- If Jikan is unavailable, searches automatically continue through Kitsu's public catalogue.
- English-volume discovery checks Google Books and Open Library for numbered editions.
- Finished series normally have a reliable original total.
- Ongoing series often report their original total as unknown.
- English book indexes can lag behind publishers or contain omnibus editions.

For those reasons, Next Volume treats the total you choose as authoritative. Refreshing can add newly discovered volumes but never removes ownership selections or reading progress.

## Privacy

Reading progress is stored locally using AsyncStorage. The app only contacts public catalogues when you search for a title or request a volume refresh.

## Project structure

```text
App.tsx                       App state and screen selection
src/hooks/useLibrary.ts       Local shelf operations and persistence
src/services/catalog.ts       Online search and volume lookup
src/screens/                  Shelf, stats and series detail screens
src/modals/                   Add and edit flows
src/components/               Shared interface components
scripts/catalog-smoke.ts      Volume parser tests
public/                       PWA manifest, icons and web metadata
workbox-config.cjs            Offline-cache generation
.github/workflows/            Free GitHub Pages deployment
```
