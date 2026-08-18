/**
 * Number and sentence formatting for the tiles.
 *
 * The supporting line is written as words -- "up 4.6% in the last 30 days" -- rather
 * than as a signed number. Partly because the arrow beside the figure already carries
 * the sign and repeating it reads as noise, and partly because every supporting line
 * on the site's own stats page is a sentence ("across 237 active days of 2186", "on
 * days with any activity") rather than a second reading of the same figure.
 */

const NUMBER = new Intl.NumberFormat('en-US')

function number(n) {
  return NUMBER.format(Math.round(n))
}

/**
 * Percentages get one decimal below 10 and none above it. A stat that moved 4.6% is
 * a different claim from one that moved 5%; a stat that moved 23.4% is not.
 */
function percent(fraction) {
  const pct = Math.abs(fraction) * 100
  return `${pct < 10 ? pct.toFixed(1) : pct.toFixed(0)}%`
}

/**
 * The direction of a change, as the three cases the tile draws differently:
 * 'up' and 'down' get a coloured arrow, 'flat' gets a muted bar.
 */
function direction(delta) {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

/**
 * The supporting sentence.
 *
 * `baseline` may legitimately be 0 -- a repository's first fork, an account's first
 * month -- and a percentage of nothing is not a large number, it is no number at
 * all, so it is left out rather than printed as Infinity.
 */
function trendSentence({ delta, baseline, windowDays }) {
  const window = `in the last ${windowDays} ${windowDays === 1 ? 'day' : 'days'}`
  if (delta === null || delta === undefined) return `no earlier reading to compare with`
  if (delta === 0) return `no change ${window}`
  const word = delta > 0 ? 'up' : 'down'
  if (!baseline) return `${word} by ${number(Math.abs(delta))} ${window}`
  return `${word} ${percent(delta / baseline)} ${window}`
}

module.exports = { number, percent, direction, trendSentence }
