/* CIG Timepieces — market helper (Cloudflare Worker).
 *
 * The app asks:  GET /lookup?ref=126610LN&brand=Rolex   (header X-Access-Code: <your access code>)
 * It answers with live eBay asking prices (official eBay Browse API).
 * WatchCharts market data slots in here once you have API access.
 *
 * Secrets are set in the Cloudflare dashboard (Worker → Settings → Variables and Secrets), never in this file:
 *   ACCESS_CODE         a private code only your phone knows (required)
 *   EBAY_CLIENT_ID      eBay production App ID (Client ID)
 *   EBAY_CLIENT_SECRET  eBay production Cert ID (Client Secret)
 *   ALLOWED_ORIGIN      optional, defaults to https://dcasiano23.github.io
 */

const CACHE_SECONDS = 6 * 60 * 60; // results are reused for 6 hours to keep lookups fast and within limits
const EBAY_WATCH_CATEGORY = "31387"; // eBay "Wristwatches"
let ebayToken = null; // { value, expires }

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://dcasiano23.github.io",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "X-Access-Code",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return json({ error: "Only GET is supported." }, 405);
    if (!env.ACCESS_CODE) return json({ error: "The helper has no ACCESS_CODE set yet. Add it in Cloudflare → Settings → Variables and Secrets." }, 500);
    if (request.headers.get("X-Access-Code") !== env.ACCESS_CODE) return json({ error: "Wrong access code." }, 401);

    const url = new URL(request.url);
    if (url.pathname === "/ping") {
      return json({ ok: true, sources: { ebay: !!(env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET), watchcharts: !!env.WATCHCHARTS_KEY } });
    }
    if (url.pathname !== "/lookup") return json({ error: "Not found." }, 404);

    const ref = (url.searchParams.get("ref") || "").trim().slice(0, 40);
    const brand = (url.searchParams.get("brand") || "").trim().slice(0, 40);
    if (!/^[\w .\/-]{3,40}$/.test(ref)) return json({ error: "Enter a reference number." }, 400);

    // Shared cache so repeated lookups of the same reference don't call eBay again.
    const cacheKey = new Request(`https://cig-helper.cache/lookup?ref=${encodeURIComponent(ref.toUpperCase())}&brand=${encodeURIComponent(brand.toLowerCase())}`);
    const cache = typeof caches !== "undefined" ? caches.default : null;
    if (cache && url.searchParams.get("fresh") !== "1") {
      const hit = await cache.match(cacheKey);
      if (hit) return json({ ...(await hit.json()), cached: true });
    }

    const result = { ref, brand, fetched: new Date().toISOString(), ebay: null, watchcharts: null, errors: [] };
    if (env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET) {
      try { result.ebay = await ebayAsks(ref, env); }
      catch (e) { result.errors.push(`eBay: ${e.message}`); }
    } else result.errors.push("eBay keys not set yet.");

    if (cache && !result.errors.length) {
      ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), { headers: { "Cache-Control": `max-age=${CACHE_SECONDS}` } })));
    }
    return json(result);
  },
};

/* ---------- eBay: live Buy It Now listings for a reference ---------- */

async function getEbayToken(env) {
  if (ebayToken && ebayToken.expires > Date.now() + 60_000) return ebayToken.value;
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`),
    },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "eBay rejected the keys — check EBAY_CLIENT_ID / EBAY_CLIENT_SECRET (use the Production keyset)." : `eBay sign-in failed (${res.status}).`);
  const data = await res.json();
  ebayToken = { value: data.access_token, expires: Date.now() + (data.expires_in || 7200) * 1000 };
  return ebayToken.value;
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function ebayAsks(ref, env) {
  const token = await getEbayToken(env);
  const params = new URLSearchParams({
    q: ref,
    category_ids: EBAY_WATCH_CATEGORY,
    filter: "buyingOptions:{FIXED_PRICE},priceCurrency:USD",
    limit: "100",
  });
  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  if (!res.ok) throw new Error(`eBay search failed (${res.status}).`);
  const data = await res.json();
  const key = norm(ref);

  // Keep listings whose title actually contains the reference, priced in USD.
  let items = (data.itemSummaries || [])
    .filter((it) => it.price && it.price.currency === "USD" && norm(it.title).includes(key))
    .map((it) => ({
      title: it.title,
      price: Number(it.price.value),
      url: it.itemWebUrl,
      condition: it.condition || "",
      image: it.image?.imageUrl || it.thumbnailImages?.[0]?.imageUrl || "",
    }))
    .filter((it) => it.price > 0);

  // Drop parts, straps, boxes and other cheap non-watch listings (well below the typical price).
  const m0 = median(items.map((i) => i.price));
  if (m0) items = items.filter((i) => i.price >= m0 * 0.4);

  const prices = items.map((i) => i.price);
  items.sort((a, b) => a.price - b.price);
  return {
    count: prices.length,
    totalOnEbay: data.total ?? null,
    median: median(prices),
    low: prices.length ? Math.min(...prices) : null,
    high: prices.length ? Math.max(...prices) : null,
    cheapest: items.slice(0, 8),
    searchUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(ref)}&_sacat=${EBAY_WATCH_CATEGORY}&LH_BIN=1&_sop=15`,
  };
}
