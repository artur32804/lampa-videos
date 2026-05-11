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

## Current Status

This is an initial integration prototype. It relies on the currently verified HTML contracts from `uafix.net` and the iframe player contract from `zetvideo.net`.

## Browser Testing Note

The web version of Lampa can show "No network connection" when the browser blocks cross-origin HTML requests to `uafix.net`.

For browser-only testing, deploy `uafix-cors-worker.js` as a temporary Cloudflare Worker and set the worker URL in `uafix-lampa-plugin.js`:

```js
var PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
```

For production, prefer an official UAFLIX JSON API or CORS-enabled endpoints instead of a public proxy.
