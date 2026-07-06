import fontUrl from '../assets/fonts/LondonUnderground-Regular.ttf?url';

/**
 * The official LU dot-matrix typeface (petykowski/London-Underground-Dot-Matrix-Typeface,
 * SIL OFL) — its glyphs are literally vector circles laid out on a dot grid, so drawing text
 * with it via fillText already produces individually-lit LED dots; no hand-built bitmap needed.
 */
export const FONT_FAMILY = 'LU Dot Matrix';

// Measured from the font itself: rendering "H" at a 300px reference size, the touching-dot
// centres in one vertical stroke are ~33.35px apart. Scaling the font so that native dot
// pitch matches our on-screen `pitch` keeps individual LEDs crisp at any board size.
const FONT_REF_SIZE = 300;
const FONT_REF_PITCH = 33.35;

/** Rows of dot-pitch above the baseline needed for the tallest ascender/cap. */
export const FONT_ASCENT_DOTS = 8;
/** Rows of dot-pitch below the baseline needed for the deepest descender (g, y, p, j). */
export const FONT_DESCENT_DOTS = 2;
/** Total character cell height in dot-rows (ascent + baseline row + descent). */
export const FONT_GLYPH_HEIGHT_DOTS = FONT_ASCENT_DOTS + FONT_DESCENT_DOTS + 1;

/** The font-size (in px) that makes this font's native dot pitch equal `pitch` px on screen. */
export function fontSizeForPitch(pitch: number): number {
  return (FONT_REF_SIZE * pitch) / FONT_REF_PITCH;
}

let fontLoadPromise: Promise<void> | null = null;

/** Loads and registers the dot-matrix FontFace exactly once; safe to call from multiple components. */
export function loadDotMatrixFontFace(): Promise<void> {
  if (!fontLoadPromise) {
    const face = new FontFace(FONT_FAMILY, `url(${fontUrl})`);
    fontLoadPromise = face.load().then((loaded) => {
      document.fonts.add(loaded);
    });
  }
  return fontLoadPromise;
}
