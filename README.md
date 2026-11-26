# CIG Timepieces

Business app for CIG Timepieces: inventory, sales and profit, market comps, pre-ship checks and documents. It runs in the browser and can be added to a phone's home screen.

Live at **https://dcasiano23.github.io/cig-timepieces/**

## What it does

- **Numbers:** month-end net profit, watches sold, revenue, fees, cost of watches sold, average days to sell, a 12-month profit chart and a year-by-month table. Copy the month-end summary or export it as CSV.
- **Inventory:** current and past watches in one searchable list (brand, model, reference, serial, client, tracking). Searching a reference shows what you paid before, what you sold it for, and the market median.
- **Reference lookup:** type a reference and brand, model and case fill in. Lookups come from a built-in list of about 150 popular references (Rolex, Omega, Tudor, Cartier, Grand Seiko, AP, Patek, Panerai), then from your own past entries. For other references, the brand is recognized from the reference format.
- **Configurations & accuracy:** `catalog.js` lists references and the dials and bracelets/straps each one comes in. A watch logged in a configuration its reference doesn't come in is flagged "Check".
- **Market:** log real **sold** prices; asking prices are kept apart and never count toward the market median. Comp links go only to eBay sold listings, never to for-sale listings. eBay "Best offer accepted" results show the asking price, not the real sale price, so skip them. **Max buy price** = median sold − selling fees − shipping − target profit. A separate **What sellers are asking** section links to for-sale listings (Chrono24, eBay Buy It Now, Facebook Marketplace, Reddit r/Watchexchange, Google Shopping); asking prices are logged apart and shown against real sales as an asking-vs-sold gap.
- **Live market data (optional):** connect the private helper in `helper/` (a free Cloudflare Worker) and Market fills in live eBay asking prices automatically for any reference. See [helper/README.md](helper/README.md).
- **Your photos & videos:** add photos and videos of the actual watch from the camera or library, by drag and drop, or by pasting.
- **Pre-ship check:** a checklist covering identity, function, condition and packing, plus timegrapher numbers and carrier and tracking, with videos attached. "Sign off & lock" time-stamps the record and locks it along with its videos.
- **Business & documents:** set your logo, business details, sale terms and thank-you message under Business. Each watch has a one-tap purchase agreement, bill of sale (with numbered invoices), thank-you letter and condition report. Each can be edited on screen, then printed or saved as PDF. These are templates only; have an attorney review the wording.
- **Backup:** data stays on the device. Export a JSON backup regularly (photos included, videos optional) and import it on another device. CSV exports are available for spreadsheets.

Net profit = sale price − fees & shipping out − (price paid + extra costs).

## Privacy

Inventory, clients, photos and videos are stored only on the device (localStorage and IndexedDB). None of it is in this repository or sent to any server. The repository holds only the app's code and logo.

## Development

Static site with no build step. To run it locally: `python3 -m http.server`, then open http://localhost:8000.
After changing files, bump `VERSION` in `sw.js` so installed copies pick up the update.

Publishing: Settings → Pages → Deploy from a branch → `main` / root.
