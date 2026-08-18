/**
 * Text, converted to outlines.
 *
 * GitHub serves these files through an <img>, which puts them in the SVG spec's
 * secure static mode: no external stylesheet, no external font, no script. A
 * @font-face would have to carry the whole face inline as base64, and a bare
 * font-family name would fall back to whatever the reader's machine has -- which for
 * a handwriting face means it renders in Arial, at a different width, overflowing the
 * panel it was measured for.
 *
 * So every string is laid out here against the same senthur-handwriting.woff the site
 * loads, and emitted as <use> references to the simplified outlines in glyphs.js. Two
 * consequences worth stating plainly:
 *
 *   - The glyphs are identical to the site's, on every machine, with no download.
 *   - The text is no longer selectable or searchable, so the README's alt text and
 *     the <title> in each picture are the only things a screen reader gets. Keep
 *     them accurate.
 *
 * Laying the glyphs out one at a time, rather than handing the whole string to
 * opentype's getPath, is what makes letter-spacing and word-spacing available: the
 * site sets both on body, and without them this face collides with itself.
 */

const fs = require('fs')
const path = require('path')
const opentype = require('opentype.js')

const FONT_PATH = path.join(__dirname, '..', 'assets', 'senthur-handwriting.woff')

let cached = null

function font() {
  if (!cached) {
    const buf = fs.readFileSync(FONT_PATH)
    cached = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  }
  return cached
}

/**
 * Lay out one line.
 *
 * `track` and `word` are em, like the CSS properties they stand in for. CSS adds
 * letter-spacing after every character including the last, and that trailing space is
 * included in `width`, so a right-aligned string lands where CSS would put it.
 *
 * Pass a GlyphSet to get drawable placements back; omit it to measure only.
 */
function layout(text, { size, track = 0, word = 0, x = 0, y = 0 }, glyphs = null) {
  const f = font()
  const scale = size / f.unitsPerEm
  const run = f.stringToGlyphs(text)
  const uses = []
  let pen = x

  for (let i = 0; i < run.length; i += 1) {
    const glyph = run[i]
    if (glyphs) {
      const id = glyphs.id(glyph)
      if (id) uses.push({ id, x: pen, y, scale })
    }
    pen += glyph.advanceWidth * scale
    // Kerning belongs to the pair, so it is applied before the tracking that follows
    // the left glyph -- the order a text engine uses.
    if (i + 1 < run.length) pen += f.getKerningValue(glyph, run[i + 1]) * scale
    pen += track * size
    if (text[i] === ' ') pen += word * size
  }

  return { uses, width: pen - x }
}

/** The advance width only, for callers deciding where something else goes. */
function measure(text, opts) {
  return layout(text, { ...opts, x: 0, y: 0 }).width
}

/**
 * The distance from a line box's top edge to its baseline.
 *
 * Reproduces CSS inline layout: the content box is one em tall (this face's ascender
 * and descender sum to exactly unitsPerEm), half-leading splits the difference
 * against line-height, and the baseline sits an ascender below that.
 */
function baselineOffset({ size, line = 1 }) {
  const f = font()
  const halfLeading = (size * line - size) / 2
  return halfLeading + (f.ascender / f.unitsPerEm) * size
}

/** The full line box height, for stacking one line under another. */
function lineHeight({ size, line = 1 }) {
  return size * line
}

module.exports = { layout, measure, baselineOffset, lineHeight, font }
