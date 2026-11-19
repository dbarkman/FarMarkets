# Far Markets

A trading game for phones, played in the browser at
[trader.redmesastudios.com](https://trader.redmesastudios.com). Travel between markets, buy
low, sell high, grow your ship or caravan, clear the debt and retire rich.

"Far Markets" is a working title.

## Three eras

Each era has its own map, goods, hazards and look:

- **Age of Sail**: eight ports of the eastern seas.
- **The Silk Road**: ten cities, with water to carry and winter passes to cross.
- **Space**: thirty-six star systems, limited by fuel range.

## How the market stays unsolved

A price is the good's base price, times the place's own multiplier, times four moving
parts: a fast daily wobble, a slow trend, the player's own pressure and news events such as
festivals and gluts. Buying pushes a price up and selling pushes it down. A bigger hold
moves prices more, so one route stops paying as the player grows.

The tests play whole games with bots, and they fail if a bot that repeats one route keeps
up with one that adapts.

## How it's built

One engine, three era packs, and the screens on top. Nothing is built or bundled: the
browser loads the files in `public/` as they are.

| Path | What it is |
|---|---|
| `public/js/engine/core.js` | Every rule: prices, trading, travel, encounters, debt, upgrades and scoring. The game is one plain object that saves as JSON. |
| `public/js/engine/rng.js` | Seeded random numbers, so a saved game replays the same way. |
| `public/js/packs/*.js` | One file per era. Data only. |
| `public/js/ui/` | The screens, the three maps and the art, all drawn as SVG. |
| `public/css/` | Shared layout and motion, plus each era's theme. |
| `public/api/save.php` | A server copy of saved games. |
| `tools/` | Bot players and the balance report. |

New players learn from a guided first trade, with a spotlight and a tapping hand, and the
first trip cannot fail.

## Run it

```bash
python3 -m http.server 8765 --directory public
```

Then open `http://localhost:8765`. Saved games stay in the browser, because the save
endpoint needs PHP.

```bash
tools/run.sh tests/engine.test.js
```

```bash
tools/run.sh tools/balance.js
```

`tools/run.sh` uses node when it is installed, and the JavaScript shell that ships with
macOS when it is not.
