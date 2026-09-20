# Orbit Dock

Fullscreen sci-fi **radial HUD launcher** for [Omarchy](https://omarchy.org) Quattro.
Orbiting glass discs for apps, themes, and agents — a Super+Space-style
alternative that looks like a starship command overlay.

Plugin id: `smf.orbit-dock`. Overlay kind, not a bar widget. From
[SMF Works](https://github.com/smfworks); destined for mikesai6 Omarchy
installs when that bundle is used.

Adversarial review of whether the HUD is screenshot-trustworthy:
[docs/OPPOSITION.md](docs/OPPOSITION.md). Honesty patterns match
[Neural Pulse](https://github.com/smfworks/omarchy-neural-pulse) and
[Ghost Trace](https://github.com/smfworks/omarchy-ghost-trace).

## Demo

Orbit Dock on Omarchy (mikesai6) — fullscreen radial HUD launcher (apps / themes / agents).

https://github.com/smfworks/omarchy-orbit-dock/releases/download/demo/demo.mp4

## Install

```sh
omarchy plugin add https://github.com/smfworks/omarchy-orbit-dock.git --enable
```

Plugins run **unsandboxed** inside the long-lived `omarchy-shell` process, with
your user permissions. Review this repo before enabling.

## Summon

This is a fullscreen `overlay`, same contract as first-party pickers
(`omarchy.emojis`, `omarchy.clipboard`, `omarchy.image-picker`):

```sh
omarchy-shell shell summon smf.orbit-dock '{}'
omarchy-shell shell hide smf.orbit-dock
omarchy-shell shell toggle smf.orbit-dock '{}'
```

Bind it like Super+Space if you want a HUD instead of the stock launcher:

```
bind = SUPER, O, exec, omarchy-shell shell toggle smf.orbit-dock '{}'
```

Force the labeled DEMO rings even on a live desktop (screenshot harness):

```sh
omarchy-shell shell summon smf.orbit-dock '{"demo":true}'
```

## Usage

- Type to filter the orbit
- `←` `→` move around the current ring
- `Tab` / `↑` `↓` jump Apps · Themes · Agents (skips an empty sector)
- `Enter` launches a **LIVE** selection; a **DEMO** disc stays open and says
  it cannot launch
- `Escape` clears the filter first, then closes — the footer says which step
- Click the dimmed backdrop to dismiss

Idle tiles drift on a slow orbit. The selected disc pulses a neon glow.

## DEMO vs LIVE

The honesty bar is labeled so a screenshot is self-describing — same contract
as Ghost Trace and Neural Pulse. Each sector (apps, themes, agents) carries
its own chip:

- **LIVE** — that sector was discovered from the desktop / Omarchy / an
  installed plugin
- **DEMO** — not probed yet, or `{"demo":true}`. A curated ring still fills
  the HUD so it is not blank; every disc says **DEMO** and Enter will not
  launch
- **EMPTY** — discovery succeeded and found nothing. The ring stays empty.
  Orbit Dock does not invent Terminal / Tokyo Night / Hermes to hide a
  vacant catalog
- **ERR** — app or theme discovery failed (both desktop sources threw, or
  `omarchy-theme-list` / `find` exited non-zero with no parseable names).
  A labeled DEMO fill is shown instead of a silent fake launcher
- **STALE** — a later probe failed after a live catalog was already shown.
  The last live discs remain; the chip says STALE, not LIVE

### Agents

Hermes / [Neural Pulse](https://github.com/smfworks/omarchy-neural-pulse)
/ [Cron Constellation](https://github.com/smfworks/omarchy-cron-constellation)
appear only when those plugins or a Hermes home/binary are actually present.

| Evidence | Chip |
| --- | --- |
| Plugin id installed (`smf.hermes`, `smf.neural-pulse`, `smf.cron-constellation`) | **INSTALLED** |
| `~/.hermes/state.db` readable or `hermes` on `PATH`, no plugin | **DETECTED** |
| Force-demo / unprobed fallback | **DEMO** |

Orbit Dock **never invents agent live status**. There is no LIVE / BUSY /
ONLINE / RUNNING badge on an agent disc. Presence is not a Hermes session
probe — that is Neural Pulse’s job.

## Data

- **Apps** — Quickshell `DesktopEntries` / Omarchy `appLibrary` when the shell
  exposes them. Empty list → EMPTY. Both sources throwing → ERR + DEMO fill
- **Themes** — `omarchy-theme-list` (or theme directories under
  `$OMARCHY_PATH/themes` and `~/.config/omarchy/themes`). Empty list → EMPTY.
  Non-zero exit with no names → ERR + DEMO fill
- **Agents** — as above. Missing plugins and no Hermes home/binary → EMPTY

Launch uses the same helpers Omarchy already trusts, and only after the
entry is live: `uwsm-app -- gtk-launch` for desktop entries (AppLibrary
spirit / `smf.hermes` `bar.run`), `omarchy-theme-set` for themes,
`uwsm-app -- hermes` for Hermes, and `omarchy-shell shell summon` for
sibling SMF plugins. A failed `execDetached` keeps the HUD open and says
**launch failed**.

## Contract

- `schemaVersion: 1`, id `smf.orbit-dock` (not `omarchy.*`)
- `kinds: ["overlay"]`, `entryPoints.overlay: "Overlay.qml"`
- `open(payloadJson)` / `close()` for `shell summon` / `shell hide`
- `keepLoaded: true` so the layer-shell window survives between summons
- Imports `qs.Ui` / `qs.Commons`; no symlinks

Optional payload:

```json
{ "filter": "term", "sector": "themes", "demo": true }
```

```sh
omarchy plugin validate .
```

## Tests

```sh
node tests/test_orbit_logic.js
```

## Remove

```sh
omarchy plugin remove smf.orbit-dock
```

## License

MIT. Copyright (c) 2026 SMF Works.
