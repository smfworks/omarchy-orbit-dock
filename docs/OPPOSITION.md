# Opposition: do not trust Orbit Dock yet

Adversarial review of `smf.orbit-dock` (Omarchy Quattro `overlay`).
Scope at review time: `Overlay.qml`, `OrbitTile.qml`, `OrbitLogic.js`,
`manifest.json`, `README.md`, `tests/test_orbit_logic.js`.

Method: assume a user screenshots the radial HUD and believes the discs are
their apps, themes, and agents. Argue against that trust. Example inputs are
concrete. Honesty patterns are taken from sibling plugins
[omarchy-neural-pulse](https://github.com/smfworks/omarchy-neural-pulse)
(`docs/OPPOSITION.md`: DEMO / ERR / STALE on the face, empty home ≠ healthy
idle, never invent a live signal) and
[omarchy-ghost-trace](https://github.com/smfworks/omarchy-ghost-trace)
(screenshot-proof LIVE / DEMO / STALE / ERR chip, empty trail vs IPC failure,
Hermes presence is DETECTED only — never session status).

## Addressed in honest-orbit

The follow-up product work in this same PR (`Honest orbit — OPPOSITION + trust
fixes`) changes the trust contract this review asked for:

- Per-sector **LIVE / DEMO / EMPTY / ERR / STALE** chips on the HUD face
- Demo tiles always say **DEMO**; live apps/themes say **LIVE**; agents are
  **INSTALLED** / **DETECTED** / **DEMO** only
- Hermes home/binary without `smf.hermes` is **DETECTED**, not INSTALLED
- Agents never receive LIVE / BUSY / ONLINE / RUNNING
- Empty successful catalogs stay empty; discovery failures show **ERR** and
  a labeled demo fill instead of a silent fake ring
- Escape chrome matches the two-step filter-then-close behavior
- Enter on a demo/noop disc stays open and says it cannot launch
- `execDetached` failures surface instead of dismissing into silence

Remaining P1/P2 items (ring caps, 40 ms canvas, theme-list timeout, icon
misses) are still open. The analysis below is the pre-fix evidence.

---

## 1. Executive opposition

Orbit Dock sells a fullscreen starship HUD as a Super+Space launcher. The
rings are always full. That is the lie. `mergeCatalog` substitutes a curated
demo of Terminal, Browser, Tokyo Night, Hermes, Neural Pulse, and Cron
Constellation whenever a sector has zero live rows. Tiles do not say DEMO
unless you happen to select an *agent* whose `presence` was set. Apps and
themes have `source: "demo"` and `presence: ""`, so `presenceLabel` returns
blank. The core caption is a 0.45-opacity whisper (`demo apps · themes ·
demo agents`) that a screenshot crops away. Enter on a demo disc **closes the
overlay and launches nothing**. Escape is advertised as “close” while the
first press only clears the filter. Theme and desktop discovery failures take
the same path as “nothing installed”: empty list → demo fill → no ERR chip.
Hermes seen only as `~/.hermes/state.db` or `command -v hermes` is labeled
**INSTALLED**, not DETECTED. Until a screenshot of the HUD is
self-describing, this overlay is set dressing, not a launcher.

---

## 2. P0 trust-breakers

### P0-1 — Silent demo fill makes a dead install look complete

`OrbitLogic.js` `mergeCatalog`:

```javascript
var liveApps = (apps && apps.length) ? apps : demoApps()
var liveThemes = (themes && themes.length) ? themes : demoThemes()
var liveAgents = (agents && agents.length) ? agents : demoAgents()
```

Three independent silent substitutions. `Overlay.qml` `refreshCatalog` starts
with `themesLive === false`, so the first paint is always demo themes. If
`omarchy-theme-list` / `find` later returns nothing, `applyThemeList("")`
keeps `themesLive` false and merges demo themes again. `collectApps` swallows
both `appLibrary.sortedEntries` and `DesktopEntries` exceptions into `[]`,
then `appsLive = apps.length > 0` is false, then merge fills twelve fake
desktop names. `collectAgents` on a machine with no SMF plugins and no Hermes
returns `[]`; merge fills Hermes / Neural Pulse / Cron Constellation.

**Example.** Fresh Omarchy box, plugins disabled, no `~/.hermes`,
`DesktopEntries` throws because the overlay was opened from `qmlscene`.
Screenshot: twelve app discs, eight theme discs, three agent discs, caption
`ORBIT DOCK`. Nothing on the face says DEMO. Neural Pulse’s bar at least had
a tooltip; Orbit Dock’s demo mark is a faint third line inside the core
ellipse.

Sibling contrast: Ghost Trace still paints a trail when Hyprland is missing,
but the top chip is **DEMO** or **ERR**. Neural Pulse paints **DEMO** on the
bar face when `state.db` is not opened. Orbit Dock’s demo is camouflage.

### P0-2 — Apps and themes are not labeled DEMO vs LIVE

`item()` defaults `presence: ""`, `source: "catalog"`. `markDemo` sets
`source: "demo"` and only writes `presence = "demo"` for `sector ===
"agents"`. `presenceLabel` keys off `presence` alone:

```javascript
if (value === "demo") return "DEMO"
if (value === "installed") return "INSTALLED"
if (value === "detected") return "DETECTED"
return ""
```

Demo Terminal / Osaka Jade therefore have no chip. Live Alacritty /
`omarchy-theme-list` “Tokyo Night” also have no chip. `OrbitTile.qml` further
hides the chip unless `selected`. A cropped screenshot of the orbit (the
interesting part) has **zero** DEMO / LIVE marks.

`catalogHint(appsLive, themesLive, agentsLive)` prints `apps` (not LIVE) when
true and `demo apps` when false. Mixed state `LIVE apps · DEMO themes · DEMO
agents` is not what the string says. There is no EMPTY. There is no ERR.
There is no STALE.

README already claims “Presence is `INSTALLED` / `DETECTED` / `DEMO`” for
agents and “never invents live session status.” The HUD does not implement
the first half of that sentence for apps/themes, and it implements DETECTED
incorrectly (P0-3).

### P0-3 — Agent “live” is invented two ways (INSTALLED for a file, and a full demo crew)

`detectAgents`:

```javascript
if (hermesPlugin || hermesHome || hermesBin) {
  var hermes = agentItem("hermes", "Hermes", "launch-hermes", "󰚩", "installed")
  hermes.source = hermesPlugin ? "plugin" : "detected"
  out.push(hermes)
}
```

`FileView` on `~/.hermes/state.db` `onLoaded` sets `hermesHome = true`.
`Process` `command -v hermes` sets `hermesBin`. Either flag produces
**INSTALLED**. Ghost Trace’s identical probe is honest: presence `detected`,
detail “no session status.” Orbit Dock’s chip says the plugin is installed
when only a leftover CLI or an empty-ish SQLite file exists.

`neverLiveStatus` exists only as a unit-test helper. Overlay never calls it.
`presenceLabel` will happily return `"LIVE"` if anyone sets `presence:
"live"`. Nothing in the overlay rejects LIVE / BUSY / ONLINE / RUNNING on
agent discs. The demo crew (`demoAgents`) is three named products the user
does not have. Entering them looks like launching an agent fleet.

Neural Pulse spent a whole P0 on false busy (`pgrep -x hermes`, WAL mtime,
ghost `ended_at IS NULL` rows). Orbit Dock does not poll Hermes sessions —
good — but it still **invents a populated agent ring** and an INSTALLED badge
from a file probe. That is the same class of lie: the HUD asserts agent
reality it did not observe.

### P0-4 — Enter and Escape lie; failed launches vanish

Footer chrome (`Overlay.qml`):

```
ESC close   ·   ENTER launch   ·   ← → orbit   ·   TAB sector
```

Actual Escape handler: if `filterText` is non-empty, `setFilter("")`; else
`dismiss()`. README is honest (“clears the filter, then closes”). The HUD is
not. A user who typed `term` and hits Escape believes they dismissed the
overlay; they only cleared the query. Second Escape closes. Two-step is
fine. Advertising one step is not.

`activateIndex`:

```javascript
root.dismiss()
if (spec.kind === "demo" || spec.kind === "noop") return
root.runArgv(spec.argv)
```

Order is dismiss-first. Demo Terminal (`launch-app` with empty `desktopId`)
returns `{ kind: "demo", argv: [] }`. The HUD disappears. Nothing starts.
Same for demo Tokyo Night (`source === "demo"`), demo Hermes, demo Neural
Pulse, and any `noop`. The user is now looking at their desktop wondering
where the terminal went.

`runArgv` then swallows both `Quickshell.execDetached` and `Util.execDetached`
exceptions. A live Alacritty whose `gtk-launch` is missing, or
`omarchy-theme-set` not on `PATH`, closes the overlay and fails silent.
Ghost Trace only dismisses after a successful Hyprland dispatch and sets an
error when both dispatch paths fail. Orbit Dock never holds a launch error.

### P0-5 — Empty catalog and discovery error are the same screenshot

| Input | Code path | What the user sees |
| --- | --- | --- |
| `DesktopEntries` empty list, no throw | `apps = []`, `appsLive = false`, merge demo | Full fake app ring, no EMPTY |
| `appLibrary.sortedEntries` throws, `DesktopEntries` throws | both `catch` → `[]` | Same fake ring, no ERR |
| `omarchy-theme-list` missing, both theme dirs absent | `find` prints nothing, exit 0 | Demo themes, no EMPTY |
| `omarchy-theme-list` exits 1, stdout empty | `onStreamFinished` `applyThemeList("")` — **no `onExited`** | Demo themes, no ERR |
| `pluginRegistry.installedPlugins` throws | `installedPluginIds` returns `[]` | Demo agents, no ERR |
| Theme `Process` still running | `themesLive` false | Demo themes flash, labeled as if final |

`themeListProc` has no `onExited`. A non-zero exit with empty stdout is
indistinguishable from “user has zero themes.” `applyThemeList` then
re-pulls apps/agents from `root.catalog`; if those sectors were demo-filled,
`itemsForSector` returns demo rows, and the `if (!root.appsLive) apps = []`
guard is the only thing preventing demo apps from being treated as live on
the next merge. One missed flag and demo tiles become `source: "demo"` still
but get re-merged as the live list. There is no STALE path when a later
theme probe fails after a successful one.

Neural Pulse: unreadable `state.db` is ERR, empty `~/.hermes` dir is DEMO,
not “Idle · no sessions yet.” Ghost Trace: IPC fail with a prior ring is
STALE; IPC fail with no ring is ERR + labeled demo trail. Orbit Dock has
one bucket: look complete.

---

## 3. P1 gaps / correctness

### Labels only appear on the selected agent

`OrbitTile.qml` `visible: tile.presence.length > 0 && tile.selected`. Even
after P0-2 is fixed in data, a screenshot of unselected discs stays mute.
Honesty has to live on the face: a top chip bar (Ghost Trace) **and** a
DEMO/LIVE/DETECTED mark on the disc itself.

### `catalogHint` is not a trust label

Boolean `appsLive` cannot express EMPTY vs ERR vs STALE vs mixed DEMO.
Opacity 0.45, caption size, inside the core — cropped in every pretty
photo of the orbit.

### Ring caps silently drop the real catalog

`RING_CAPS = { apps: 16, themes: 10, agents: 6 }` and `MAX_SEARCH_RESULTS =
24`. A machine with 80 desktop entries shows 16 and never says “+64”.
Search can hide the rest. This is a correctness gap, not a demo lie, but a
screenshot of “the launcher” is not the launcher.

### Theme list is a racy bash string

`omarchyPath` is concatenated into `bash -c` (`"find … \"" +
(root.omarchyPath || "/usr/share/omarchy") + "/themes\" …"`). A path with a
quote or space breaks parsing; failure becomes empty stdout becomes demo
(P0-5). `themeListProc` is not restarted if it already finished, so
`keepLoaded: true` can show yesterday’s theme set as LIVE after the user
installs one.

### Hermes `FileView` is existence, not “agent ready”

`onLoaded` means Quickshell could read the file. A zero-byte or foreign
SQLite still sets `hermesHome`. That must stay DETECTED (file/binary seen),
never INSTALLED, never LIVE. Overlay does not surface “state.db present —
no session status” the way Ghost Trace does.

### Sector Tab lands on a missing ring

`firstIndexForSector` returns `0` when the sector has no rows. Tab to
Themes on an EMPTY theme ring selects an app disc and then sets
`activeSector` from that disc. The HUD pretends you changed sectors.

### Payload cannot force DEMO

Ghost Trace accepts `{"demo":true}` so a screenshot harness is honest.
Orbit Dock accepts `filter` / `sector` only. Reviewers cannot summon a
labeled demo on a live desktop.

### README is ahead of the HUD

README already documents demo fallback, INSTALLED / DETECTED / DEMO, and
“never invents live session status.” The product does not match. That is
worse than a quiet README: it trains reviewers to trust the screenshot.

### Process / registry errors are swallowed

`installedPluginIds`, `iconFor`, `runArgv`, both app collectors, and
`FileView.onLoadFailed` all fail closed into “looks fine.” High-value ones
are the catalog probes and the launch path (P0). Icon misses falling back
to a glyph are acceptable.

### No `pgrep` (already holds)

Tests assert `!src.includes("pgrep")`. Keep that. Do not regress into
Neural Pulse’s false-busy trap to “fix” agent presence.

---

## 4. P2 improvements

- Extract theme discovery out of `bash -c` (a tiny helper or `Process`
  argv list). The sed rewrite of directory names is a second source of
  slugs that may not match `omarchy-theme-set`.
- Bound or stop the 40 ms `rings.requestPaint` timer when the overlay is
  hidden (it already keys on `opened` — good) and when the session is
  locked.
- Timeout `themeListProc` / `hermesBinProc` so a hung `find` cannot leave
  DEMO themes forever with `themesProbed === false`.
- Say “+N more” when `capItems` truncates; or page the ring.
- `qmllint -I "$OMARCHY_PATH/shell" Overlay.qml OrbitTile.qml` in README;
  `preview.png` with the honesty chips visible.
- Theme the neon from `Color.accent` only (already mostly true) and avoid
  a second hardcoded cyan if one appears later.
- `IpcHandler` / summon payload docs for `demo: true`.
- Do not follow a `~/.hermes/state.db` symlink outside `$HOME` (plugins
  are unsandboxed; same class of note Neural Pulse made).
- Restart catalog probes when the overlay opens, not only on
  `Component.onCompleted`.

---

## 5. Quick wins

1. **HUD face must name its mode.** Top chips: `LIVE` / `DEMO` / `EMPTY` /
   `ERR` / `STALE` per sector (apps, themes, agents). Screenshot-proof.
2. **Every demo disc says DEMO.** Derive the chip from `source === "demo"`
   or `presence === "demo"`, and show it without requiring selection.
3. **Live apps/themes say LIVE.** Agents say INSTALLED (plugin id present)
   or DETECTED (home/binary only). Never LIVE / BUSY / ONLINE / RUNNING on
   an agent.
4. **Stop silent merge.** `mergeCatalog` must not replace an EMPTY probed
   sector with demo. ERR/unprobed/forceDemo may fill demo, but only while
   labeled.
5. **Theme `onExited`.** Non-zero exit + empty parse → ERR, not demo-as-
   success. Keep last live themes as STALE if a later probe fails.
6. **App collector errors → ERR.** Both sources throwing is not “no apps.”
7. **Enter stays open on demo/noop** and names the reason. Dismiss only
   after a real argv is handed to `execDetached`. Surface exec failure.
8. **Footer matches keys.** `ESC clear filter` vs `ESC close`; `ENTER demo
   — cannot launch` vs `ENTER launch`.
9. **`detectAgents` presence follows source.** Plugin → INSTALLED;
   home/bin → DETECTED.
10. **Tests** for empty vs error vs demo vs live, agent DETECTED, never-
    invented live status, launchSpec demo, footer/launch hints, no
    symlinks, no `pgrep`.
11. **README honesty notes** that match the HUD, and point at this file
    plus Neural Pulse / Ghost Trace.

---

## 6. Suggested next ship (this PR)

**Title:** `Honest orbit — OPPOSITION + trust fixes`.

**Do not** restyle the starship. Change the trust contract:

1. Sector mode is a five-way enum, not a boolean `*Live`.
2. Demo fill is opt-in for ERR / unprobed / `{"demo":true}`, never for a
   successful empty catalog.
3. Chips on the face and on the discs.
4. Launch and Escape chrome tell the truth; demo Enter does not dismiss.
5. Agents cannot be labeled live.
6. Tests + README so a reviewer can fail the PR by screenshot.

That single PR makes a screenshot of the HUD *disprovable*. Visual polish
can follow.

---

## 7. What already holds

- **Quattro overlay shape is correct:** `schemaVersion: 1`, id
  `smf.orbit-dock` (not `omarchy.*`), `kinds: ["overlay"]`,
  `entryPoints.overlay: "Overlay.qml"`, `open` / `close` / `keepLoaded`,
  `qs.Ui` / `qs.Commons`, no `omarchy.*` id, no symlinks.
- **Launch helpers are the ones Omarchy already trusts** when the entry is
  live: `uwsm-app -- gtk-launch`, `omarchy-theme-set`, `uwsm-app -- hermes`,
  `omarchy-shell shell summon`.
- **Demo agents already carry `presence: "demo"`** and `launchSpec` refuses
  them. The failure is the unlabeled apps/themes and the silent dismiss.
- **`neverLiveStatus` exists** and tests already forbid a LIVE agent label.
  Overlay just does not use the helper, and `detectAgents` over-states
  INSTALLED.
- **No `pgrep`.** Tests lock that in. Do not add one.
- **README install warns unsandboxed.** Keep it.
- **MIT** `LICENSE` and manifest metadata are in place.

None of that makes the HUD screenshot-safe. It means the honesty PR can
stay small: labeled sectors, honest empty vs error, honest keys, tests.
