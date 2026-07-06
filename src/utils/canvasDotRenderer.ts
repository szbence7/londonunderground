import { FONT_ASCENT_DOTS, FONT_FAMILY, fontSizeForPitch } from './dotMatrixFontFace';

/**
 * Assumed average width, in dot-columns, of one character — used only to *budget* how much
 * space a column (destination, time, ...) should reserve. The official font is proportional
 * (a 'C' is ~7 dots wide, an 'i' ~2), so actual drawing uses real fillText/measureText, not a
 * fixed per-character cell — this constant just sizes the panel sensibly up front.
 */
export const CHAR_CELL_WIDTH_DOTS = 6;

export interface DotStyle {
  /** distance in px between the centres of two adjacent dots */
  pitch: number;
  /** radius in px of a single dot */
  radius: number;
  /** colour of a lit dot */
  lit: string;
  /** colour of an unlit (but visible/energised) dot */
  dim: string;
  /** shadowBlur radius used to fake LED bloom on lit dots */
  glow: number;
  /** number of blank dot-columns budgeted between characters */
  charGap: number;
}

export const DEFAULT_DOT_STYLE: DotStyle = {
  pitch: 6,
  radius: 2.1,
  lit: '#ffb000',
  dim: 'rgba(255,140,0,0.07)',
  glow: 5,
  charGap: 1,
};

/** Total dot-columns a column budgeted for `charCount` characters should reserve. */
export function rowWidthInDots(charCount: number, charGap = DEFAULT_DOT_STYLE.charGap): number {
  if (charCount <= 0) return 0;
  return charCount * (CHAR_CELL_WIDTH_DOTS + charGap) - charGap;
}

function drawDot(ctx: CanvasRenderingContext2D, cx: number, cy: number, style: DotStyle, lit: boolean) {
  ctx.beginPath();
  ctx.arc(cx, cy, style.radius, 0, Math.PI * 2);
  if (lit) {
    ctx.shadowColor = style.lit;
    ctx.shadowBlur = style.glow;
    ctx.fillStyle = style.lit;
  } else {
    ctx.shadowBlur = 0;
    ctx.fillStyle = style.dim;
  }
  ctx.fill();
}

/** Draws the dim "energised but off" dot grid for a rectangular block of `cols` x `rows` dots. */
export function drawDimBackground(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  cols: number,
  rows: number,
  style: DotStyle = DEFAULT_DOT_STYLE,
) {
  for (let row = 0; row < rows; row++) {
    const cy = originY + row * style.pitch;
    for (let col = 0; col < cols; col++) {
      const cx = originX + col * style.pitch;
      drawDot(ctx, cx, cy, style, false);
    }
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  return measureCtx as CanvasRenderingContext2D;
}

function setFont(ctx: CanvasRenderingContext2D, style: DotStyle) {
  ctx.font = `${fontSizeForPitch(style.pitch)}px "${FONT_FAMILY}"`;
  ctx.textBaseline = 'alphabetic';
}

/** Measures the real rendered width (px) of `text` in the dot-matrix font at this style's pitch. */
export function measureTextWidthPx(text: string, style: DotStyle = DEFAULT_DOT_STYLE): number {
  if (!text) return 0;
  const ctx = getMeasureCtx();
  setFont(ctx, style);
  return ctx.measureText(text).width;
}

/**
 * Draws a string with the official LU dot-matrix typeface — its glyphs are themselves vector
 * circles on a dot grid, so fillText already renders as individually-lit LEDs once the font-size
 * is tuned so the font's native dot pitch matches `style.pitch` (see fontSizeForPitch). Text is
 * proportionally spaced (real character widths), not forced into fixed-width cells.
 * `originX/originY` is the top-left of the text's line; the glyphs sit on a baseline
 * `FONT_ASCENT_DOTS` rows down from that top edge.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  originX: number,
  originY: number,
  style: DotStyle = DEFAULT_DOT_STYLE,
): number {
  if (!text) return 0;
  setFont(ctx, style);
  ctx.fillStyle = style.lit;
  ctx.shadowColor = style.lit;
  ctx.shadowBlur = style.glow;
  const baselineY = originY + FONT_ASCENT_DOTS * style.pitch;
  ctx.fillText(text, originX, baselineY);
  return ctx.measureText(text).width;
}

/** Converts a dot-grid coordinate to a pixel coordinate given a pixel origin and style pitch. */
export function dotsToPx(dots: number, style: DotStyle = DEFAULT_DOT_STYLE): number {
  return dots * style.pitch;
}
