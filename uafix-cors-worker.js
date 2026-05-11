export default {
  async fetch(request) {
    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get('url');
    const referer = requestUrl.searchParams.get('referer');

    if (!target) {
      return withCors(new Response('Missing url parameter', { status: 400 }));
    }

    let targetUrl;

    try {
      targetUrl = new URL(target);
    } catch (error) {
      return withCors(new Response('Invalid url parameter', { status: 400 }));
    }

    const allowedHosts = new Set([
      'uafix.net',
      'www.uafix.net',
      'zetvideo.net'
    ]);

    if (!allowedHosts.has(targetUrl.hostname)) {
      return withCors(new Response('Host is not allowed', { status: 403 }));
    }

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    const headers = new Headers({
      'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
      'Accept': request.headers.get('Accept') || '*/*'
    });
    const init = {
      method: request.method === 'POST' ? 'POST' : 'GET',
      headers
    };

    if (referer) headers.set('Referer', referer);

    if (init.method === 'POST') {
      const contentType = request.headers.get('Content-Type') || 'application/x-www-form-urlencoded; charset=UTF-8';

      headers.set('Content-Type', contentType);
      init.body = await request.text();
    }

    const upstream = await fetch(targetUrl.toString(), init);

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('x-frame-options');

    return withCors(new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    }));
  }
};

function withCors(response) {
  const headers = new Headers(response.headers);

  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
