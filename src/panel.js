/**
 * sa-ui's extruded panel, rebuilt out of SVG primitives.
 *
 * On the site the frame is three boxes: the face, plus two pseudo-elements skewed
 * 45 degrees to stand in for the right and bottom walls, each with a solid ink
 * border. The border of the face itself is not a border at all -- it is a wavy
 * hand-drawn rule masked over all four edges. See effects.css and panel.css.
 *
 * Resolving those skews once, in comments, so the polygons below are checkable:
 * with the face at (0,0,w,h) and depth d, `::before` lands its own top-left corner
 * at the face's top-right and skews down, and `::after` lands its top-left at the
 * face's bottom-left and skews right. Both walls therefore run down-and-right, and
 * together they extend the drawn area to (w+d, h+d).
 */

const { EXTRUDE, SKETCH } = require('./design')

/**
 * The hand-drawn rule along one edge.
 *
 * The path is authored in a 100x5 box and stretched along the edge it decorates,
 * exactly as the CSS mask does. Note what is deliberately NOT carried over: the
 * site pins these strokes with `vector-effect: non-scaling-stroke`, which measures
 * them in screen pixels. That is right for a page at a fixed zoom and wrong for an
 * image the README scales to fit -- pinned strokes would grow heavier as the panel
 * got smaller. Scaling one axis only leaves a near-horizontal stroke's visible
 * thickness governed by the untouched axis, so a plain stroke-width lands within a
 * hair of 1.2 anyway, and it scales with the picture.
 */
function rule(paths, { x, y, sx, sy, color }) {
  const strokes = paths
    .map((p) => `<path d="${p.d}" stroke-width="${p.width}"${p.opacity < 1 ? ` opacity="${p.opacity}"` : ''}/>`)
    .join('')
  return (
    `<g transform="translate(${round(x)} ${round(y)}) scale(${round(sx, 4)} ${round(sy, 4)})" ` +
    `fill="none" stroke="${color}" stroke-linecap="round">${strokes}</g>`
  )
}

function round(n, places = 2) {
  return Number(n.toFixed(places))
}

function poly(points, fill, stroke, width) {
  const d = points.map(([px, py]) => `${round(px)},${round(py)}`).join(' ')
  return `<polygon points="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="miter"/>`
}

/**
 * One panel's frame. Returns the walls, the face and the four rules, in paint order
 * -- the walls have to go down first because the face covers the corner where they
 * meet it, which is what makes the solid look solid.
 *
 * `x, y` is the face's top-left. The frame occupies `w + depth` by `h + depth`.
 */
function frame({ x, y, w, h, theme }) {
  const d = EXTRUDE.depth
  const e = EXTRUDE.edge
  const rightWall = poly(
    [[x + w, y], [x + w + d, y + d], [x + w + d, y + h + d], [x + w, y + h]],
    theme.accent, theme.ink, e,
  )
  const bottomWall = poly(
    [[x, y + h], [x + w, y + h], [x + w + d, y + h + d], [x + d, y + h + d]],
    theme.bottom, theme.ink, e,
  )
  const face = `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${theme.paper}"/>`
  const rules = [
    rule(SKETCH.h, { x, y, sx: w / 100, sy: 1, color: theme.ink }),
    rule(SKETCH.h, { x, y: y + h - SKETCH.depth, sx: w / 100, sy: 1, color: theme.ink }),
    rule(SKETCH.v, { x, y, sx: 1, sy: h / 100, color: theme.ink }),
    rule(SKETCH.v, { x: x + w - SKETCH.depth, y, sx: 1, sy: h / 100, color: theme.ink }),
  ].join('')
  return rightWall + bottomWall + face + rules
}

module.exports = { frame, round }
