#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "..", "OrbitLogic.js"), "utf8")
  .replace(/^\.pragma library\s*/, "");
const Orbit = { Math, Date, Number, String, Array, Object, JSON, isFinite, console };
vm.createContext(Orbit);
vm.runInContext(src, Orbit);

function argv(entry) {
  return Orbit.launchSpec(entry).argv.join(" ");
}

function probedEmpty() {
  return {
    appsError: "",
    themesError: "",
    agentsError: "",
    appsProbed: true,
    themesProbed: true,
    agentsProbed: true,
    forceDemo: false
  };
}

assert.ok(Orbit.demoApps().length >= 8, "demo apps fill an orbit");
assert.ok(Orbit.demoThemes().length >= 6, "demo themes fill a ring");
assert.strictEqual(Orbit.demoAgents().length, 3);
Orbit.demoApps().forEach(function(app) {
  assert.strictEqual(app.source, "demo");
  assert.strictEqual(app.presence, "demo");
  assert.strictEqual(Orbit.presenceLabel(app), "DEMO");
  assert.strictEqual(Orbit.launchSpec(app).kind, "demo");
  assert.strictEqual(Orbit.launchSpec(app).argv.length, 0);
  assert.strictEqual(Orbit.shouldDismissOnLaunch(Orbit.launchSpec(app)), false);
});
Orbit.demoThemes().forEach(function(theme) {
  assert.strictEqual(theme.source, "demo");
  assert.strictEqual(theme.presence, "demo");
  assert.strictEqual(Orbit.presenceLabel(theme), "DEMO");
  assert.strictEqual(Orbit.launchSpec(theme).kind, "demo");
});
Orbit.demoAgents().forEach(function(agent) {
  assert.strictEqual(agent.presence, "demo");
  assert.strictEqual(Orbit.presenceLabel(agent), "DEMO");
  assert.ok(Orbit.neverLiveStatus(agent));
  assert.ok(Orbit.neverInventedAgentStatus(agent));
  assert.strictEqual(Orbit.launchSpec(agent).kind, "demo");
});

const themes = Orbit.parseThemeList("Tokyo Night\nCatppuccin\n\nTokyo Night\n");
assert.strictEqual(themes.length, 2);
assert.strictEqual(themes[0].slug, "tokyo-night");
assert.strictEqual(themes[0].source, "omarchy");
assert.strictEqual(themes[0].presence, "live");
assert.strictEqual(Orbit.presenceLabel(themes[0]), "LIVE");
assert.strictEqual(argv(themes[0]), "omarchy-theme-set tokyo-night");
assert.ok(Orbit.shouldDismissOnLaunch(Orbit.launchSpec(themes[0])));

const apps = Orbit.collectDesktopApps([
  { id: "Alacritty.desktop", name: "Alacritty", icon: "Alacritty" },
  { id: "Alacritty", name: "Alacritty" },
  { id: "", name: "skip" }
]);
assert.strictEqual(apps.length, 1);
assert.strictEqual(apps[0].desktopId, "Alacritty");
assert.strictEqual(apps[0].presence, "live");
assert.strictEqual(Orbit.presenceLabel(apps[0]), "LIVE");
assert.strictEqual(argv(apps[0]), "uwsm-app -- gtk-launch Alacritty.desktop");

const none = Orbit.detectAgents([], {});
assert.strictEqual(none.length, 0, "missing agents stay missing");

const detected = Orbit.detectAgents(
  ["smf.hermes", "smf.neural-pulse", "smf.cron-constellation"],
  { hermesHome: true, hermesBin: true }
);
assert.strictEqual(detected.length, 3);
detected.forEach(function(agent) {
  assert.strictEqual(agent.presence, "installed");
  assert.strictEqual(Orbit.presenceLabel(agent), "INSTALLED");
  assert.notStrictEqual(Orbit.presenceLabel(agent), "LIVE");
  assert.ok(Orbit.neverLiveStatus(agent));
  assert.ok(Orbit.neverInventedAgentStatus(agent));
});
assert.strictEqual(argv(detected[0]), "uwsm-app -- hermes");
assert.strictEqual(argv(detected[1]), "omarchy-shell shell summon smf.neural-pulse {}");

const hermesOnly = Orbit.detectAgents([], { hermesHome: true });
assert.strictEqual(hermesOnly.length, 1);
assert.strictEqual(hermesOnly[0].source, "detected");
assert.strictEqual(hermesOnly[0].presence, "detected");
assert.strictEqual(Orbit.presenceLabel(hermesOnly[0]), "DETECTED");
assert.ok(Orbit.neverInventedAgentStatus(hermesOnly[0]));

const hermesBinOnly = Orbit.detectAgents([], { hermesBin: true });
assert.strictEqual(hermesBinOnly[0].presence, "detected");
assert.strictEqual(Orbit.presenceLabel(hermesBinOnly[0]), "DETECTED");

const invented = {
  sector: "agents",
  presence: "live",
  source: "detected",
  name: "Hermes"
};
assert.strictEqual(Orbit.neverInventedAgentStatus(invented), false);
assert.strictEqual(Orbit.neverLiveStatus(invented), false);
["busy", "online", "running"].forEach(function(status) {
  assert.strictEqual(Orbit.neverInventedAgentStatus({
    sector: "agents",
    presence: status
  }), false, status + " is invented live status");
});

const unprobed = Orbit.mergeCatalog([], [], []);
assert.ok(unprobed.some(function(it) { return it.sector === "apps"; }));
assert.ok(unprobed.some(function(it) { return it.sector === "themes"; }));
assert.ok(unprobed.some(function(it) { return it.sector === "agents"; }));
assert.ok(unprobed.every(function(it) {
  return it.source === "demo" && Orbit.presenceLabel(it) === "DEMO";
}), "unprobed catalog is labeled DEMO");

const emptyCatalog = Orbit.mergeCatalog([], [], [], probedEmpty());
assert.strictEqual(emptyCatalog.length, 0, "probed empty catalog stays empty");
assert.strictEqual(Orbit.sectorMode([], "", true, false), "empty");
assert.strictEqual(Orbit.sectorLabel("empty"), "EMPTY");

const errFlags = Object.assign(probedEmpty(), {
  appsError: "desktop catalog failed",
  themesError: "theme discovery failed"
});
const errCatalog = Orbit.mergeCatalog([], [], [], errFlags);
assert.ok(errCatalog.some(function(it) { return it.sector === "apps" && it.source === "demo"; }));
assert.ok(errCatalog.some(function(it) { return it.sector === "themes" && it.source === "demo"; }));
assert.strictEqual(Orbit.sectorMode([], "desktop catalog failed", true, false), "err");
assert.strictEqual(Orbit.sectorLabel("err"), "ERR");
assert.ok(Orbit.catalogHint("err", "err", "empty").indexOf("ERR apps") !== -1);
assert.ok(Orbit.catalogHint("err", "err", "empty").indexOf("EMPTY agents") !== -1);

const liveFlags = probedEmpty();
const liveCatalog = Orbit.mergeCatalog(apps, themes, detected, liveFlags);
assert.ok(liveCatalog.some(function(it) { return it.desktopId === "Alacritty"; }));
assert.ok(liveCatalog.every(function(it) { return it.source !== "demo"; }));
assert.strictEqual(Orbit.sectorMode(apps, "", true, false), "live");
assert.strictEqual(Orbit.sectorLabel("live"), "LIVE");
assert.ok(Orbit.catalogHint("live", "live", "live").indexOf("LIVE apps") !== -1);

const staleThemes = Orbit.sectorMode(themes, "theme discovery failed", true, false);
assert.strictEqual(staleThemes, "stale");
assert.strictEqual(Orbit.sectorLabel("stale"), "STALE");
const staleCatalog = Orbit.mergeCatalog(apps, themes, detected, Object.assign(probedEmpty(), {
  themesError: "theme discovery failed"
}));
assert.ok(staleCatalog.some(function(it) {
  return it.slug === "tokyo-night" && it.source === "omarchy";
}), "STALE keeps the last live themes");

const forced = Orbit.mergeCatalog(apps, themes, detected, Object.assign(probedEmpty(), {
  forceDemo: true
}));
assert.ok(forced.every(function(it) { return it.source === "demo"; }));
assert.strictEqual(Orbit.sectorMode(apps, "", true, true), "demo");

const appOk = Orbit.appDiscovery(
  [{ id: "foo.desktop", name: "Foo" }],
  [],
  false,
  false
);
assert.strictEqual(appOk.live, true);
assert.strictEqual(appOk.error, "");
assert.strictEqual(appOk.items[0].desktopId, "foo");

const appEmpty = Orbit.appDiscovery([], [], false, false);
assert.strictEqual(appEmpty.live, false);
assert.strictEqual(appEmpty.error, "");
assert.strictEqual(appEmpty.probed, true);

const appErr = Orbit.appDiscovery([], [], true, true);
assert.strictEqual(appErr.error, "desktop catalog failed");
assert.strictEqual(appErr.items.length, 0);
assert.strictEqual(Orbit.sectorMode(appErr.items, appErr.error, true, false), "err");

const themeOk = Orbit.themeDiscovery("Nord\n", 0);
assert.strictEqual(themeOk.live, true);
assert.strictEqual(themeOk.error, "");
assert.strictEqual(themeOk.items[0].slug, "nord");

const themeEmpty = Orbit.themeDiscovery("", 0);
assert.strictEqual(themeEmpty.live, false);
assert.strictEqual(themeEmpty.error, "");
assert.strictEqual(Orbit.sectorMode(themeEmpty.items, themeEmpty.error, true, false), "empty");

const themeErr = Orbit.themeDiscovery("", 1);
assert.strictEqual(themeErr.error, "theme discovery failed");
assert.strictEqual(Orbit.sectorMode(themeErr.items, themeErr.error, true, false), "err");

const themePartialFail = Orbit.themeDiscovery("Osaka Jade\n", 1);
assert.strictEqual(themePartialFail.live, true);
assert.strictEqual(themePartialFail.error, "", "names beat a non-zero exit");

const quoted = Orbit.themeListCommand("/tmp/oma'rchy");
assert.strictEqual(quoted[0], "bash");
assert.ok(quoted[2].indexOf("'/tmp/oma'\\''rchy'/themes") !== -1);
assert.ok(quoted[2].indexOf("\"/tmp/oma") === -1, "omarchy path is not raw-interpolated");

const payload = Orbit.parsePayload('{"filter":"term","sector":"themes","demo":true}');
assert.strictEqual(payload.filter, "term");
assert.strictEqual(payload.sector, "themes");
assert.strictEqual(payload.forceDemo, true);
assert.strictEqual(Orbit.parsePayload("not-json").forceDemo, false);
assert.strictEqual(Orbit.parsePayload('{"sector":"nope"}').sector, "");

const filtered = Orbit.filterItems(unprobed, "tokyo");
assert.ok(filtered.length >= 1);
assert.ok(filtered.every(function(it) {
  return (it.name + it.slug).toLowerCase().indexOf("tokyo") !== -1;
}));
assert.strictEqual(Orbit.filterItems(unprobed, "").length, unprobed.length);
assert.ok(Orbit.filterItems(unprobed, "DEMO").length >= 1);

assert.strictEqual(Orbit.nextSector("apps", 1), "themes");
assert.strictEqual(Orbit.nextSector("agents", 1), "apps");
assert.strictEqual(Orbit.wrapIndex(0, 8, -1), 7);
assert.strictEqual(Orbit.wrapIndex(7, 8, 1), 0);

const idle = Orbit.layoutTiles(unprobed, "", 0);
assert.ok(idle.length > 8);
assert.ok(idle.every(function(row) {
  return typeof row.nx === "number" && typeof row.ny === "number";
}));
const search = Orbit.layoutTiles(unprobed, "demo", 0.4);
assert.ok(search.length >= 1);
assert.ok(search.every(function(row) { return row.ring === "search"; }));

const themeGlyphs = Orbit.demoThemes().map(function(it) { return it.glyph; });
assert.strictEqual(new Set(themeGlyphs).size, themeGlyphs.length, "demo themes use distinct glyphs");

const appsOnly = Orbit.orbitRows(apps, "");
assert.strictEqual(Orbit.firstIndexForSector(appsOnly, "themes"), -1);
assert.strictEqual(Orbit.firstIndexForSector(appsOnly, "apps"), 0);
assert.strictEqual(Orbit.nextOccupiedSector(appsOnly, "apps", 1), "apps");

assert.strictEqual(Orbit.launchHint(Orbit.demoApps()[0]), "DEMO — cannot launch");
assert.strictEqual(Orbit.launchHint(apps[0]).indexOf("launch") !== -1, true);
assert.ok(Orbit.footerHint("term", Orbit.demoApps()[0]).indexOf("ESC clear filter") !== -1);
assert.ok(Orbit.footerHint("term", Orbit.demoApps()[0]).indexOf("ENTER demo — cannot launch") !== -1);
assert.ok(Orbit.footerHint("", apps[0]).indexOf("ESC close") !== -1);
assert.ok(Orbit.footerHint("", apps[0]).indexOf("ENTER launch") !== -1);
assert.ok(Orbit.footerHint("", null).indexOf("nothing selected") !== -1);

const selectedLine = Orbit.statusLine(
  { apps: "live", themes: "empty", agents: "demo" },
  apps[0],
  ""
);
assert.ok(selectedLine.indexOf("LIVE") !== -1);
assert.ok(Orbit.statusLine({}, null, "DEMO — cannot launch").indexOf("cannot launch") !== -1);
assert.ok(Orbit.catalogHint(true, false, "err").indexOf("LIVE apps") !== -1);
assert.ok(Orbit.catalogHint(true, false, "err").indexOf("DEMO themes") !== -1);
assert.ok(Orbit.catalogHint(true, false, "err").indexOf("ERR agents") !== -1);

assert.ok(!src.includes("pgrep"));
assert.ok(!src.includes("recently_active"));

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));
assert.strictEqual(manifest.id, "smf.orbit-dock");
assert.ok(!String(manifest.id).startsWith("omarchy."));
assert.deepStrictEqual(manifest.kinds, ["overlay"]);
assert.strictEqual(manifest.entryPoints.overlay, "Overlay.qml");
assert.strictEqual(manifest.keepLoaded, true);

const root = path.join(__dirname, "..");
[
  "Overlay.qml",
  "OrbitTile.qml",
  "OrbitLogic.js",
  "manifest.json",
  "README.md",
  "docs/OPPOSITION.md"
].forEach(function(rel) {
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), rel + " exists");
  assert.ok(!fs.lstatSync(full).isSymbolicLink(), rel + " is not a symlink");
});

const overlay = fs.readFileSync(path.join(root, "Overlay.qml"), "utf8");
assert.ok(overlay.indexOf("Orbit.footerHint") !== -1);
assert.ok(overlay.indexOf("shouldDismissOnLaunch") !== -1);
assert.ok(overlay.indexOf("themeDiscovery") !== -1);
assert.ok(overlay.indexOf("desktop catalog failed") !== -1);
assert.ok(!overlay.includes("pgrep"));

const tile = fs.readFileSync(path.join(root, "OrbitTile.qml"), "utf8");
assert.ok(tile.indexOf("tile.presence.length > 0") !== -1);
assert.ok(tile.indexOf("&& tile.selected") === -1, "DEMO/LIVE chips stay visible when unselected");

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
assert.ok(readme.includes("omarchy plugin add https://github.com/smfworks/omarchy-orbit-dock.git --enable"));
assert.ok(readme.includes("omarchy-shell shell summon smf.orbit-dock '{}'"));
assert.ok(readme.includes("unsandboxed"));
assert.ok(readme.includes("DEMO"));
assert.ok(readme.includes("LIVE"));
assert.ok(readme.includes("EMPTY"));
assert.ok(readme.includes("ERR"));
assert.ok(readme.includes("never invents agent live status") || readme.includes("never invents"));
assert.ok(readme.includes("Neural Pulse"));
assert.ok(readme.includes("Ghost Trace"));
assert.ok(readme.includes("docs/OPPOSITION.md"));
assert.ok(readme.includes("Escape") || readme.includes("ESC"));

const opposition = fs.readFileSync(path.join(root, "docs/OPPOSITION.md"), "utf8");
assert.ok(opposition.includes("P0"));
assert.ok(opposition.includes("P1"));
assert.ok(opposition.includes("P2"));
assert.ok(opposition.includes("Quick wins"));
assert.ok(opposition.includes("omarchy-neural-pulse"));
assert.ok(opposition.includes("omarchy-ghost-trace"));

console.log("ok - OrbitLogic helpers");
