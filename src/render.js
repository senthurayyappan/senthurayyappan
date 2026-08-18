/**
 * The picture the README shows: four tiles, two by two.
 *
 * It is a transcription of the four tiles at senthurayyappan.com/stats -- same grid,
 * same frame, same type scale -- carrying GitHub's numbers instead of wakapi's. Two by
 * two rather than four across for the reason stats.css gives for its own tiles: four
 * across leaves each one too narrow for the figure, and on a phone the README column
 * is about 360px wide, where a four-across board would render each tile at 90.
 *
 * The link to the stats page is a sentence in the README rather than a fifth panel.
 * A panel would have been a picture of a link -- unselectable, unsearchable, and one
 * more thing to redraw -- for text that markdown renders better.
 */

const { PALETTE, MUTED_OPACITY, EXTRUDE, PAD, TYPE, GAP } = require('./design')
const { GlyphSet } = require('./glyphs')
const { frame, round } = require('./panel')
const { layout, baselineOffset, lineHeight } = require('./text')
const { direction, number, trendSentence } = require('./format')

const WIDTH = 880
/** A hairline of room so the 1.5px wall strokes, which straddle their edge, fit. */
const MARGIN = 1

const TILE = { faceW: (WIDTH - GAP.col) / 2 - EXTRUDE.depth, faceH: 146 }

/** `.stats-tile-value { margin: .55rem 0 0 }` */
const VALUE_GAP = 8.8
/**
 * The space between the figure and its change mark. Wider than the space CSS renders
 * between a figure and its unit, because the flat mark is a short bar and at a
 * tighter gap it read as a hyphen belonging to the number: "567-" rather than "567,
 * unchanged".
 */
const DELTA_GAP = 19

/** Paint one laid-out run. Fill lives on the group; the outlines in <defs> carry none. */
function paint(run, colour, { muted = false } = {}) {
  if (!run.uses.length) return ''
  const body = run.uses
    .map((u) => `<use href="#${u.id}" transform="translate(${round(u.x)} ${round(u.y)}) scale(${round(u.scale, 5)})"/>`)
    .join('')
  return `<g fill="${colour}"${muted ? ` fill-opacity="${MUTED_OPACITY}"` : ''}>${body}</g>`
}

/**
 * The mark beside a figure. A filled triangle for a move, a bar for no move -- the
 * same three-state vocabulary a ticker uses, and never colour on its own: the
 * direction stays legible from the shape with the hue removed.
 */
function mark(dir, { x, baseline, size }) {
  const w = size * 0.62
  const h = size * 0.52
  const cy = baseline - size * 0.26
  if (dir === 'flat') {
    const barH = size * 0.09
    return {
      svg: `<rect x="${round(x)}" y="${round(cy - barH / 2)}" width="${round(w)}" height="${round(barH)}" fill="${PALETTE.ink}" fill-opacity="${MUTED_OPACITY}"/>`,
      width: w,
    }
  }
  const colour = dir === 'up' ? PALETTE.up : PALETTE.down
  const points = dir === 'up'
    ? [[x + w / 2, cy - h / 2], [x + w, cy + h / 2], [x, cy + h / 2]]
    : [[x, cy - h / 2], [x + w, cy - h / 2], [x + w / 2, cy + h / 2]]
  const d = points.map(([px, py]) => `${round(px)},${round(py)}`).join(' ')
  return { svg: `<polygon points="${d}" fill="${colour}"/>`, width: w }
}

/** One tile: label, figure, change mark, supporting sentence. */
function tile(stat, { x, y, glyphs }) {
  const parts = [frame({ x, y, w: TILE.faceW, h: TILE.faceH, theme: PALETTE })]
  const left = x + PAD.side

  const labelBase = y + PAD.top + baselineOffset(TYPE.label)
  parts.push(paint(layout(stat.label.toUpperCase(), { ...TYPE.label, x: left, y: labelBase }, glyphs), PALETTE.ink, { muted: true }))

  const valueTop = y + PAD.top + lineHeight(TYPE.label) + VALUE_GAP
  const valueBase = valueTop + baselineOffset(TYPE.value)
  const value = layout(number(stat.value), { ...TYPE.value, x: left, y: valueBase }, glyphs)
  parts.push(paint(value, PALETTE.ink))

  if (stat.delta !== null && stat.delta !== undefined) {
    const dir = direction(stat.delta)
    const m = mark(dir, { x: left + value.width + DELTA_GAP, baseline: valueBase, size: TYPE.delta.size })
    parts.push(m.svg)
    if (dir !== 'flat') {
      const run = layout(number(Math.abs(stat.delta)), {
        ...TYPE.delta,
        x: left + value.width + DELTA_GAP + m.width + TYPE.delta.size * 0.28,
        y: valueBase,
      }, glyphs)
      parts.push(paint(run, dir === 'up' ? PALETTE.up : PALETTE.down))
    }
  }

  const subTop = y + TILE.faceH - PAD.bottom - lineHeight(TYPE.sub)
  const subBase = subTop + baselineOffset(TYPE.sub)
  parts.push(paint(layout(trendSentence(stat), { ...TYPE.sub, x: left, y: subBase }, glyphs), PALETTE.ink, { muted: true }))

  return parts.join('')
}

function svgDocument({ width, height, label, defs, body }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" ` +
    `viewBox="0 0 ${round(width)} ${round(height)}" role="img" aria-label="${escapeAttr(label)}">` +
    `<title>${escapeText(label)}</title>${defs}${body}</svg>\n`
  )
}

function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, '&quot;')
}

/** The four tiles, in reading order across then down. */
function statsBoard(stats) {
  const glyphs = new GlyphSet()
  const pitchX = TILE.faceW + EXTRUDE.depth + GAP.col
  const pitchY = TILE.faceH + EXTRUDE.depth + GAP.row
  const body = stats
    .map((stat, i) => tile(stat, {
      x: MARGIN + (i % 2) * pitchX,
      y: MARGIN + Math.floor(i / 2) * pitchY,
      glyphs,
    }))
    .join('')
  const label = stats
    .map((s) => `${s.label}: ${number(s.value)}, ${trendSentence(s)}`)
    .join('. ')
  return svgDocument({
    width: WIDTH + MARGIN * 2,
    height: MARGIN * 2 + pitchY + TILE.faceH + EXTRUDE.depth,
    label,
    defs: glyphs.defs(),
    body,
  })
}

module.exports = { statsBoard, WIDTH }
