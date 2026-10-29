/* Oxu — kitab yükləmə proxy-si (Cloudflare Worker)
 *
 * Nə üçün lazımdır? Gutenberg və Standard Ebooks faylları brauzerə
 * "Access-Control-Allow-Origin" başlığı göndərmir, ona görə tətbiq
 * onları birbaşa yükləyə bilmir. Bu kiçik proxy həmin faylları
 * götürüb CORS icazəsi ilə qaytarır.
 *
 * Quraşdırma (pulsuz, ~3 dəqiqə):
 *   1. https://dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. Bu faylın bütün məzmununu kodu sahəsinə yapışdır → Deploy
 *   3. Sənə verilən ünvanı kopyala, məsələn:
 *        https://oxu-proxy.kamran.workers.dev
 *   4. Oxu → Parametrlər → Kataloq → "Proxy serveri" sahəsinə yaz:
 *        https://oxu-proxy.kamran.workers.dev/?url=
 *
 * İstifadə:  /?url=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1661.epub3.images
 */

const ALLOW = new Set([
  'www.gutenberg.org', 'gutenberg.org', 'aleph.gutenberg.org',
  'gutendex.com', 'standardebooks.org', 'www.standardebooks.org',
  'archive.org'
]);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'GET') return new Response('yalnız GET', { status: 405, headers: CORS });

    const target = new URL(request.url).searchParams.get('url');
    if (!target) {
      return new Response('Oxu proxy — istifadə: /?url=<encoded-url>', { status: 400, headers: CORS });
    }

    let t;
    try { t = new URL(target); } catch { return new Response('yanlış URL', { status: 400, headers: CORS }); }
    if (t.protocol !== 'https:') return new Response('yalnız https', { status: 400, headers: CORS });
    if (!ALLOW.has(t.hostname)) return new Response('icazəsiz host: ' + t.hostname, { status: 403, headers: CORS });

    let r;
    try {
      r = await fetch(t.toString(), {
        redirect: 'follow',
        headers: { 'User-Agent': 'Oxu/3.2 (PWA kitab oxuyucusu)' }
      });
    } catch (e) {
      return new Response('yuxarı server xətası: ' + e.message, { status: 502, headers: CORS });
    }

    const h = new Headers();
    for (const k of ['content-type', 'content-length', 'etag', 'last-modified']) {
      const v = r.headers.get(k);
      if (v) h.set(k, v);
    }
    for (const k in CORS) h.set(k, CORS[k]);
    h.set('Cache-Control', 'public, max-age=86400');

    return new Response(r.body, { status: r.status, headers: h });
  }
};
