# UK Train Board

A pixel-accurate emulation of a London Underground amber dot-matrix
departure board, built with React, TypeScript, and a Canvas rendering
engine using the actual official LU dot-matrix typeface.

## Status

Search any of the 272 London Underground stations, pick one, and the
board shows live TfL arrivals: two fixed rows for the soonest trains, a
third row that either shows the "STAND BACK" safety message (when a
train is due) or cycles through further arrivals with a swipe-up
transition, and a permanent clock row — same structure as the real
platform indicators. Multi-platform stations get a tab per platform.

## Getting a TfL API key

1. Go to the [TfL API Portal](https://api-portal.tfl.gov.uk) and sign up
   (free).
2. Create a new Application / Product subscription — the free tier is
   enough for polling a handful of stations every 20-30s.
3. Copy the **Primary key** it gives you.
4. Copy `.env.example` to `.env` and paste the key in:

   ```
   VITE_TFL_APP_KEY=your-key-here
   ```

   The app works without a key too (TfL allows unauthenticated calls at
   a lower rate limit), but a key avoids 429s during development.

`.env` is gitignored — never commit a real key. `.env.example` should
stay blank.

## Running the project

```bash
npm install
npm run dev
```

Then open the printed local URL (e.g. http://localhost:5173).

Other scripts:

```bash
npm run build     # type-check + production build
npm run lint       # oxlint
npm run preview    # preview the production build locally
```

## Project structure

```
src/
  components/
    DepartureBoard.tsx     # Canvas dot-matrix renderer (the board itself)
    DepartureBoard.css     # physical housing/bezel styling
    StationSelector.tsx    # searchable station combobox
    StationSelector.css
  data/
    stations.ts            # exports the full station list below
    londonUndergroundStations.json  # all 272 LU stations, snapshotted from the TfL API
  hooks/
    useTflArrivals.ts      # polling hook for live arrivals (25s default)
    useLineStatus.ts       # polls line disruption status for the active board's line
  services/
    tflApi.ts              # TfL Unified API client (arrivals, stop points, search, line status)
  mock/
    mockArrivals.ts        # sample data matching the real API shape (unused by the UI; handy for manual testing)
  state/
    boardStore.ts          # zustand store: selected station
  utils/
    canvasDotRenderer.ts    # proportional text + dim-background-grid drawing
    dotMatrixFontFace.ts    # loads the official font, exposes its measured metrics
    groupArrivals.ts        # groups arrivals by platform, formats rows
    formatArrivalTime.ts    # "Due" / "1 min" / "N mins"
    formatClock.ts          # "HH:MM:SS" in Europe/London time, always
  assets/fonts/
    LondonUnderground-Regular.ttf  # the official typeface (SIL OFL, see OFL-LICENSE.txt)
```

## Design notes

- **Font**: uses the actual official LU dot-matrix typeface
  ([petykowski/London-Underground-Dot-Matrix-Typeface](https://github.com/petykowski/London-Underground-Dot-Matrix-Typeface),
  SIL OFL) rather than a hand-drawn approximation. Its glyphs are
  themselves vector circles laid out on a dot grid, so drawing text
  with `fillText` already renders as individually-lit LEDs — the
  font-size is tuned (`dotMatrixFontFace.ts`) so the font's native dot
  pitch matches the board's on-screen dot pitch exactly. Text is drawn
  proportionally (real per-character widths via `measureText`), not
  forced into a fixed-width grid, since the font itself isn't monospace.
- **Rendering**: lit dots get an amber glow via `shadowBlur`, and a dim
  "energised but off" dot grid is drawn behind everything so the
  physical LED grid is visible even where nothing is lit, matching the
  real hardware.
- **Scrolling**: destination text that doesn't fit its column scrolls
  left with a pause at the start and end of each cycle, like the real
  boards' marquee behaviour. The bottom-row safety message is sized to
  always fit statically (no scroll), matching the real boards.
- **TfL API**: free, requires only an optional `app_key` for a higher
  rate limit. Arrivals come from `GET /StopPoint/{id}/Arrivals`; station
  data from `GET /StopPoint/Mode/{mode}` or `GET /StopPoint/Search/{query}`;
  line disruption messages from `GET /Line/{id}/Status` (polled every 60s).
- **Clock**: always shows UK local time (`Europe/London`, so it switches
  between GMT and BST automatically), regardless of the viewer's own
  timezone — matching how the real boards work.
- **Row 3 priority**: the safety message ("Due") beats a live line
  disruption message, which beats the swipe-up carousel of further
  arrivals, which beats nothing at all — matching how a real indicator
  would prioritise what to show.

## Refreshing the station list

`src/data/londonUndergroundStations.json` is a static snapshot (so the
combobox works instantly, offline, without spending API rate limit on
every page load). Regenerate it if new stations open:

```bash
node scripts/fetchStations.mjs
```

Only London Underground stations are included for now; DLR, Overground,
and Elizabeth line stations would need the same treatment against
`/StopPoint/Mode/dlr` etc. if you want to extend the selector to those.

## Future extension: National Rail

National Rail's live departure boards (Darwin/OpenLDBWS) are a separate
system from TfL — they need their own registration
(https://www.nationalrail.co.uk/developers) and speak SOAP/XML rather
than TfL's plain JSON REST API. Not built here; flagged as a possible
future extension for stations served by National Rail rather than the
Underground/DLR/Overground/Elizabeth line.
