# UAFLIX Lampa Plugin

Lampa plugin for browsing UAFLIX content and opening available HLS streams in the default Lampa player.

## Install URL

Use this URL in Lampa:

```text
https://cdn.jsdelivr.net/gh/artur32804/lampa-videos@main/uafix-lampa-plugin.js
```

Lampa path:

```text
Settings -> Extensions -> Plugins -> Add plugin
```

## Files

- `uafix-lampa-plugin.js` - installable plugin.
- `UAFIX_LAMPA_NOTES.md` - verified integration notes and known risks.

## Features

- UAFLIX item in the Lampa left menu.
- Dashboard with UAFLIX categories.
- Site-like filters: sorting, country, genre, year, studio, hidden anime.
- Search by Ukrainian or original title.
- "Load more" pagination for regular category pages.
- Local "Recently opened" list.
- Detail screen with metadata, description, trailer button, and Ukrainian online playback button.
- HLS extraction from the verified `zetvideo.net` iframe contract.

## Current Status

This is an initial integration prototype. It relies on the currently verified HTML contracts from `uafix.net` and the iframe player contract from `zetvideo.net`.

## Browser Testing Note

The web version of Lampa can show "No network connection" when the browser blocks cross-origin HTML requests to `uafix.net`.

For browser-only testing, deploy `uafix-cors-worker.js` as a temporary Cloudflare Worker and set the worker URL in `uafix-lampa-plugin.js`:

```js
var PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
```

For production, prefer an official UAFLIX JSON API or CORS-enabled endpoints instead of a public proxy.
