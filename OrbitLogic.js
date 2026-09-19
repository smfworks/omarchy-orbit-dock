.pragma library

var SECTORS = ["apps", "themes", "agents"]
var RING_CAPS = { apps: 16, themes: 10, agents: 6 }
var MAX_SEARCH_RESULTS = 24

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
  ]
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
  if (copy.sector === "agents" && !copy.presence) copy.presence = "demo"
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
    var hermes = agentItem("hermes", "Hermes", "launch-hermes", "󰚩", "installed")
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

function mergeCatalog(apps, themes, agents) {
  var liveApps = (apps && apps.length) ? apps : demoApps()
  var liveThemes = (themes && themes.length) ? themes : demoThemes()
  var liveAgents = (agents && agents.length) ? agents : demoAgents()
  return liveApps.concat(liveThemes, liveAgents)
}

function filterItems(items, query) {
  var list = items || []
  var q = String(query || "").trim().toLowerCase()
  if (!q) return list.slice()
  var out = []
  for (var i = 0; i < list.length; i++) {
    var it = list[i]
    var hay = [it.name, it.sector, it.id, it.desktopId, it.slug, it.pluginId, it.presence]
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
  return 0
}

function presenceLabel(entry) {
  var value = String((entry && entry.presence) || "")
  if (value === "demo") return "DEMO"
  if (value === "installed") return "INSTALLED"
  if (value === "detected") return "DETECTED"
  return ""
}

function neverLiveStatus(entry) {
  var label = presenceLabel(entry).toLowerCase()
  return label !== "live" && label !== "busy" && label !== "online" && label !== "running"
}

function launchSpec(entry) {
  if (!entry) return { kind: "noop", argv: [] }
  if (entry.action === "launch-app") {
    var desktopId = String(entry.desktopId || "")
    if (!desktopId) return { kind: "demo", argv: [] }
    return {
      kind: "app",
      argv: ["uwsm-app", "--", "gtk-launch", desktopId + ".desktop"]
    }
  }
  if (entry.action === "set-theme") {
    var slug = String(entry.slug || slugify(entry.name))
    if (!slug || entry.source === "demo") return { kind: "demo", argv: [] }
    return { kind: "theme", argv: ["omarchy-theme-set", slug] }
  }
  if (entry.action === "launch-hermes") {
    if (entry.presence === "demo") return { kind: "demo", argv: [] }
    return { kind: "hermes", argv: ["uwsm-app", "--", "hermes"] }
  }
  if (entry.action === "summon-plugin") {
    var pluginId = String(entry.pluginId || "")
    if (!pluginId || entry.presence === "demo") return { kind: "demo", argv: [] }
    return { kind: "summon", argv: ["omarchy-shell", "shell", "summon", pluginId, "{}"] }
  }
  return { kind: "noop", argv: [] }
}

function catalogHint(appsLive, themesLive, agentsLive) {
  var parts = []
  parts.push(appsLive ? "apps" : "demo apps")
  parts.push(themesLive ? "themes" : "demo themes")
  parts.push(agentsLive ? "agents" : "demo agents")
  return parts.join(" · ")
}
