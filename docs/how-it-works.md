# How the stat board is made

The profile README is two pictures. Both are SVG, both are redrawn every morning, and
both are committed into `assets/` so the README can point at a plain file rather than
at a service that has to be up when someone visits the page.

```
.github/workflows/stats.yml   daily at 06:17 UTC, and on any push that touches src/
  └── src/index.js
        ├── src/github.js     four numbers, and a reconstructed month to compare with
        ├── src/history.js    assets/history.json -- one entry per day
        └── src/render.js     the pictures
              ├── src/design.js   the site's tokens, transcribed
              ├── src/panel.js    the extruded frame and its hand-drawn edges
              ├── src/text.js     layout against senthur-handwriting.woff
              └── src/glyphs.js   outlines, simplified and shared
```

## The four numbers

| Tile | Where it comes from | What it includes |
|---|---|---|
| Contributions | `contributionCalendar.totalContributions`, summed over every calendar year since the account opened | commits, pull requests, issues and reviews, **public and private** |
| Pull requests | `user.pullRequests.totalCount` | every pull request authored, in any repository the token can see |
| Stars | `stargazerCount` summed over public repositories owned by the account, plus public repositories in other organisations where the account has ADMIN | — |
| Forks | `forkCount` over the same set | — |

Two choices in that table are worth being explicit about, because both were decided
deliberately and either could reasonably have gone the other way.

**Private work counts.** The contributions figure is roughly 7,100 rather than the
2,800 a logged-out visitor can verify, because most of the work is in private
repositories. GitHub will not break that down by type — it reports private
contributions as one lump — which is why the tile says CONTRIBUTIONS rather than
COMMITS. Saying "commits" over a number that also contains pull requests, issues and
reviews would be the wrong label on a real number.

This also means the token matters. A PAT without `repo` scope answers every query here
without erroring, just with the public-only figure. `assertPrivateVisibility` in
`src/github.js` turns that into a failed workflow instead of a silent 60% haircut.

**Organisation projects count.** `opensourceleg`, `onshape-robotics-toolkit`,
`robot-ci` and `pyopensim` live under `neurobionics`, not under this account, and
between them they carry more stars and forks than everything this account owns. The
ADMIN filter is the line drawn between "a project of mine that happens to live in an
organisation" and "a repository I once sent a patch to".

`assets/github-stats.json` lists every repository that was counted, so any figure on
the board can be checked against GitHub by hand.

## The trend

Each tile shows how far its number has moved in the last thirty days. That comparison
needs yesterday's numbers, and GitHub does not keep them — it records when a star was
given but never when one was taken back. So `assets/history.json` is the record: one
entry per day, written by the workflow, read a month later.

The first run has nothing to compare against, so `github.backfill` reconstructs the
previous thirty days from the timestamps GitHub *does* keep: when each star was given,
when each fork and pull request was opened, and how many contributions landed on each
day. The board is therefore never published with four empty trends.

One limit, which ages out: a reconstructed day counts stars **gained**, because an
unstar leaves no trace to reconstruct from. A seeded window containing an unstar reads
very slightly high. Every day after the first run is a real measurement of the
displayed total, so this applies only to the seeded stretch and is gone within a month.

If `history.json` is ever lost, nothing breaks — the next run seeds it again.

## The pictures

Both are transcriptions of the tiles at
[senthurayyappan.com/stats](https://senthurayyappan.com/stats): the same two-by-two
grid, the same extruded frame with its accent right wall and blue bottom wall, the
same hand-drawn rule along each edge, the same type scale. `src/design.js` holds those
values with a note on where each was copied from. Where this disagrees with the site,
the site is right.

**Why the text is outlined.** GitHub serves these files through an `<img>`, which puts
them in the SVG spec's secure static mode — no external stylesheet, no external font,
no script. Naming a font family would fall back to whatever the reader's machine has,
which for a handwriting face means rendering in Arial at a different width, overflowing
the panel it was measured for. So every string is laid out against the real font at
build time and emitted as geometry. The cost is that the text is not selectable, which
is what the README's alt text and each file's `<title>` are for.

**Why the outlines are simplified.** `senthur-handwriting.woff` is a traced face:
every glyph is about 840 cubic segments, nearly all of them degenerate, each advancing
one thousandth of an em. Written out verbatim the four tiles came to 4.7 MB. Flattening
each contour and thinning it with Ramer–Douglas–Peucker at a tolerance of 4 font units
— under a pixel at every size these glyphs are drawn — then emitting each distinct
glyph once into `<defs>` and placing it with `<use>`, brings that to 45 KB.

**Light and dark.** Two files each, selected by the README's `<picture>` element on
`prefers-color-scheme`. The dark theme is the site's own: ink and paper swap, and the
accent wall goes from red to yellow, exactly as `--sa-accent` does in `tokens.css`. The
green used for a rising trend is re-stepped per theme rather than flipped, because
`--sa-green` clears 4.5:1 against only one of the two surfaces.

## Working on it locally

```bash
npm install
npm run preview          # invented numbers, no token, writes into preview/
GH_TOKEN=$(gh auth token) npm start   # the real thing, writes into assets/
```

`npm run preview` covers every case a tile draws differently — a rise, a small rise, a
fall, and no movement — which is the point of it having invented numbers rather than
real ones.
