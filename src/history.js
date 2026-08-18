/**
 * The daily snapshots the trend is measured against.
 *
 * A tile shows a number and how far it has moved. The move has to come from somewhere,
 * and asking GitHub "what was this a month ago" is not a question it answers for
 * stars or forks -- it records when a star was given, never when one was taken back.
 * So the file this module keeps IS the record: one entry per day, written by the
 * workflow, compared against a month later.
 *
 * The first run has nothing to compare against, which is what `github.backfill`
 * exists for -- it reconstructs the missing month from the timestamps GitHub does
 * keep, so the board is never published with four empty trends. From then on every
 * entry is a real measurement.
 *
 * If the file is ever lost, nothing breaks: the next run backfills again.
 */

const fs = require('fs')
const path = require('path')

/** The window every tile reports over. */
const WINDOW_DAYS = 30

/**
 * How much history to keep. Thirteen months, so a year-over-year comparison stays
 * possible without the file growing without bound -- at roughly 80 bytes an entry
 * this is well under 40 KB.
 */
const MAX_ENTRIES = 400

const FIELDS = ['contributions', 'pullRequests', 'stars', 'forks']

function load(file) {
  if (!fs.existsSync(file)) return []
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    // A truncated file is recoverable -- the next run backfills -- and refusing to
    // publish because of it would be a worse outcome than losing the trend.
    console.warn(`${file}: unreadable (${err.message}); starting a fresh history`)
    return []
  }
  const entries = Array.isArray(parsed) ? parsed : parsed.entries
  if (!Array.isArray(entries)) return []
  return entries
    .filter((e) => e && typeof e.date === 'string' && FIELDS.every((f) => Number.isFinite(e[f])))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function save(file, entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const kept = entries.slice(-MAX_ENTRIES)
  fs.writeFileSync(file, `${JSON.stringify({
    note: 'One entry per day. Written by src/index.js; see src/history.js for why it exists.',
    window_days: WINDOW_DAYS,
    entries: kept,
  }, null, 2)}\n`)
  return kept
}

function pick(source) {
  const out = { date: source.date }
  for (const field of FIELDS) out[field] = source[field]
  return out
}

/** Add or replace a day's entry. Re-running on the same day corrects it rather than duplicating it. */
function record(entries, snapshot) {
  const entry = pick(snapshot)
  const rest = entries.filter((e) => e.date !== entry.date)
  return [...rest, entry].sort((a, b) => a.date.localeCompare(b.date))
}

function daysBetween(fromISO, toISO) {
  return Math.round((Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / 86400000)
}

/**
 * The entry to measure against, and how old it actually is.
 *
 * Nearest to the target rather than "the newest one at least a month old": a run that
 * was skipped -- a failed workflow, a repository asleep over a holiday -- leaves a
 * hole, and the newest-before rule would answer it by silently widening the window to
 * whatever survived. The age is returned alongside so the tile can say what it
 * actually measured instead of claiming thirty days it did not have.
 */
function baseline(entries, todayISO, windowDays = WINDOW_DAYS) {
  const older = entries.filter((e) => e.date < todayISO)
  if (!older.length) return null
  let best = null
  for (const entry of older) {
    const age = daysBetween(entry.date, todayISO)
    const miss = Math.abs(age - windowDays)
    if (!best || miss < best.miss) best = { entry, age, miss }
  }
  return { entry: best.entry, windowDays: best.age }
}

module.exports = { load, save, record, baseline, daysBetween, WINDOW_DAYS, MAX_ENTRIES, FIELDS }
