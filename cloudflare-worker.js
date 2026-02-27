/**
 * Cloudflare Worker — CORS Proxy for Anthropic API
 *
 * הוראות הגדרה:
 * 1. כנס ל-https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. העתק והדבק את כל תוכן הקובץ הזה
 * 3. לחץ Save & Deploy
 * 4. העתק את כתובת ה-Worker (לדוגמה: https://anthropic-proxy.YOUR-NAME.workers.dev)
 * 5. הכנס אותה בהגדרות האפליקציה בשדה "כתובת פרוקסי"
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-allow-browser',
    'Access-Control-Max-Age': '86400',
};

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/v1/messages' || request.method !== 'POST') {
        return new Response('Not found', { status: 404 });
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
        return new Response(JSON.stringify({ error: { message: 'Missing x-api-key header' } }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
        },
        body: request.body,
    });

    const responseBody = await anthropicResponse.text();

    return new Response(responseBody, {
        status: anthropicResponse.status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
    });
}
