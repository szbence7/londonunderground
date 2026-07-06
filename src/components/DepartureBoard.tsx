import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHAR_CELL_WIDTH_DOTS,
  DEFAULT_DOT_STYLE,
  drawDimBackground,
  drawText,
  measureTextWidthPx,
  rowWidthInDots,
  type DotStyle,
} from '../utils/canvasDotRenderer';
import { FONT_GLYPH_HEIGHT_DOTS as GLYPH_HEIGHT, loadDotMatrixFontFace } from '../utils/dotMatrixFontFace';
import { formatClock } from '../utils/formatClock';
import './DepartureBoard.css';

export interface DepartureRowData {
  destination: string;
  time: string;
}

export interface DepartureBoardProps {
  /** Line/station info bar shown above the departure rows, e.g. "PICCADILLY LINE" */
  title?: string;
  /**
   * Upcoming arrivals, soonest first. Rows[0] and rows[1] are shown fixed (numbered 1, 2);
   * any further rows cycle one at a time through the third row (numbered 3, 4, 5...) with a
   * swipe-up transition, like the real boards.
   */
  rows: DepartureRowData[];
  /** Characters available for the destination column before it scrolls */
  destinationChars?: number;
  /** Characters reserved for the right-aligned time column */
  timeChars?: number;
  /** Shows the "STAND BACK" safety message (static, full row) in row 3 instead of the carousel */
  trainApproaching?: boolean;
  /**
   * Live service message (e.g. a line disruption reason) to scroll in row 3. Takes priority over
   * the carousel but not over `trainApproaching`, matching how real boards prioritise messages.
   */
  serviceMessage?: string | null;
  style?: Partial<DotStyle>;
}

const NUMBER_CHARS = 1;
const NUMBER_GAP_CHARS = 1;
const GAP_CHARS = 1;
const CONTENT_ROW_COUNT = 3;
const ROW_GAP_DOTS = 4;
const HEADER_GAP_DOTS = 4;
const STATUS_GAP_DOTS = 5;
const PANEL_MARGIN_DOTS = 2;
const STAND_BACK_MESSAGE = '*** STAND BACK - TRAIN APPROACHING ***';

const SCROLL_SPEED_PX_PER_SEC = 42;
const PAUSE_START_MS = 1400;
const PAUSE_END_MS = 700;
const CAROUSEL_SHOW_MS = 3500;
const CAROUSEL_TRANSITION_MS = 450;

type ScrollPhase = 'pause-start' | 'scrolling' | 'pause-end';

interface RowScrollState {
  phase: ScrollPhase;
  phaseElapsedMs: number;
  offsetPx: number;
  textWidthPx: number;
}

function freshScrollState(textWidthPx: number): RowScrollState {
  return { phase: 'pause-start', phaseElapsedMs: 0, offsetPx: 0, textWidthPx };
}

interface CarouselState {
  index: number;
  phase: 'showing' | 'transitioning';
  phaseElapsedMs: number;
}

interface RowLayout {
  numberStartDots: number;
  destinationStartDots: number;
  destinationAreaDots: number;
  timeStartDots: number;
  timeAreaWidthDots: number;
}

export default function DepartureBoard({
  title,
  rows,
  destinationChars = 32,
  timeChars = 6,
  trainApproaching = false,
  serviceMessage = null,
  style,
}: DepartureBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const housingRef = useRef<HTMLDivElement>(null);
  const fixedScrollStatesRef = useRef<RowScrollState[]>([]);
  const carouselScrollStatesRef = useRef<RowScrollState[]>([]);
  const carouselRef = useRef<CarouselState>({ index: 0, phase: 'showing', phaseElapsedMs: 0 });
  const statusScrollRef = useRef<RowScrollState>(freshScrollState(0));
  const serviceScrollRef = useRef<RowScrollState>(freshScrollState(0));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [fontReady, setFontReady] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const baseStyle: DotStyle = useMemo(() => ({ ...DEFAULT_DOT_STYLE, ...style }), [JSON.stringify(style)]);

  const charsPerRow = NUMBER_CHARS + NUMBER_GAP_CHARS + destinationChars + GAP_CHARS + timeChars;
  const cellDots = CHAR_CELL_WIDTH_DOTS + baseStyle.charGap;
  const layout: RowLayout = useMemo(
    () => ({
      numberStartDots: 0,
      destinationStartDots: (NUMBER_CHARS + NUMBER_GAP_CHARS) * cellDots,
      destinationAreaDots: destinationChars * cellDots,
      timeStartDots: (NUMBER_CHARS + NUMBER_GAP_CHARS + destinationChars + GAP_CHARS) * cellDots,
      timeAreaWidthDots: timeChars * cellDots,
    }),
    [cellDots, destinationChars, timeChars],
  );
  const rowWidthDots = rowWidthInDots(charsPerRow, baseStyle.charGap);

  const fixedRows = rows.slice(0, 2);
  const extraRows = rows.slice(2);
  const hasHeader = Boolean(title);

  const totalDotCols = rowWidthDots + PANEL_MARGIN_DOTS * 2;
  const totalDotRows =
    (hasHeader ? GLYPH_HEIGHT + HEADER_GAP_DOTS : 0) +
    CONTENT_ROW_COUNT * GLYPH_HEIGHT +
    (CONTENT_ROW_COUNT - 1) * ROW_GAP_DOTS +
    STATUS_GAP_DOTS +
    GLYPH_HEIGHT +
    PANEL_MARGIN_DOTS * 2;

  // At full size (pitch unscaled), this is how big the panel naturally wants to be.
  const naturalWidthPx = totalDotCols * baseStyle.pitch;
  const naturalHeightPx = totalDotRows * baseStyle.pitch;

  // In fullscreen, scale every dot up so the panel fills the screen without distorting
  // its aspect ratio (letterboxed on whichever axis has spare room).
  const fullscreenScale = isFullscreen
    ? Math.min(viewport.width / naturalWidthPx, viewport.height / naturalHeightPx)
    : 1;

  const dotStyle: DotStyle =
    fullscreenScale === 1
      ? baseStyle
      : {
          ...baseStyle,
          pitch: baseStyle.pitch * fullscreenScale,
          radius: baseStyle.radius * fullscreenScale,
          glow: baseStyle.glow * fullscreenScale,
        };

  const widthPx = totalDotCols * dotStyle.pitch;
  const heightPx = totalDotRows * dotStyle.pitch;

  useEffect(() => {
    let cancelled = false;
    loadDotMatrixFontFace().then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontReady) return;
    fixedScrollStatesRef.current = fixedRows.map((row) =>
      freshScrollState(measureTextWidthPx(row.destination, dotStyle)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedRows.map((r) => r.destination).join('|'), dotStyle.pitch, fontReady]);

  useEffect(() => {
    if (!fontReady) return;
    carouselScrollStatesRef.current = extraRows.map((row) =>
      freshScrollState(measureTextWidthPx(row.destination, dotStyle)),
    );
    carouselRef.current = { index: 0, phase: 'showing', phaseElapsedMs: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraRows.map((r) => r.destination).join('|'), dotStyle.pitch, fontReady]);

  useEffect(() => {
    if (!fontReady) return;
    statusScrollRef.current = freshScrollState(measureTextWidthPx(STAND_BACK_MESSAGE, dotStyle));
  }, [trainApproaching, dotStyle.pitch, fontReady]);

  useEffect(() => {
    if (!fontReady) return;
    serviceScrollRef.current = freshScrollState(serviceMessage ? measureTextWidthPx(serviceMessage, dotStyle) : 0);
  }, [serviceMessage, dotStyle.pitch, fontReady]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === housingRef.current);
    }
    function handleResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      housingRef.current?.requestFullscreen().catch(() => {});
    }
  }

  useEffect(() => {
    if (!fontReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = widthPx * dpr;
    canvas.height = heightPx * dpr;
    canvas.style.width = `${widthPx}px`;
    canvas.style.height = `${heightPx}px`;

    let raf = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dtMs = now - lastTime;
      lastTime = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, widthPx, heightPx);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, widthPx, heightPx);

      const originX = PANEL_MARGIN_DOTS * dotStyle.pitch;
      let originY = PANEL_MARGIN_DOTS * dotStyle.pitch;

      // dim "energised" background grid for the whole panel
      drawDimBackground(ctx, originX, originY, rowWidthDots, totalDotRows - PANEL_MARGIN_DOTS * 2, dotStyle);

      if (hasHeader && title) {
        drawText(ctx, title, originX, originY, dotStyle);
        originY += (GLYPH_HEIGHT + HEADER_GAP_DOTS) * dotStyle.pitch;
      }

      // rows 1-2: fixed, always the two soonest arrivals
      fixedRows.forEach((row, i) => {
        const rowY = originY + i * (GLYPH_HEIGHT + ROW_GAP_DOTS) * dotStyle.pitch;
        const state = fixedScrollStatesRef.current[i];
        if (state) drawNumberedRow(ctx, i + 1, row, state, originX, rowY, dtMs, dotStyle, layout);
      });

      // row 3: either the safety message (whole row, static) or a swipe-up carousel of the rest
      const row3Y = originY + 2 * (GLYPH_HEIGHT + ROW_GAP_DOTS) * dotStyle.pitch;
      const rowAreaPxWidth = rowWidthDots * dotStyle.pitch;
      const row3ClipTop = row3Y - dotStyle.radius - dotStyle.glow;
      const row3ClipHeight = (GLYPH_HEIGHT - 1) * dotStyle.pitch + dotStyle.radius * 2 + dotStyle.glow * 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(originX, row3ClipTop, rowAreaPxWidth, row3ClipHeight);
      ctx.clip();

      if (trainApproaching) {
        const state = statusScrollRef.current;
        const msgWidthPx = state.textWidthPx;
        const startX = originX + Math.max(0, (rowAreaPxWidth - msgWidthPx) / 2);
        drawText(ctx, STAND_BACK_MESSAGE, startX, row3Y, dotStyle);
      } else if (serviceMessage) {
        const state = serviceScrollRef.current;
        const overflowPx = state.textWidthPx - rowAreaPxWidth;
        if (overflowPx <= 0) {
          const startX = originX + Math.max(0, (rowAreaPxWidth - state.textWidthPx) / 2);
          drawText(ctx, serviceMessage, startX, row3Y, dotStyle);
        } else {
          updateScrollState(state, dtMs, overflowPx);
          drawText(ctx, serviceMessage, originX - state.offsetPx, row3Y, dotStyle);
        }
      } else if (extraRows.length > 0) {
        const carousel = carouselRef.current;
        updateCarouselState(carousel, dtMs, extraRows.length);
        const rowStepPx = GLYPH_HEIGHT * dotStyle.pitch;

        if (carousel.phase === 'showing' || extraRows.length === 1) {
          const state = carouselScrollStatesRef.current[carousel.index];
          if (state) {
            drawNumberedRow(
              ctx,
              3 + carousel.index,
              extraRows[carousel.index],
              state,
              originX,
              row3Y,
              dtMs,
              dotStyle,
              layout,
            );
          }
        } else {
          const progress = Math.min(1, carousel.phaseElapsedMs / CAROUSEL_TRANSITION_MS);
          const oldIndex = carousel.index;
          const newIndex = (carousel.index + 1) % extraRows.length;
          const oldState = carouselScrollStatesRef.current[oldIndex];
          const newState = carouselScrollStatesRef.current[newIndex];
          if (oldState) {
            drawNumberedRow(
              ctx,
              3 + oldIndex,
              extraRows[oldIndex],
              oldState,
              originX,
              row3Y - progress * rowStepPx,
              dtMs,
              dotStyle,
              layout,
            );
          }
          if (newState) {
            drawNumberedRow(
              ctx,
              3 + newIndex,
              extraRows[newIndex],
              newState,
              originX,
              row3Y + rowStepPx * (1 - progress),
              dtMs,
              dotStyle,
              layout,
            );
          }
        }
      }
      ctx.restore();

      // bottom status row: always the clock, independent of the safety message above
      const clockRowY =
        originY + (CONTENT_ROW_COUNT * GLYPH_HEIGHT + (CONTENT_ROW_COUNT - 1) * ROW_GAP_DOTS + STATUS_GAP_DOTS) * dotStyle.pitch;
      const clockText = formatClock(new Date());
      const clockWidthPx = measureTextWidthPx(clockText, dotStyle);
      const clockStartX = originX + (rowAreaPxWidth - clockWidthPx) / 2;
      drawText(ctx, clockText, clockStartX, clockRowY, dotStyle);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [
    fontReady,
    fixedRows,
    extraRows,
    title,
    hasHeader,
    trainApproaching,
    serviceMessage,
    widthPx,
    heightPx,
    rowWidthDots,
    totalDotRows,
    layout,
    dotStyle,
  ]);

  return (
    <div className="departure-board-wrap">
      <div ref={housingRef} className={`departure-board-housing${isFullscreen ? ' is-fullscreen' : ''}`}>
        <div className="departure-board-bezel">
          <canvas ref={canvasRef} className="departure-board-canvas" />
        </div>
      </div>
      {!isFullscreen && (
        <button type="button" className="departure-board-fullscreen-btn" onClick={toggleFullscreen}>
          Fullscreen
        </button>
      )}
    </div>
  );
}

function drawNumberedRow(
  ctx: CanvasRenderingContext2D,
  number: number,
  row: DepartureRowData,
  scrollState: RowScrollState,
  originX: number,
  rowY: number,
  dtMs: number,
  dotStyle: DotStyle,
  layout: RowLayout,
) {
  drawText(ctx, String(number), originX + layout.numberStartDots * dotStyle.pitch, rowY, dotStyle);

  const timeWidthPx = measureTextWidthPx(row.time, dotStyle);
  const timeAreaWidthPx = layout.timeAreaWidthDots * dotStyle.pitch;
  const timeOffsetPx = Math.max(0, timeAreaWidthPx - timeWidthPx);
  drawText(ctx, row.time, originX + layout.timeStartDots * dotStyle.pitch + timeOffsetPx, rowY, dotStyle);

  const destX = originX + layout.destinationStartDots * dotStyle.pitch;
  const destAreaPxWidth = layout.destinationAreaDots * dotStyle.pitch;
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    destX,
    rowY - dotStyle.radius - dotStyle.glow,
    destAreaPxWidth,
    (GLYPH_HEIGHT - 1) * dotStyle.pitch + dotStyle.radius * 2 + dotStyle.glow * 2,
  );
  ctx.clip();

  const overflowPx = scrollState.textWidthPx - destAreaPxWidth;
  if (overflowPx <= 0) {
    drawText(ctx, row.destination, destX, rowY, dotStyle);
  } else {
    updateScrollState(scrollState, dtMs, overflowPx);
    drawText(ctx, row.destination, destX - scrollState.offsetPx, rowY, dotStyle);
  }
  ctx.restore();
}

function updateScrollState(state: RowScrollState, dtMs: number, overflowPx: number) {
  state.phaseElapsedMs += dtMs;
  switch (state.phase) {
    case 'pause-start':
      state.offsetPx = 0;
      if (state.phaseElapsedMs >= PAUSE_START_MS) {
        state.phase = 'scrolling';
        state.phaseElapsedMs = 0;
      }
      break;
    case 'scrolling': {
      state.offsetPx = (state.phaseElapsedMs / 1000) * SCROLL_SPEED_PX_PER_SEC;
      if (state.offsetPx >= overflowPx) {
        state.offsetPx = overflowPx;
        state.phase = 'pause-end';
        state.phaseElapsedMs = 0;
      }
      break;
    }
    case 'pause-end':
      state.offsetPx = overflowPx;
      if (state.phaseElapsedMs >= PAUSE_END_MS) {
        state.phase = 'pause-start';
        state.phaseElapsedMs = 0;
      }
      break;
  }
}

function updateCarouselState(state: CarouselState, dtMs: number, itemCount: number) {
  if (itemCount <= 1) return;
  state.phaseElapsedMs += dtMs;
  if (state.phase === 'showing') {
    if (state.phaseElapsedMs >= CAROUSEL_SHOW_MS) {
      state.phase = 'transitioning';
      state.phaseElapsedMs = 0;
    }
  } else {
    if (state.phaseElapsedMs >= CAROUSEL_TRANSITION_MS) {
      state.index = (state.index + 1) % itemCount;
      state.phase = 'showing';
      state.phaseElapsedMs = 0;
    }
  }
}
