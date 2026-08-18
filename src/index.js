/**
 * Draws the stat board on my GitHub profile.
 *
 * Reads four numbers from GitHub, compares each against the same number a month ago,
 * and draws them into assets/github-stats.svg. It also refreshes the one sentence in
 * the README that names my most recent post. The workflow in
 * .github/workflows/stats.yml runs this daily and commits whatever moved.
 *
 *   node src/index.js            # needs GH_TOKEN
 *   npm run preview              # no network, invented numbers, for design work
 */

const fs = require('fs')
const path = require('path')

const { latestPost } = require('./blog')
const { snapshot, backfill, assertPrivateVisibility } = require('./github')
const history = require('./history')
const { statsBoard } = require('./render')

const ROOT = path.join(__dirname, '..')
const ASSETS = path.join(ROOT, 'assets')
const HISTORY_FILE = path.join(ASSETS, 'history.json')
const SNAPSHOT_FILE = path.join(ASSETS, 'github-stats.json')
const BOARD_FILE = 'github-stats.svg'
const README_FILE = path.join(ROOT, 'README.md')

/**
 * The stretch of README this run is allowed to rewrite.
 *
 * Markers rather than a line number or a pattern match on the old title: everything
 * else in that file is written by hand, and a rewrite that guessed at its own extent
 * would eventually guess wrong over someone's prose.
 */
const POST_START = '<!-- latest-post:start -->'
const POST_END = '<!-- latest-post:end -->'

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

/** Rewrite the blog sentence in place. Returns true if the file changed. */
function updateLatestPost(file, post) {
  const before = fs.readFileSync(file, 'utf8')
  const start = before.indexOf(POST_START)
  const end = before.indexOf(POST_END)
  if (start === -1 || end === -1 || end < start) {
    console.warn(`${path.basename(file)}: no latest-post markers; leaving it alone`)
    return false
  }
  const sentence = `Or check out my most recent post — [**${post.title}**](${post.url}).`
  const after = `${before.slice(0, start + POST_START.length)}\n${sentence}\n${before.slice(end)}`
  if (after === before) return false
  fs.writeFileSync(file, after)
  return true
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

  const post = await latestPost()
  if (post) {
    const changed = updateLatestPost(README_FILE, post)
    console.log(`latest post: ${post.title}${changed ? ' (README updated)' : ''}`)
  }

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
