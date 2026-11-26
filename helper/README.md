# CIG market helper — setup

A small private server (Cloudflare Worker, free plan) that the app asks for live market prices.
It keeps your API keys secret: they live only in Cloudflare, never in the app's public code.

Right now it provides **live eBay asking prices** (official eBay Browse API). WatchCharts can be added later.

## 1. eBay keys (free)

1. Go to **developer.ebay.com** and click **Register**. Sign in with your eBay account.
2. Wait for the approval email (can take up to a business day).
3. Open **Application Keys** and create a **Production** keyset (name it "CIG Timepieces").
4. If eBay asks about **Marketplace Account Deletion notifications**, choose the **exemption** — this helper doesn't store any eBay user data.
5. Keep the page open. You'll need the **App ID (Client ID)** and **Cert ID (Client Secret)** in step 2.
   Don't send these to anyone.

## 2. Cloudflare helper (free)

1. Go to **dash.cloudflare.com** and create a free account.
2. **Workers & Pages → Create → Create Worker**. Name it `cig-market`, then **Deploy**.
3. Click **Edit code**. Delete everything in the editor, paste the full contents of
   [`worker.js`](worker.js) (open it on GitHub and use **Raw**, then copy all), then **Deploy**.
4. Go to the worker's **Settings → Variables and Secrets** and add these three, each as type **Secret**:
   | Name | Value |
   |---|---|
   | `ACCESS_CODE` | a private code you make up — e.g. three random words and a number |
   | `EBAY_CLIENT_ID` | your eBay **App ID (Client ID)** |
   | `EBAY_CLIENT_SECRET` | your eBay **Cert ID (Client Secret)** |
   Then **Deploy** again.
5. Copy the worker's address, e.g. `https://cig-market.yourname.workers.dev`.

## 3. Connect the app

In the CIG app: **Business → Live market data**. Paste the helper address and your access code, then tap
**Save & test**. It should say **✓ Connected · eBay ✓**.

Now type any reference in **Market**. The snapshot fills in live eBay asking prices automatically.

## Notes

- Results are reused for 6 hours, so repeated lookups are fast and stay well within eBay's free limits.
  Tap **Refresh** under the snapshot for a fresh check.
- Only the app's own web address may use the helper, and only with your access code.
- eBay doesn't provide **sold** prices through its public API. "Actually sells" still comes from the sold prices
  you log (and from WatchCharts once it's connected).
