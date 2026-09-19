# Orbit Dock

Fullscreen sci-fi **radial HUD launcher** for [Omarchy](https://omarchy.org) Quattro.
Orbiting glass discs for apps, themes, and agents — a Super+Space-style
alternative that looks like a starship command overlay.

Plugin id: `smf.orbit-dock`. Overlay kind, not a bar widget. From
[SMF Works](https://github.com/smfworks); destined for mikesai6 Omarchy
installs when that bundle is used.

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

## Usage

- Type to filter the orbit
- `←` `→` move around the current ring
- `Tab` / `↑` `↓` jump Apps · Themes · Agents
- `Enter` launches the selection
- `Escape` clears the filter, then closes
- Click the dimmed backdrop to dismiss

Idle tiles drift on a slow orbit. The selected disc pulses a neon glow.

## Data

- **Apps** — Quickshell `DesktopEntries` / Omarchy `appLibrary` when the shell
  exposes them; otherwise a curated demo ring so the HUD still looks complete
- **Themes** — `omarchy-theme-list` (or theme directories under
  `$OMARCHY_PATH/themes` and `~/.config/omarchy/themes`); otherwise demo names
- **Agents** — Hermes / [Neural Pulse](https://github.com/smfworks/omarchy-neural-pulse)
  / [Cron Constellation](https://github.com/smfworks/omarchy-cron-constellation)
  only when those plugins or a Hermes home/binary are actually present.
  Presence is `INSTALLED` / `DETECTED` / `DEMO`. Orbit Dock never invents live
  session status.

Launch uses the same helpers Omarchy already trusts: `uwsm-app -- gtk-launch`
for desktop entries (AppLibrary spirit / `smf.hermes` `bar.run`),
`omarchy-theme-set` for themes, `uwsm-app -- hermes` for Hermes, and
`omarchy-shell shell summon` for sibling SMF plugins.

## Contract

- `schemaVersion: 1`, id `smf.orbit-dock` (not `omarchy.*`)
- `kinds: ["overlay"]`, `entryPoints.overlay: "Overlay.qml"`
- `open(payloadJson)` / `close()` for `shell summon` / `shell hide`
- `keepLoaded: true` so the layer-shell window survives between summons
- Imports `qs.Ui` / `qs.Commons`; no symlinks

Optional payload:

```json
{ "filter": "term", "sector": "themes" }
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
