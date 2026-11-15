# Far Markets

A trading game for phones, played in the browser at https://trader.redmesastudios.com.
Travel between markets, buy low, sell high, grow the ship or caravan, clear the debt and
retire rich. It has three eras, each with its own look: Age of Sail (eight ports of the
eastern seas), the Silk Road (ten cities, water and winter passes) and space (thirty-six
star systems, fuel range).

"Far Markets" is a working title.

## Rules of the house

- **The game is original.** Never name or copy another trading game: no borrowed names,
  ports lists, characters, events, text or art.
- **Family-friendly goods only.** No opium and no slave trade, in any era.
- **Show, don't tell.** New players learn from the guided first trade (a spotlight and a
  tapping hand), never from walls of text. The first trip cannot fail.
- **Everything animates.** A change on screen never snaps.
- **Sizes are in rem**, so the game follows the phone's text size.
- No family names, personal details or commercial game names in this repo.

## Layout

One engine, three era packs, and the screens on top. Nothing is built or bundled: the
browser loads the files in `public/` as they are.

| Path | What it is |
|---|---|
| `public/js/engine/core.js` | Every rule: prices, trading, travel, encounters, debt, upgrades, scoring. Knows nothing about the screen or any one era. The game is one plain object that saves as JSON. |
| `public/js/engine/rng.js` | Seeded random numbers, so a saved game replays the same way. |
| `public/js/packs/*.js` | One file per era: places, goods, prices, routes, vehicles, hazards, wording. Data only. |
| `public/js/ui/app.js` | The screens. Turns taps into engine calls. Saving and the first-game guide live here. |
| `public/js/ui/map.js` | The three maps (sea chart, road map, star chart) as SVG. |
| `public/js/ui/art.js` | Icons, vehicle silhouettes and the travel scenes as SVG. |
| `public/css/base.css` | Layout and motion shared by every era. |
| `public/css/themes.css` | Each era's colors, fonts and shapes. |
| `public/api/save.php` | Server copy of saved games (one JSON file per player in `data/saves`, outside the web root). |
| `tests/engine.test.js` | Engine tests. |
| `tools/bots.js`, `tools/balance.js` | Bot players and the balance report. |
| `deploy/` | The Apache vhost for web2. |

## How the market stays unsolved

A price is the good's base price, times the place's own multiplier, times four moving
parts: a fast daily wobble, a slow trend, the player's own pressure (buying pushes a price
up, selling pushes it down; most of that fades in a week, the rest lingers for months) and
news events (festivals, gluts). A bigger hold moves prices more, so one route stops paying
as the player grows. The tests play whole games with bots and fail if a bot that repeats
one route keeps up with one that adapts.

## Commands

```bash
tools/run.sh tests/engine.test.js   # tests
tools/run.sh tools/balance.js       # what each era pays out, by bot
```

`tools/run.sh` uses node when it is installed and the JavaScript shell that ships with
macOS when it is not.

To play locally, serve `public/` (for example `python3 -m http.server 8765 --directory public`).
Saved games then stay in the browser, because the save endpoint needs PHP. Adding `?debug`
to the address exposes the live game as `fm` in the console.

After changing numbers in a pack, run the balance report and keep each era's `goal` near
what the `seen` bot earns.

## Saved games

Each era has its own save. The browser keeps them in localStorage and sends a copy to
`api/save.php`, which remembers the player with a cookie it sets itself and restores the
games when the browser has lost them. The Ledger shows a ten-letter code that brings the
games to another device. `migrate()` in the engine fills in anything an older save lacks;
a new field on the game object needs a default there, and a test.

## Deploy

web2 serves `public/` from a checkout at `/var/www/html/trader.redmesastudios.com`.

Push, then on web2:

```bash
sudo -u apache git -C /var/www/html/trader.redmesastudios.com pull --ff-only
```

The checkout uses the read-only deploy key `/etc/ssh/farmarkets-deploy`. The vhost is
`deploy/trader.redmesastudios.com.conf`, copied to `/etc/httpd/conf.d/`. `data/` is
apache-writable and never in git. Bump the `?v=` numbers in `public/index.html` when a
file's change must reach phones at once.
