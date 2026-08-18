/**
 * Renders the board with invented numbers, so the design can be worked on without a
 * token and without spending a rate limit.
 *
 * The numbers are chosen to exercise every case the tile draws differently: a rise, a
 * small rise, a fall, and no movement at all.
 *
 *   npm run preview   # writes into preview/
 */

const fs = require('fs')
const path = require('path')

const { statsBoard } = require('./render')

const OUT = path.join(__dirname, '..', 'preview')

const TILES = [
  { label: 'Contributions', value: 7146, delta: 312, baseline: 6834, windowDays: 30 },
  { label: 'Pull requests', value: 642, delta: 6, baseline: 636, windowDays: 30 },
  { label: 'Stars', value: 930, delta: -4, baseline: 934, windowDays: 30 },
  { label: 'Forks', value: 567, delta: 0, baseline: 567, windowDays: 30 },
]

fs.mkdirSync(OUT, { recursive: true })
const file = path.join(OUT, 'github-stats.svg')
fs.writeFileSync(file, statsBoard(TILES))
console.log(`wrote ${path.relative(process.cwd(), file)}`)
