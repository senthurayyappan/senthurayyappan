/**
 * The site's design tokens, transcribed for SVG.
 *
 * Everything here is copied from senthurayyappan.com rather than invented:
 * `packages/sa-ui/src/tokens.css` for the palette, `effects.css` for the extruded
 * frame, `components/stats/stats.css` for the tile's type scale. The numbers are the
 * computed values -- rem is resolved against a 16px root, `.42em` against its own
 * parent -- because SVG has no cascade to resolve them for us.
 *
 * If a value here ever disagrees with the site, the site is right.
 */

// ---------------------------------------------------------------- palette

/**
 * One palette, the site's light one, in both of GitHub's themes.
 *
 * There was a dark variant here, swapped in by a <picture> element on
 * prefers-color-scheme, and it was the site's own dark theme: ink and paper traded
 * places and the accent wall went red to yellow. It looked wrong in place. The site's
 * surface in dark mode is #15130d and GitHub's is #0d1117, so the panel faces landed
 * as a barely-lighter smudge on the page rather than as objects sitting on it, and
 * the frame -- the whole point of the thing -- stopped reading.
 *
 * Paper on GitHub's dark background reads as a card, which is what these are.
 */
const PALETTE = {
  ink: '#15130d',        // --sa-black  -> --sa-text
  paper: '#f6f4ee',      // --sa-white  -> --sa-surface
  accent: '#ef2841',     // --sa-red    -> --sa-accent
  bottom: '#007d7e',     // --sa-blue,  the extrude's bottom face in both themes
  // The trend arrows read as text, so they are taken from the stats page's own
  // green ramp at the step that clears 4.5:1 on this surface rather than from
  // --sa-green itself, which only clears 3.4:1 here. Red is the brand token: at
  // 3.9:1 on paper it clears the 3:1 large-text floor these sizes sit above.
  up: '#576f00',         // --stats-heat-4 (light)
  down: '#ef2841',       // --sa-red
}

/** `--stats-muted` is color-mix(in srgb, var(--text) 62%, transparent). */
const MUTED_OPACITY = 0.62

// ---------------------------------------------------------------- geometry

/**
 * The extruded frame. `depth` is --sa-panel-depth-rest; `edge` is the
 * --sa-panel-edge-width the stats page narrows to 1.5px.
 */
const EXTRUDE = { depth: 8, edge: 1.5 }

/** `.stats-card > .sa-panel { padding: 1.05rem 1.15rem 1.15rem }`. */
const PAD = { top: 16.8, side: 18.4, bottom: 18.4 }

/**
 * Type. Sizes are px; `track` and `word` are em, matching letter-spacing and
 * word-spacing. The tracking values are the `.font-handwritten` column of
 * stats.css -- the site loads the handwriting face by default, so that is the
 * column that actually renders for almost every visitor.
 */
const TYPE = {
  label: { size: 12.48, track: 0.09, word: 0.16, line: 1.5 },   // .stats-card-title
  value: { size: 52, track: 0.015, word: 0.16, line: 1 },       // .stats-tile-value
  delta: { size: 22, track: 0.08, word: 0.16, line: 1 },        // .stats-tile-unit (.42em)
  sub: { size: 12.8, track: 0.08, word: 0.16, line: 1.5 },      // .stats-tile-sub
}

/** `.stats-grid { gap: 1.5rem 1.35rem }` -- row gap, then column gap. */
const GAP = { row: 24, col: 21.6 }

/**
 * The two hand-drawn rules sa-ui masks over every panel edge, lifted verbatim from
 * --sketch-rule-h / --sketch-rule-v in tokens.css. Each is authored in a 100x5 box
 * and stretched along one axis only, which is why the stroke widths have to be
 * pinned with vector-effect rather than scaled with the box.
 */
const SKETCH = {
  h: [
    { d: 'M0 2.7 C13 1.1 23 3.8 36 2.2 S61 3.4 74 2.1 S91 3.3 100 2.3', width: 1.2, opacity: 1 },
    { d: 'M0 3.4 C18 2.4 31 3.7 48 2.8 S77 3.8 100 2.9', width: 0.55, opacity: 0.55 },
  ],
  v: [
    { d: 'M2.7 0 C1.1 13 3.8 23 2.2 36 S3.4 61 2.1 74 S3.3 91 2.3 100', width: 1.2, opacity: 1 },
    { d: 'M3.4 0 C2.4 18 3.7 31 2.8 48 S3.8 77 2.9 100', width: 0.55, opacity: 0.55 },
  ],
  /** The rule is authored 5 units deep and masked at 5px, so it never scales. */
  depth: 5,
}

module.exports = { PALETTE, MUTED_OPACITY, EXTRUDE, PAD, TYPE, GAP, SKETCH }
