/**
 * Glyph outlines, simplified and shared.
 *
 * senthur-handwriting.woff is a traced face: every glyph is stored as roughly 840
 * cubic segments, and almost all of them are degenerate -- both control points sit on
 * the endpoints and the segment advances a single font unit, which is one thousandth
 * of an em. Written out verbatim at render size, the four tiles came to 4.7 MB, for a
 * picture that has to load on every visit to a profile page.
 *
 * Two reductions, in this order:
 *
 *   1. Each contour is flattened to a polyline and thinned with Ramer-Douglas-Peucker.
 *      The tolerance is in font units, so it is independent of the size the glyph is
 *      later drawn at; see TOLERANCE for how the value was chosen.
 *   2. Each distinct glyph is emitted once into <defs>, in font units, and placed with
 *      <use>. Digits and the letters of the labels repeat enough that this roughly
 *      halves what is left, and it keeps the coordinates as the small integers the
 *      font stores rather than as two-decimal pixel values.
 *
 * The outlines are y-flipped on the way in, so a <use> only ever needs a positive
 * uniform scale and the glyph lands with its baseline on the placement's y.
 */

/**
 * Douglas-Peucker tolerance, in font units (this face has 1000 to the em).
 *
 * 4 units is 0.21px at the 52px figure size and 0.05px at the 12.5px label size, so
 * it is under a pixel everywhere the glyphs are actually drawn. Raising it to 8
 * starts to flatten the tighter loops in the numerals; lowering it to 2 costs about
 * 40% more bytes for a difference no display can resolve.
 */
const TOLERANCE = 4

/** How finely a real curve is sampled before thinning. Degenerate ones need one point. */
function steps(len) {
  return Math.max(1, Math.min(16, Math.ceil(len / 3)))
}

function cubic(p0, c1, c2, p1, out) {
  const len = dist(p0, c1) + dist(c1, c2) + dist(c2, p1)
  const n = steps(len)
  for (let i = 1; i <= n; i += 1) {
    const t = i / n
    const u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ])
  }
}

function quadratic(p0, c, p1, out) {
  const len = dist(p0, c) + dist(c, p1)
  const n = steps(len)
  for (let i = 1; i <= n; i += 1) {
    const t = i / n
    const u = 1 - t
    out.push([
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
    ])
  }
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Perpendicular distance from p to the segment ab, with the degenerate case handled. */
function pointToSegment(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const square = dx * dx + dy * dy
  if (square === 0) return dist(p, a)
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / square
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Iterative Ramer-Douglas-Peucker; recursion would blow the stack at 840 points. */
function simplify(points, tolerance) {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let worst = 0
    let index = -1
    for (let i = first + 1; i < last; i += 1) {
      const d = pointToSegment(points[i], points[first], points[last])
      if (d > worst) {
        worst = d
        index = i
      }
    }
    if (index !== -1 && worst > tolerance) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** Split a glyph's commands into closed contours of points, y already flipped. */
function contours(glyph) {
  const out = []
  let current = null
  let pen = [0, 0]
  for (const cmd of glyph.path.commands) {
    if (cmd.type === 'M') {
      if (current && current.length > 2) out.push(current)
      pen = [cmd.x, -cmd.y]
      current = [pen]
    } else if (cmd.type === 'L') {
      pen = [cmd.x, -cmd.y]
      current.push(pen)
    } else if (cmd.type === 'C') {
      const end = [cmd.x, -cmd.y]
      cubic(pen, [cmd.x1, -cmd.y1], [cmd.x2, -cmd.y2], end, current)
      pen = end
    } else if (cmd.type === 'Q') {
      const end = [cmd.x, -cmd.y]
      quadratic(pen, [cmd.x1, -cmd.y1], end, current)
      pen = end
    } else if (cmd.type === 'Z') {
      if (current && current.length > 2) out.push(current)
      current = null
    }
  }
  if (current && current.length > 2) out.push(current)
  return out
}

/**
 * A glyph's outline as path data in font units.
 *
 * The contour is closed before thinning -- carrying the first point round to the end
 * is what stops Douglas-Peucker, which always keeps its endpoints, from pinning an
 * arbitrary point on a shape that has no ends.
 */
function outline(glyph, tolerance = TOLERANCE) {
  const parts = []
  for (const contour of contours(glyph)) {
    const closed = contour.concat([contour[0]])
    const thin = simplify(closed, tolerance)
    if (thin.length < 4) continue
    const body = thin
      .slice(0, -1)
      .map(([x, y], i) => `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)}`)
      .join('')
    parts.push(`${body}Z`)
  }
  return parts.join('')
}

/**
 * The set of glyphs one picture needs, each kept once.
 *
 * Keyed by glyph index rather than by character: this face maps more than one
 * codepoint onto some outlines, and the index is what identifies the outline.
 */
class GlyphSet {
  constructor() {
    this.ids = new Map()
    this.paths = []
  }

  id(glyph) {
    if (!this.ids.has(glyph.index)) {
      const d = outline(glyph)
      // Whitespace has no outline. Cached as null so it is not re-traced per space.
      const name = d ? `g${this.paths.length}` : null
      if (d) this.paths.push(`<path id="${name}" d="${d}"/>`)
      this.ids.set(glyph.index, name)
    }
    return this.ids.get(glyph.index)
  }

  defs() {
    return this.paths.length ? `<defs>${this.paths.join('')}</defs>` : ''
  }
}

module.exports = { GlyphSet, outline, TOLERANCE }
