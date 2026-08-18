/**
 * Draws the stat board on my GitHub profile.
 *
 * Reads four numbers from GitHub, compares each against the same number a month ago,
 * and draws them into assets/github-stats.svg. The README points at that file; the
 * workflow in .github/workflows/stats.yml runs this daily and commits it if it moved.
 *
 *   node src/index.js            # needs GH_TOKEN
 *   npm run preview              # no network, invented numbers, for design work
 */

const fs = require('fs')
const path = require('path')

const { snapshot, backfill, assertPrivateVisibility } = require('./github')
const history = require('./history')
const { statsBoard } = require('./render')

const ROOT = path.join(__dirname, '..')
const ASSETS = path.join(ROOT, 'assets')
const HISTORY_FILE = path.join(ASSETS, 'history.json')
const SNAPSHOT_FILE = path.join(ASSETS, 'github-stats.json')
const BOARD_FILE = 'github-stats.svg'

/**
 * The four tiles, in the order they are drawn: across the top row, then the bottom.
 *
 * `field` names the property on a snapshot and on every history entry, which is what
 * lets the trend be computed the same way for all four.
 */
const TILES = [
  { field: 'contributions', label: 'Contributions' },
  { field: 'pullRequests', label: 'Pull requests' },
  { field: 'stars', label: 'Stars' },
  { field: 'forks', label: 'Forks' },
]

function tilesFrom(snap, past) {
  return TILES.map(({ field, label }) => {
    const value = snap[field]
    if (!past) return { label, value, delta: null, baseline: null, windowDays: history.WINDOW_DAYS }
    const before = past.entry[field]
    return { label, value, delta: value - before, baseline: before, windowDays: past.windowDays }
  })
}

function writeSvg(name, contents) {
  const file = path.join(ASSETS, name)
  fs.writeFileSync(file, contents)
  console.log(`  ${name.padEnd(28)} ${(contents.length / 1024).toFixed(1)} KB`)
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  const login = process.env.GH_USERNAME || 'senthurayyappan'
  if (!token) throw new Error('GH_TOKEN is not set')

  console.log(`reading github as ${login}`)
  const snap = await snapshot(token, login)
  assertPrivateVisibility(snap)
  console.log(
    `  contributions ${snap.contributions} (${snap.restricted} of them private)` +
    `  pull requests ${snap.pullRequests}  stars ${snap.stars}  forks ${snap.forks}` +
    `  across ${snap.repositories.length} repositories`,
  )

  let entries = history.load(HISTORY_FILE)
  if (!entries.length) {
    // First run, or the file was lost. Reconstruct the month so the board is never
    // published with four empty trends; see github.backfill for what it can and
    // cannot recover.
    console.log(`no history yet; reconstructing the last ${history.WINDOW_DAYS} days`)
    const seeded = await backfill(token, login, snap, history.WINDOW_DAYS)
    entries = seeded.map((e) => ({ ...e, seeded: true }))
  }

  const past = history.baseline(entries, snap.date)
  if (past) {
    console.log(`comparing against ${past.entry.date} (${past.windowDays} days back)`)
  } else {
    console.log('nothing to compare against; the board will show no trend')
  }

  const tiles = tilesFrom(snap, past)
  for (const tile of tiles) {
    console.log(`  ${tile.label.padEnd(16)} ${String(tile.value).padStart(6)}  ${tile.delta === null ? '-' : (tile.delta > 0 ? '+' : '') + tile.delta}`)
  }

  fs.mkdirSync(ASSETS, { recursive: true })
  writeSvg(BOARD_FILE, statsBoard(tiles))

  const kept = history.save(HISTORY_FILE, history.record(entries, snap))
  console.log(`history.json: ${kept.length} entries, ${kept[0].date} .. ${kept[kept.length - 1].date}`)

  // The board is a picture; this is the same content as text, so a reader who wants
  // to check a number against GitHub can see exactly which repositories were counted.
  fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    window_days: past ? past.windowDays : null,
    compared_against: past ? past.entry.date : null,
    tiles: tiles.map(({ label, value, delta, baseline }) => ({ label, value, delta, baseline })),
    snapshot: snap,
  }, null, 2)}\n`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
