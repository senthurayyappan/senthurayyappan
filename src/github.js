/**
 * Everything the board reads from GitHub.
 *
 * Two jobs, kept apart because they answer different questions:
 *
 *   `snapshot` is today's four numbers. It runs every time.
 *   `backfill` reconstructs the previous thirty days, one entry per day, from the
 *   timestamps GitHub already keeps -- when each star was given, when each fork and
 *   pull request was opened, how many contributions landed on each day. It runs only
 *   when history.json has nothing to compare against, which is the first run after
 *   this repository is set up or after the file is lost.
 *
 * WHAT THE CONTRIBUTION FIGURE INCLUDES. `contributionCalendar.totalContributions`
 * counts private work as well as public, but only for a caller whose token can see
 * it. Run with a token that cannot, the number silently drops to the public-only
 * figure -- 2,830 rather than 7,146 at the time of writing -- and nothing errors. The
 * workflow's PAT needs `repo` scope for the number to mean what the tile says it
 * means; `assertPrivateVisibility` below turns a wrong scope into a loud failure
 * instead of a quiet 60% haircut.
 *
 * WHAT `backfill` CANNOT SEE. GitHub records when a star was given but not when one
 * was taken away, so a reconstructed day counts stars *gained*. A seeded window that
 * contains an unstar reads very slightly high. Every day after the first run is a
 * real measurement of the displayed total, so the approximation ages out within a
 * month and never applies to more than the seeded stretch.
 */

const ENDPOINT = 'https://api.github.com/graphql'

async function gql(token, query, variables = {}) {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'senthurayyappan-profile-stats',
      },
      body: JSON.stringify({ query, variables }),
    })
    const body = await res.json().catch(() => null)
    if (res.ok && body && !body.errors) return body.data
    // 502s and secondary rate limits are routine on the GraphQL endpoint and are
    // both worth one retry; a bad query or a bad token is not, and 4xx says so.
    const retryable = res.status >= 500 || res.status === 429
    if (!retryable || attempt >= 3) {
      const detail = body && body.errors ? body.errors.map((e) => e.message).join('; ') : res.statusText
      throw new Error(`GitHub GraphQL ${res.status}: ${detail}`)
    }
    await new Promise((r) => setTimeout(r, attempt * 2000))
  }
}

function isoDay(date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Public repositories owned by the account, paginated.
 *
 * Forks are left out. A fork of someone else's work carries their stars, not mine --
 * one of these, a fork of an upstream research repository, brings 11 on its own -- and
 * counting them would make the tile answer a different question from the one it asks.
 */
async function ownedRepositories(token, login) {
  const query = `query($login:String!,$cursor:String){
    user(login:$login){
      repositories(first:100, after:$cursor, ownerAffiliations:[OWNER], privacy:PUBLIC,
                   isFork:false, orderBy:{field:STARGAZERS,direction:DESC}){
        pageInfo{ hasNextPage endCursor }
        nodes{ nameWithOwner stargazerCount forkCount }
      }
    }
  }`
  const out = []
  let cursor = null
  do {
    const page = (await gql(token, query, { login, cursor })).user.repositories
    out.push(...page.nodes)
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (cursor)
  return out
}

/**
 * Repositories the account does not own but administers.
 *
 * This is what puts opensourceleg, onshape-robotics-toolkit and the rest of the lab's
 * work on the board. The ADMIN filter is the line between "a project of mine that
 * happens to live in an organisation" and "a repository I once sent a patch to".
 */
async function administeredRepositories(token, login) {
  const query = `query($login:String!){
    user(login:$login){
      repositoriesContributedTo(first:100, contributionTypes:[COMMIT,PULL_REQUEST,REPOSITORY],
                                includeUserRepositories:false, privacy:PUBLIC,
                                orderBy:{field:STARGAZERS,direction:DESC}){
        nodes{ nameWithOwner stargazerCount forkCount viewerPermission isPrivate isFork }
      }
    }
  }`
  const nodes = (await gql(token, query, { login })).user.repositoriesContributedTo.nodes
  return nodes.filter((r) => r.viewerPermission === 'ADMIN' && !r.isPrivate && !r.isFork)
}

/** Contributions for one calendar year. GitHub refuses a range longer than that. */
async function yearContributions(token, login, year) {
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
    user(login:$login){
      contributionsCollection(from:$from,to:$to){
        contributionCalendar{ totalContributions }
        restrictedContributionsCount
      }
    }
  }`
  const from = `${year}-01-01T00:00:00Z`
  const to = `${year}-12-31T23:59:59Z`
  const c = (await gql(token, query, { login, from, to })).user.contributionsCollection
  return {
    total: c.contributionCalendar.totalContributions,
    restricted: c.restrictedContributionsCount,
  }
}

/** Today's four numbers, plus the repository list the caller needs for a backfill. */
async function snapshot(token, login) {
  const profile = await gql(token, `query($login:String!){
    user(login:$login){ createdAt pullRequests{ totalCount } }
  }`, { login })

  const firstYear = new Date(profile.user.createdAt).getUTCFullYear()
  const thisYear = new Date().getUTCFullYear()
  const years = []
  for (let y = firstYear; y <= thisYear; y += 1) years.push(y)
  const perYear = await Promise.all(years.map((y) => yearContributions(token, login, y)))

  const [owned, administered] = await Promise.all([
    ownedRepositories(token, login),
    administeredRepositories(token, login),
  ])
  // Both queries can name the same repository; the map keeps one of each.
  const repos = new Map()
  for (const repo of [...owned, ...administered]) repos.set(repo.nameWithOwner, repo)
  const list = [...repos.values()]

  return {
    date: isoDay(new Date()),
    contributions: perYear.reduce((sum, y) => sum + y.total, 0),
    restricted: perYear.reduce((sum, y) => sum + y.restricted, 0),
    pullRequests: profile.user.pullRequests.totalCount,
    stars: list.reduce((sum, r) => sum + r.stargazerCount, 0),
    forks: list.reduce((sum, r) => sum + r.forkCount, 0),
    repositories: list.map((r) => ({
      name: r.nameWithOwner,
      stars: r.stargazerCount,
      forks: r.forkCount,
    })),
  }
}

/**
 * Fail loudly if the token cannot see private work.
 *
 * A token without `repo` scope still answers every query here, just with smaller
 * numbers. That is the failure worth catching: a tile labelled CONTRIBUTIONS that
 * quietly stops counting most of them looks exactly like a tile that is working.
 */
function assertPrivateVisibility(snap) {
  if (snap.restricted > 0) return
  throw new Error(
    'contributionsCollection reported no private contributions at all, which means ' +
    'the token cannot see them. The tile would show public work only. Give the PAT ' +
    '`repo` scope, or switch the tile to the public-only figure on purpose.',
  )
}

/** Daily contribution counts across a window, as { 'YYYY-MM-DD': n }. */
async function contributionsByDay(token, login, from, to) {
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
    user(login:$login){
      contributionsCollection(from:$from,to:$to){
        contributionCalendar{ weeks{ contributionDays{ date contributionCount } } }
      }
    }
  }`
  const weeks = (await gql(token, query, { login, from: from.toISOString(), to: to.toISOString() }))
    .user.contributionsCollection.contributionCalendar.weeks
  const out = {}
  for (const week of weeks) {
    for (const day of week.contributionDays) out[day.date] = day.contributionCount
  }
  return out
}

/** Pull requests opened on each day of the window, as { 'YYYY-MM-DD': n }. */
async function pullRequestsByDay(token, login, since) {
  const query = `query($login:String!,$cursor:String){
    user(login:$login){
      pullRequests(first:100, after:$cursor, orderBy:{field:CREATED_AT,direction:DESC}){
        pageInfo{ hasNextPage endCursor }
        nodes{ createdAt }
      }
    }
  }`
  const out = {}
  let cursor = null
  // Newest first, so the first page that ends before the cutoff ends the walk.
  for (;;) {
    const page = (await gql(token, query, { login, cursor })).user.pullRequests
    let reachedCutoff = false
    for (const node of page.nodes) {
      const created = new Date(node.createdAt)
      if (created < since) { reachedCutoff = true; continue }
      const day = isoDay(created)
      out[day] = (out[day] || 0) + 1
    }
    if (reachedCutoff || !page.pageInfo.hasNextPage) break
    cursor = page.pageInfo.endCursor
  }
  return out
}

/**
 * Stars given and forks taken on each day of the window, per repository, summed.
 *
 * Only repositories that have any are asked about, which in practice is a couple of
 * dozen out of eighty-odd. The 100-item cap is a real limit: a repository that gained
 * more than 100 stars inside the window would be undercounted, so it is reported
 * rather than swallowed.
 */
async function repoEventsByDay(token, repos, since, warn = console.warn) {
  const query = `query($owner:String!,$name:String!,$stars:Int!,$forks:Int!){
    repository(owner:$owner,name:$name){
      stargazers(last:$stars, orderBy:{field:STARRED_AT,direction:ASC}){ edges{ starredAt } }
      forks(first:$forks, orderBy:{field:CREATED_AT,direction:DESC}){ nodes{ createdAt } }
    }
  }`
  const stars = {}
  const forks = {}
  for (const repo of repos) {
    if (!repo.stars && !repo.forks) continue
    const [owner, name] = repo.name.split('/')
    const wantStars = Math.min(100, repo.stars)
    const wantForks = Math.min(100, repo.forks)
    const data = await gql(token, query, {
      owner, name, stars: Math.max(1, wantStars), forks: Math.max(1, wantForks),
    })
    if (!data.repository) continue

    const starred = wantStars
      ? data.repository.stargazers.edges.map((e) => new Date(e.starredAt)).filter((d) => d >= since)
      : []
    for (const d of starred) {
      const day = isoDay(d)
      stars[day] = (stars[day] || 0) + 1
    }
    if (wantStars === 100 && starred.length === 100) {
      warn(`${repo.name}: more than 100 stars inside the window; the seeded baseline undercounts`)
    }

    const forked = wantForks
      ? data.repository.forks.nodes.map((n) => new Date(n.createdAt)).filter((d) => d >= since)
      : []
    for (const d of forked) {
      const day = isoDay(d)
      forks[day] = (forks[day] || 0) + 1
    }
    if (wantForks === 100 && forked.length === 100) {
      warn(`${repo.name}: more than 100 forks inside the window; the seeded baseline undercounts`)
    }
  }
  return { stars, forks }
}

/**
 * Reconstruct one entry per day for the `days` days before today.
 *
 * Walks backwards from today's totals, subtracting each day's gains, so the returned
 * series ends at the day before today and every entry is what the board would have
 * shown that morning.
 */
async function backfill(token, login, snap, days, warn = console.warn) {
  const today = new Date(`${snap.date}T00:00:00Z`)
  const since = new Date(today.getTime() - days * 86400000)

  const [byDayContributions, byDayPRs, repoEvents] = await Promise.all([
    contributionsByDay(token, login, since, today),
    pullRequestsByDay(token, login, since),
    repoEventsByDay(token, snap.repositories, since, warn),
  ])

  const series = []
  const running = {
    contributions: snap.contributions,
    pullRequests: snap.pullRequests,
    stars: snap.stars,
    forks: snap.forks,
  }
  for (let back = 0; back < days; back += 1) {
    const day = isoDay(new Date(today.getTime() - back * 86400000))
    running.contributions -= byDayContributions[day] || 0
    running.pullRequests -= byDayPRs[day] || 0
    running.stars -= repoEvents.stars[day] || 0
    running.forks -= repoEvents.forks[day] || 0
    const previous = isoDay(new Date(today.getTime() - (back + 1) * 86400000))
    series.push({ date: previous, ...running })
  }
  return series.reverse()
}

module.exports = { snapshot, backfill, assertPrivateVisibility, gql, isoDay }
