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

assert.ok(Orbit.demoApps().length >= 8, "demo apps fill an orbit");
assert.ok(Orbit.demoThemes().length >= 6, "demo themes fill a ring");
assert.strictEqual(Orbit.demoAgents().length, 3);
Orbit.demoAgents().forEach(function(agent) {
  assert.strictEqual(agent.presence, "demo");
  assert.strictEqual(Orbit.presenceLabel(agent), "DEMO");
  assert.ok(Orbit.neverLiveStatus(agent));
  assert.strictEqual(Orbit.launchSpec(agent).kind, "demo");
});

const themes = Orbit.parseThemeList("Tokyo Night\nCatppuccin\n\nTokyo Night\n");
assert.strictEqual(themes.length, 2);
assert.strictEqual(themes[0].slug, "tokyo-night");
assert.strictEqual(themes[0].source, "omarchy");
assert.strictEqual(argv(themes[0]), "omarchy-theme-set tokyo-night");

const apps = Orbit.collectDesktopApps([
  { id: "Alacritty.desktop", name: "Alacritty", icon: "Alacritty" },
  { id: "Alacritty", name: "Alacritty" },
  { id: "", name: "skip" }
]);
assert.strictEqual(apps.length, 1);
assert.strictEqual(apps[0].desktopId, "Alacritty");
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
  assert.notStrictEqual(Orbit.presenceLabel(agent), "LIVE");
  assert.ok(Orbit.neverLiveStatus(agent));
});
assert.strictEqual(argv(detected[0]), "uwsm-app -- hermes");
assert.strictEqual(argv(detected[1]), "omarchy-shell shell summon smf.neural-pulse {}");

const hermesOnly = Orbit.detectAgents([], { hermesHome: true });
assert.strictEqual(hermesOnly.length, 1);
assert.strictEqual(hermesOnly[0].source, "detected");

const catalog = Orbit.mergeCatalog([], [], []);
assert.ok(catalog.some(function(it) { return it.sector === "apps"; }));
assert.ok(catalog.some(function(it) { return it.sector === "themes"; }));
assert.ok(catalog.some(function(it) { return it.sector === "agents"; }));

const filtered = Orbit.filterItems(catalog, "tokyo");
assert.ok(filtered.length >= 1);
assert.ok(filtered.every(function(it) {
  return (it.name + it.slug).toLowerCase().indexOf("tokyo") !== -1;
}));
assert.strictEqual(Orbit.filterItems(catalog, "").length, catalog.length);

assert.strictEqual(Orbit.nextSector("apps", 1), "themes");
assert.strictEqual(Orbit.nextSector("agents", 1), "apps");
assert.strictEqual(Orbit.wrapIndex(0, 8, -1), 7);
assert.strictEqual(Orbit.wrapIndex(7, 8, 1), 0);

const idle = Orbit.layoutTiles(catalog, "", 0);
assert.ok(idle.length > 8);
assert.ok(idle.every(function(row) {
  return typeof row.nx === "number" && typeof row.ny === "number";
}));
const search = Orbit.layoutTiles(catalog, "demo", 0.4);
assert.ok(search.length >= 1);
assert.ok(search.every(function(row) { return row.ring === "search"; }));

const demoTheme = Orbit.demoThemes()[0];
assert.strictEqual(Orbit.launchSpec(demoTheme).kind, "demo");

assert.ok(!src.includes("pgrep"));

console.log("ok - OrbitLogic helpers");
