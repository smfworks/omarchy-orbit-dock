.pragma library

var SECTORS = ["apps", "themes", "agents"]
var RING_CAPS = { apps: 16, themes: 10, agents: 6 }
var MAX_SEARCH_RESULTS = 24
var FORBIDDEN_AGENT_STATUS = ["live", "busy", "online", "running"]

function demoApps() {
  return [
    item("app:terminal", "Terminal", "apps", "launch-app", "󰆍", "utilities-terminal"),
    item("app:browser", "Browser", "apps", "launch-app", "󰖟", "web-browser"),
    item("app:files", "Files", "apps", "launch-app", "󰉋", "system-file-manager"),
    item("app:editor", "Editor", "apps", "launch-app", "󰷈", "text-editor"),
    item("app:code", "Code", "apps", "launch-app", "󰨞", "visual-studio-code"),
    item("app:notes", "Notes", "apps", "launch-app", "󰠮", "accessories-text-editor"),
    item("app:chat", "Chat", "apps", "launch-app", "󰭹", "internet-chat"),
    item("app:music", "Music", "apps", "launch-app", "󰝚", "multimedia-audio-player"),
    item("app:mail", "Mail", "apps", "launch-app", "󰇮", "internet-mail"),
    item("app:settings", "Settings", "apps", "launch-app", "󰒓", "preferences-system"),
    item("app:camera", "Camera", "apps", "launch-app", "󰄀", "camera-photo"),
    item("app:map", "Maps", "apps", "launch-app", "󰍍", "maps")
  ].map(markDemo)
}

function demoThemes() {
  return [
    themeItem("osaka-jade", "Osaka Jade", "󰌪"),
    themeItem("tokyo-night", "Tokyo Night", "󰖔"),
    themeItem("catppuccin", "Catppuccin", "󰄛"),
    themeItem("nord", "Nord", "󰼶"),
    themeItem("gruvbox", "Gruvbox", "󰔶"),
    themeItem("everforest", "Everforest", "󰌁"),
    themeItem("kanagawa", "Kanagawa", "󰓆"),
    themeItem("ristretto", "Ristretto", "󰅶")
  ].map(markDemo)
}

function demoAgents() {
  return [
    agentItem("hermes", "Hermes", "launch-hermes", "󰚩", "demo"),
    agentItem("neural-pulse", "Neural Pulse", "summon-plugin", "󰑩", "demo"),
    agentItem("cron-constellation", "Cron Constellation", "summon-plugin", "󰓎", "demo")
  ].map(markDemo)
}

function item(id, name, sector, action, glyph, icon) {
  return {
    id: String(id || ""),
    name: String(name || id || ""),
    sector: String(sector || "apps"),
    action: String(action || "noop"),
    glyph: String(glyph || "󰣆"),
    icon: String(icon || ""),
    desktopId: "",
    slug: "",
    pluginId: "",
    presence: "",
    source: "catalog"
  }
}

function themeItem(slug, name, glyph) {
  var it = item("theme:" + slug, name, "themes", "set-theme", glyph || "󰃟", "")
  it.slug = String(slug || "")
  return it
}

function agentItem(id, name, action, glyph, presence) {
  var it = item("agent:" + id, name, "agents", action, glyph, "")
  if (id === "neural-pulse") it.pluginId = "smf.neural-pulse"
  if (id === "cron-constellation") it.pluginId = "smf.cron-constellation"
  if (id === "hermes") it.pluginId = "smf.hermes"
  it.presence = String(presence || "")
  return it
}

function markDemo(entry) {
  var copy = cloneItem(entry)
  copy.source = "demo"
  if (!copy.presence) copy.presence = "demo"
  return copy
}

function cloneItem(entry) {
  return {
    id: String(entry.id || ""),
    name: String(entry.name || ""),
    sector: String(entry.sector || "apps"),
    action: String(entry.action || "noop"),
    glyph: String(entry.glyph || "󰣆"),
    icon: String(entry.icon || ""),
    desktopId: String(entry.desktopId || ""),
    slug: String(entry.slug || ""),
    pluginId: String(entry.pluginId || ""),
    presence: String(entry.presence || ""),
    source: String(entry.source || "catalog")
  }
}

function emptyFlags() {
  return {
    appsError: "",
    themesError: "",
    agentsError: "",
    appsProbed: false,
    themesProbed: false,
    agentsProbed: false,
    forceDemo: false
  }
}

function parsePayload(raw) {
  var payload = {}
  try {
    payload = JSON.parse(raw || "{}") || {}
  } catch (e) {
    payload = {}
  }
  var sector = String(payload.sector || "")
  return {
    filter: payload.filter !== undefined ? String(payload.filter) : "",
    sector: SECTORS.indexOf(sector) !== -1 ? sector : "",
    forceDemo: payload.demo === true || payload.forceDemo === true
  }
}

function shellSingleQuote(value) {
  return "'" + String(value || "").replace(/'/g, "'\\''") + "'"
}

function themeListCommand(omarchyPath) {
  var root = shellSingleQuote(omarchyPath || "/usr/share/omarchy")
  return [
    "bash",
    "-c",
    "if command -v omarchy-theme-list >/dev/null; then omarchy-theme-list; "
      + "else find \"$HOME/.config/omarchy/themes\" " + root + "/themes "
      + "-mindepth 1 -maxdepth 1 \\( -type d -o -type l \\) -printf '%f\\n' 2>/dev/null "
      + "| sort -u | sed -E 's/(^|-)([a-z])/\\1\\u\\2/g; s/-/ /g'; fi"
  ]
}

function parseThemeList(raw) {
  var lines = String(raw || "").split(/\n/)
  var out = []
  var seen = {}
  for (var i = 0; i < lines.length; i++) {
    var display = String(lines[i] || "").trim()
    if (!display) continue
    var slug = slugify(display)
    if (!slug || seen[slug]) continue
    seen[slug] = true
    var it = themeItem(slug, display)
    it.source = "omarchy"
    it.presence = "live"
    out.push(it)
  }
  return out
}

function slugify(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function desktopAppFromEntry(entry) {
  if (!entry) return null
  var id = String(entry.id || "").trim()
  if (!id) return null
  if (id.slice(-8) === ".desktop") id = id.slice(0, -8)
  var name = String(entry.name || entry.id || id)
  var it = item("app:" + id, name, "apps", "launch-app", "󰣆", String(entry.icon || ""))
  it.desktopId = id
  it.source = "desktop"
  it.presence = "live"
  return it
}

function collectDesktopApps(values) {
  var list = values || []
  var out = []
  var seen = {}
  var n = list.length !== undefined ? list.length : 0
  for (var i = 0; i < n; i++) {
    var it = desktopAppFromEntry(list[i])
    if (!it || seen[it.desktopId]) continue
    seen[it.desktopId] = true
    out.push(it)
  }
  return out
}

function appDiscovery(primaryValues, fallbackValues, primaryFailed, fallbackFailed) {
  var apps = []
  if (primaryFailed !== true)
    apps = collectDesktopApps(primaryValues)
  if (apps.length === 0 && fallbackFailed !== true)
    apps = collectDesktopApps(fallbackValues)
  var bothFailed = primaryFailed === true && fallbackFailed === true
  return {
    items: apps,
    error: bothFailed ? "desktop catalog failed" : "",
    probed: true,
    live: apps.length > 0
  }
}

function themeDiscovery(raw, exitCode) {
  var themes = parseThemeList(raw)
  var code = exitCode === undefined || exitCode === null ? 0 : (exitCode | 0)
  if (code !== 0 && themes.length === 0) {
    return {
      items: [],
      error: "theme discovery failed",
      probed: true,
      live: false
    }
  }
  return {
    items: themes,
    error: "",
    probed: true,
    live: themes.length > 0
  }
}

function hasId(ids, id) {
  var list = ids || []
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]) === id) return true
  }
  return false
}

function detectAgents(pluginIds, flags) {
  flags = flags || {}
  var out = []
  var hermesPlugin = hasId(pluginIds, "smf.hermes")
  var hermesHome = flags.hermesHome === true
  var hermesBin = flags.hermesBin === true
  if (hermesPlugin || hermesHome || hermesBin) {
    var hermesPresence = hermesPlugin ? "installed" : "detected"
    var hermes = agentItem("hermes", "Hermes", "launch-hermes", "󰚩", hermesPresence)
    hermes.source = hermesPlugin ? "plugin" : "detected"
    out.push(hermes)
  }
  if (hasId(pluginIds, "smf.neural-pulse")) {
    var pulse = agentItem("neural-pulse", "Neural Pulse", "summon-plugin", "󰑩", "installed")
    pulse.source = "plugin"
    out.push(pulse)
  }
  if (hasId(pluginIds, "smf.cron-constellation")) {
    var cron = agentItem("cron-constellation", "Cron Constellation", "summon-plugin", "󰓎", "installed")
    cron.source = "plugin"
    out.push(cron)
  }
  return out
}

function sectorMode(items, error, probed, forceDemo) {
  if (forceDemo === true) return "demo"
  if (error) return (items && items.length) ? "stale" : "err"
  if (items && items.length) return "live"
  if (probed === true) return "empty"
  return "demo"
}

function sectorLabel(mode) {
  if (mode === "err") return "ERR"
  if (mode === "stale") return "STALE"
  if (mode === "empty") return "EMPTY"
  if (mode === "demo") return "DEMO"
  if (mode === "live") return "LIVE"
  return String(mode || "").toUpperCase()
}

function demoFill(sector) {
  if (sector === "themes") return demoThemes()
  if (sector === "agents") return demoAgents()
  return demoApps()
}

function resolveSector(items, sector, flags) {
  flags = flags || {}
  var live = (items && items.length) ? items.slice() : []
  var mode = sectorMode(
    live,
    flags[sector + "Error"],
    flags[sector + "Probed"],
    flags.forceDemo
  )
  if (mode === "live" || mode === "stale") return live
  if (mode === "empty") return []
  return demoFill(sector)
}

function mergeCatalog(apps, themes, agents, flags) {
  flags = flags || emptyFlags()
  return resolveSector(apps, "apps", flags)
    .concat(resolveSector(themes, "themes", flags), resolveSector(agents, "agents", flags))
}

function catalogModes(apps, themes, agents, flags) {
  flags = flags || emptyFlags()
  return {
    apps: sectorMode(apps, flags.appsError, flags.appsProbed, flags.forceDemo),
    themes: sectorMode(themes, flags.themesError, flags.themesProbed, flags.forceDemo),
    agents: sectorMode(agents, flags.agentsError, flags.agentsProbed, flags.forceDemo)
  }
}

function sectorPhrase(mode, name) {
  if (mode === true) return "LIVE " + name
  if (mode === false) return "DEMO " + name
  var label = sectorLabel(mode)
  if (!label) return name
  return label + " " + name
}

function catalogHint(appsMode, themesMode, agentsMode) {
  return [
    sectorPhrase(appsMode, "apps"),
    sectorPhrase(themesMode, "themes"),
    sectorPhrase(agentsMode, "agents")
  ].join(" · ")
}

function statusLine(modes, selected, actionHint) {
  modes = modes || {}
  if (actionHint) return String(actionHint)
  var hint = catalogHint(modes.apps, modes.themes, modes.agents)
  if (!selected) return hint
  var chip = presenceLabel(selected)
  var sector = String(selected.sector || "").toUpperCase()
  var name = String(selected.name || selected.id || "")
  if (chip) return sector + "  ·  " + name + "  ·  " + chip
  return sector + "  ·  " + name
}

function filterItems(items, query) {
  var list = items || []
  var q = String(query || "").trim().toLowerCase()
  if (!q) return list.slice()
  var out = []
  for (var i = 0; i < list.length; i++) {
    var it = list[i]
    var hay = [it.name, it.sector, it.id, it.desktopId, it.slug, it.pluginId, it.presence, it.source, presenceLabel(it)]
      .join(" ")
      .toLowerCase()
    if (hay.indexOf(q) !== -1) out.push(it)
  }
  return out
}

function itemsForSector(items, sector) {
  var list = items || []
  var out = []
  for (var i = 0; i < list.length; i++) {
    if (list[i].sector === sector) out.push(list[i])
  }
  return out
}

function capItems(items, n) {
  var list = items || []
  var limit = Math.max(0, n | 0)
  if (list.length <= limit) return list.slice()
  return list.slice(0, limit)
}

function nextSector(sector, delta) {
  var i = SECTORS.indexOf(String(sector || "apps"))
  if (i < 0) i = 0
  var count = SECTORS.length
  return SECTORS[(i + delta % count + count) % count]
}

function wrapIndex(index, count, delta) {
  var n = count | 0
  if (n <= 0) return 0
  var i = index | 0
  var d = delta | 0
  return ((i + d) % n + n) % n
}

function tileAngle(index, count, phase) {
  var n = count | 0
  if (n <= 0) return (phase || 0) - Math.PI / 2
  return (index / n) * Math.PI * 2 - Math.PI / 2 + (phase || 0)
}

function polarX(radius, angle) {
  return Math.cos(angle) * radius
}

function polarY(radius, angle) {
  return Math.sin(angle) * radius
}

function ringRadius(sector) {
  if (sector === "agents") return 0.28
  if (sector === "themes") return 0.40
  return 0.52
}

function ringPhase(sector, phase) {
  var p = phase || 0
  if (sector === "themes") return -p * 0.7
  if (sector === "agents") return p * 0.45
  return p
}

function orbitRows(items, query) {
  var filtered = filterItems(items, query)
  var searching = String(query || "").trim().length > 0
  var rows = []
  if (searching) {
    var matches = capItems(filtered, MAX_SEARCH_RESULTS)
    for (var i = 0; i < matches.length; i++) {
      rows.push(layoutRow(matches[i], i, matches.length, 0.42, "search"))
    }
    return rows
  }
  for (var s = 0; s < SECTORS.length; s++) {
    var sector = SECTORS[s]
    var group = capItems(itemsForSector(filtered, sector), RING_CAPS[sector] || 12)
    var radius = ringRadius(sector)
    for (var j = 0; j < group.length; j++) {
      rows.push(layoutRow(group[j], j, group.length, radius, sector))
    }
  }
  return rows
}

function layoutTiles(items, query, phase) {
  var rows = orbitRows(items, query)
  var out = []
  for (var i = 0; i < rows.length; i++) out.push(positionRow(rows[i], phase || 0))
  return out
}

function layoutRow(entry, index, count, radius, ring) {
  return {
    id: entry.id,
    name: entry.name,
    sector: entry.sector,
    action: entry.action,
    glyph: entry.glyph,
    icon: entry.icon,
    desktopId: entry.desktopId,
    slug: entry.slug,
    pluginId: entry.pluginId,
    presence: entry.presence,
    source: entry.source,
    ring: String(ring || entry.sector),
    index: index,
    count: count,
    radius: radius
  }
}

function positionRow(row, phase) {
  var spin = row.ring === "search" ? (phase || 0) * 0.15 : ringPhase(row.ring, phase)
  var angle = tileAngle(row.index, row.count, spin)
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    action: row.action,
    glyph: row.glyph,
    icon: row.icon,
    desktopId: row.desktopId,
    slug: row.slug,
    pluginId: row.pluginId,
    presence: row.presence,
    source: row.source,
    ring: row.ring,
    index: row.index,
    count: row.count,
    radius: row.radius,
    angle: angle,
    nx: polarX(row.radius, angle),
    ny: polarY(row.radius, angle)
  }
}

function indexOfId(rows, id) {
  for (var i = 0; i < (rows || []).length; i++) {
    if (rows[i].id === id) return i
  }
  return -1
}

function firstIndexForSector(rows, sector) {
  for (var i = 0; i < (rows || []).length; i++) {
    if (rows[i].sector === sector) return i
  }
  return -1
}

function nextOccupiedSector(rows, sector, delta) {
  var current = String(sector || "apps")
  var n = SECTORS.length
  for (var i = 0; i < n; i++) {
    current = nextSector(current, delta)
    if (firstIndexForSector(rows, current) >= 0) return current
  }
  return String(sector || "apps")
}

function presenceLabel(entry) {
  var value = String((entry && entry.presence) || "").toLowerCase()
  if (value === "demo") return "DEMO"
  if (value === "installed") return "INSTALLED"
  if (value === "detected") return "DETECTED"
  if (value === "live") return "LIVE"
  var source = String((entry && entry.source) || "")
  if (source === "demo") return "DEMO"
  if (source === "plugin") return "INSTALLED"
  if (source === "detected") return "DETECTED"
  if (source === "desktop" || source === "omarchy") return "LIVE"
  return ""
}

function forbiddenAgentLabel(value) {
  var label = String(value || "").toLowerCase()
  for (var i = 0; i < FORBIDDEN_AGENT_STATUS.length; i++) {
    if (label === FORBIDDEN_AGENT_STATUS[i]) return true
  }
  return false
}

function neverInventedAgentStatus(entry) {
  if (!entry || entry.sector !== "agents") return true
  if (forbiddenAgentLabel(entry.presence)) return false
  if (forbiddenAgentLabel(presenceLabel(entry))) return false
  return true
}

function neverLiveStatus(entry) {
  return neverInventedAgentStatus(entry)
}

function launchSpec(entry) {
  if (!entry) return { kind: "noop", argv: [] }
  if (entry.action === "launch-app") {
    var desktopId = String(entry.desktopId || "")
    if (!desktopId || entry.source === "demo" || entry.presence === "demo")
      return { kind: "demo", argv: [] }
    return {
      kind: "app",
      argv: ["uwsm-app", "--", "gtk-launch", desktopId + ".desktop"]
    }
  }
  if (entry.action === "set-theme") {
    var slug = String(entry.slug || slugify(entry.name))
    if (!slug || entry.source === "demo" || entry.presence === "demo")
      return { kind: "demo", argv: [] }
    return { kind: "theme", argv: ["omarchy-theme-set", slug] }
  }
  if (entry.action === "launch-hermes") {
    if (entry.presence === "demo" || entry.source === "demo")
      return { kind: "demo", argv: [] }
    return { kind: "hermes", argv: ["uwsm-app", "--", "hermes"] }
  }
  if (entry.action === "summon-plugin") {
    var pluginId = String(entry.pluginId || "")
    if (!pluginId || entry.presence === "demo" || entry.source === "demo")
      return { kind: "demo", argv: [] }
    return { kind: "summon", argv: ["omarchy-shell", "shell", "summon", pluginId, "{}"] }
  }
  return { kind: "noop", argv: [] }
}

function launchHint(entry) {
  var spec = launchSpec(entry)
  if (!entry) return "nothing selected"
  if (spec.kind === "demo") return "DEMO — cannot launch"
  if (spec.kind === "noop") return "nothing to launch"
  if (spec.kind === "app") return "launch " + (entry.name || "app")
  if (spec.kind === "theme") return "set theme " + (entry.name || entry.slug || "theme")
  if (spec.kind === "hermes") return "launch Hermes"
  if (spec.kind === "summon") return "summon " + (entry.name || entry.pluginId || "plugin")
  return spec.kind
}

function footerHint(filterText, entry) {
  var esc = String(filterText || "").trim() ? "ESC clear filter" : "ESC close"
  var spec = launchSpec(entry)
  var enter = "ENTER launch"
  if (!entry) enter = "ENTER — nothing selected"
  else if (spec.kind === "demo") enter = "ENTER demo — cannot launch"
  else if (spec.kind === "noop") enter = "ENTER — nothing to launch"
  return esc + "   ·   " + enter + "   ·   ← → orbit   ·   TAB sector"
}

function shouldDismissOnLaunch(spec) {
  if (!spec) return false
  return spec.kind !== "demo" && spec.kind !== "noop"
}
