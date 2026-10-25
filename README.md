# Я Є. Україна 🇺🇦

**Dark Ukraine Hybrid — nationwide map prototype (v0.5.3 — correct raion/hromada boundaries).**

A responsive, self-hosted, offline-capable-after-loading static web demo of Ukraine's administrative hierarchy. No backend, payment processing or fictitious public-user counts. Street-mode resources are loaded from third-party CDNs and require internet.

## Live streets map (prototype)

- Two modes: **Огляд** (local SVG overview) and **Вулиці** (Leaflet 1.9.4 using OpenStreetMap raster street tiles with dark CSS styling). WebGL is not required.
- Selecting an oblast, district, community or city from the existing hierarchy automatically opens the live basemap and animates toward the selected territory.
- All 25 geographical region polygons remain interactive on the live map; basemap supplies street/road labels at closer zoom levels.
- The reference includes file paths for **114 districts**, and selected district boundary files expose the appropriate hromada shapes. District boundaries are selected by name from their oblast GeoJSON; hromada boundaries are selected by name from their district GeoJSON. A match must be unique; no broad child polygon collections are displayed as a single area. Example: Київська область → Фастівський район → Калинівська громада.
- When the selected community boundary is unavailable, the app tries the actual parent district; if that is unavailable it falls back to the oblast. It explicitly reports the limited precision and never invents a location.
- A lack of WebGL or internet falls back to the SVG overview. Leaflet JS is loaded from jsDelivr with unpkg fallback; the CSS is self-hosted. Street raster tiles and fine-region polygons still require an internet connection. The list and SVG overview remain locally usable after the static page assets are cached by the browser, but a full offline PWA cache/service worker is NOT yet provided.
- Map data attribution appears on the map (OpenStreetMap contributors). No geocoding or autocomplete calls to public Nominatim. The OSMF public tile server is suitable only for a light demo; production traffic needs a dedicated tile provider or self-hosted tiles per the OSMF tile usage policy.

**Implementation plan (remaining):** 1) Expand verified district/hromada geometries and add an authoritative settlement index with actual coordinates; 2) exact streets-address/place search with a production-grade hosted geocoder; 3) production tile policy, caching and PWA fallback; 4) verified participant database and safe 1 UAH checkout. Real payments and participant counts are not currently present.

## Implemented

- Proper geographic outlines for 25 polygon regions including Crimea; Kyiv and Sevastopol are included as separate top-level registry units.
- Hierarchy: **27** oblast-level entries, **139** raion entries, **1,769** hromada entries from the cited public reference dataset (not a claim about the latest official KATOTTG totals).
- Clickable country/oblast map, oblast highlighting, city orientation markers, zoom, breadcrumbs.
- Search across every region, district and hromada, and several major city markers.
- Regional directory, contextual child lists, responsive mobile/desktop layout, fixed standalone mobile dock.
- Local-only demo participant cards, sharing **text only**, and local deletion.

## Files

- `index.html` — semantic application shell and components
- `styles.css` — Dark Ukraine Hybrid design
- `app.js` — map UI, hierarchy, search and card interactions
- `territories.js` — offline reference territory data and oblast geometry
- `boundary-index.js` — known available OSM district and hromada shape filenames
- `live-map.js` — lazy MapLibre integration and remote boundary lookup

## Important limitations

This is **not a launched public sales service**. There are no paid cells, global unique slots, buyer accounts, live participant statistics, server database, or card sharing across users. Numbers in the dashboard refer exclusively to the cited geography dataset or local cards stored on the current device. Region outlines are geographically referenced; district and hromada outlines, and the full list of all Ukrainian settlements/cities, are not yet included. The live street layer works only while online. City dots denote approximate reference locations, **not user purchases**. This project does not independently verify changes to official administrative records.

Before going live: add a verified current KATOTTG source, authoritative settlement data, exact district/hromada polygons, an identity/anti-fraud design, server-side idempotent payments, transactional cell allocation, moderation and privacy policies. Assess payment-provider minimum transaction amounts and fees for 1 UAH.

## Running locally

Open `index.html` from a static HTTP server such as `python3 -m http.server 8000`. GitHub Pages can serve the root directory of the `main` branch.

## Data credits

- Administrative names/hierarchy: [Open Admin Data](https://github.com/open-admin-data/ukraine-administrative-divisions) — CC BY 4.0.
- Ukraine oblast boundaries: [darmat1/ukraine-geo-data](https://github.com/darmat1/ukraine-geo-data), OpenStreetMap contributors — ODbL.

The datasets are reduced for in-app use; their presence does not imply endorsement.

## Browser notes

Leaflet uses a raster map rather than WebGL2 and is therefore suitable for older iPad Safari versions. The map JavaScript and map image tiles still need a network connection. The page falls back to the overview when the library CDN fails. This version was statically verified; it has not been manually tested on every Safari device.

Leaflet © 2010–2023 Volodymyr Agafonkin et al, BSD 2-Clause (https://github.com/Leaflet/Leaflet). OSMF Tile Policy: https://operations.osmfoundation.org/policies/tiles/

## Safari / iPad tile visibility hotfix (0.5.2)

- Removed WebKit-hostile CSS filtering of Leaflet's entire tile pane and dropped its isolated stacking context.
- Scoped overview-only SVG rules so they cannot distort Leaflet's own geographical SVG overlays.
- Added resize reconciliation when a previously hidden map is displayed, on split-view resizing and when the iPad returns to the page.
- Limited tile-buffer requests and disabled GPU zoom animations on touch Safari while retaining animated transitions on desktop.
- Added detection of tile-load errors/stalls and a user-triggered **Оновити плитки** button. No background bulk retries or offline tile downloads.

This addresses plausible rendering/network causes of missing tiles. JavaScript syntax, DOM IDs, and GitHub assets were checked; end-to-end iPad Safari tile delivery remains to be confirmed by device testing. The community-hosted standard OpenStreetMap tile server has no SLA; for production-scale traffic, a contracted raster tile provider is required.

## Administrative polygon correction (v0.5.3)

Earlier builds mistakenly showed *all settlement polygons* from `<oblast>.<district>.<hromada>.geojson` when the selected item was a **hromada**, and all community polygons when selecting a **district**. Those are child features, not the selected administrative perimeter.

Now the implementation selects **exactly one matching OSM relation polygon** from the file of the parent level. For example, the selection `Калинівська громада` resolves to `Калинівська селищна громада` (OSM relation 12545509) inside `kyyivska_oblast.fastivskyy_rayon.geojson`; and `Фастівський район` resolves from `kyyivska_oblast.geojson`. If boundaries cannot be matched unambiguously, the UI falls back to a verified parent contour with explicit messaging. The hromada polygon can encompass multiple constituent villages; it should not be confused with the outline of its namesake settlement.
