/**
 * Cloudflare Worker — CORS Proxy for Anthropic API
 *
 * הוראות הגדרה (מצב עם מפתח API מוטמע — המאמן אינו צריך להכניס מפתח):
 * 1. כנס ל-https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. העתק והדבק את כל תוכן הקובץ הזה
 * 3. לחץ Save & Deploy
 * 4. הוסף את מפתח ה-API כ-Secret: Settings → Variables → Add variable
 *    - שם המשתנה: ANTHROPIC_API_KEY
 *    - ערך: מפתח ה-API שלך מ-Anthropic (sk-ant-...)
 *    - סמן "Encrypt" כדי לשמור אותו בצורה מאובטחת
 * 5. העתק את כתובת ה-Worker (לדוגמה: https://anthropic-proxy.YOUR-NAME.workers.dev)
 * 6. הכנס אותה בהגדרות האפליקציה בשדה "כתובת פרוקסי"
 * 7. המאמנים לא צריכים להכניס מפתח API — הם משתמשים בפרוקסי בלבד!
 *
 * הוראות הגדרה (מצב ישן — כל מאמן מכניס מפתח API משלו):
 * - אם לא מגדירים את משתנה ANTHROPIC_API_KEY, כל בקשה צריכה לכלול x-api-key header
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-allow-browser',
    'Access-Control-Max-Age': '86400',
};

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        if (url.pathname !== '/v1/messages' || request.method !== 'POST') {
            return new Response('Not found', { status: 404 });
        }

        // Use embedded API key from environment variable if available,
        // otherwise fall back to the key provided in the request header
        const apiKey = env.ANTHROPIC_API_KEY || request.headers.get('x-api-key');
        if (!apiKey) {
            return new Response(JSON.stringify({ error: { message: 'Missing API key. Set ANTHROPIC_API_KEY environment variable in the Worker settings, or pass x-api-key header.' } }), {
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
};
