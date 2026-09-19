import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import qs.Commons
import "OrbitLogic.js" as Orbit

Item {
  id: root

  property string omarchyPath: Quickshell.env("OMARCHY_PATH")
  property var shell: null
  property var manifest: null
  property var pluginRegistry: null

  property bool opened: false
  property string filterText: ""
  property int selectedIndex: 0
  property string activeSector: "apps"
  property real orbitPhase: 0
  property var catalog: []
  property bool appsLive: false
  property bool themesLive: false
  property bool agentsLive: false
  property bool hermesHome: false
  property bool hermesBin: false

  property color background: Color.menu.background
  property color foreground: Color.menu.text
  property color accent: Color.accent
  property color scrim: Color.menu.scrim
  property color border: Color.menu.border
  property string fontFamily: Style.font.menuFamily || Style.font.family
  readonly property int tileSize: Style.space(72)
  readonly property string pluginId: (root.manifest && root.manifest.id) || "smf.orbit-dock"

  function open(payloadJson) {
    var payload = ({})
    try { payload = JSON.parse(payloadJson || "{}") || {} } catch (e) { payload = ({}) }
    root.filterText = payload.filter !== undefined ? String(payload.filter) : ""
    if (payload.sector && Orbit.SECTORS.indexOf(String(payload.sector)) !== -1)
      root.activeSector = String(payload.sector)
    root.opened = true
    root.refreshCatalog()
    root.rebuildDisplay()
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  function close() {
    root.opened = false
  }

  function dismiss() {
    root.close()
    if (root.shell && typeof root.shell.hide === "function")
      root.shell.hide(root.pluginId)
  }

  function toggle() {
    if (root.opened) root.dismiss()
    else root.open("{}")
  }

  function installedPluginIds() {
    var ids = []
    try {
      var plugins = root.pluginRegistry && root.pluginRegistry.installedPlugins
      if (!plugins) return ids
      for (var key in plugins) ids.push(String(key))
    } catch (e) {}
    return ids
  }

  function collectApps() {
    var values = []
    try {
      if (root.shell && root.shell.appLibrary && typeof root.shell.appLibrary.sortedEntries === "function")
        values = root.shell.appLibrary.sortedEntries("") || []
    } catch (e1) { values = [] }
    if (!values || values.length === 0) {
      try {
        values = (DesktopEntries.applications && DesktopEntries.applications.values) || []
      } catch (e2) { values = [] }
    }
    var apps = Orbit.collectDesktopApps(values)
    root.appsLive = apps.length > 0
    return apps
  }

  function collectAgents() {
    var agents = Orbit.detectAgents(root.installedPluginIds(), {
      hermesHome: root.hermesHome,
      hermesBin: root.hermesBin
    })
    root.agentsLive = agents.length > 0
    return agents
  }

  function refreshCatalog() {
    var apps = root.collectApps()
    var themes = root.themesLive ? Orbit.itemsForSector(root.catalog, "themes") : []
    if (!root.themesLive) themes = []
    var agents = root.collectAgents()
    root.catalog = Orbit.mergeCatalog(apps, themes, agents)
    if (!themeListProc.running) themeListProc.running = true
    if (!hermesBinProc.running) hermesBinProc.running = true
  }

  function applyThemeList(raw) {
    var themes = Orbit.parseThemeList(raw)
    root.themesLive = themes.length > 0
    var apps = Orbit.itemsForSector(root.catalog, "apps")
    var agents = Orbit.itemsForSector(root.catalog, "agents")
    if (!root.appsLive) apps = []
    if (!root.agentsLive) agents = []
    root.catalog = Orbit.mergeCatalog(apps, themes, agents)
    root.rebuildDisplay()
  }

  function displayRows() {
    return Orbit.orbitRows(root.catalog, root.filterText)
  }

  function rebuildDisplay() {
    var rows = root.displayRows()
    var previousId = displayModel.count > 0 && root.selectedIndex >= 0 && root.selectedIndex < displayModel.count
      ? displayModel.get(root.selectedIndex).itemId
      : ""
    displayModel.clear()
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      displayModel.append({
        itemId: row.id,
        itemName: row.name,
        itemSector: row.sector,
        itemAction: row.action,
        itemGlyph: row.glyph,
        itemIcon: row.icon,
        itemDesktopId: row.desktopId,
        itemSlug: row.slug,
        itemPluginId: row.pluginId,
        itemPresence: row.presence,
        itemSource: row.source,
        itemRing: row.ring,
        itemIndex: row.index,
        itemCount: row.count,
        itemRadius: row.radius
      })
    }
    var next = previousId ? Orbit.indexOfId(rows, previousId) : -1
    if (next < 0) next = Orbit.firstIndexForSector(rows, root.activeSector)
    if (displayModel.count === 0) root.selectedIndex = 0
    else if (next >= 0 && next < displayModel.count) root.selectedIndex = next
    else root.selectedIndex = 0
    if (displayModel.count > 0 && root.selectedIndex < displayModel.count)
      root.activeSector = displayModel.get(root.selectedIndex).itemSector
  }

  function selectedRow() {
    if (displayModel.count === 0 || root.selectedIndex < 0 || root.selectedIndex >= displayModel.count)
      return null
    return displayModel.get(root.selectedIndex)
  }

  function rowToEntry(row) {
    if (!row) return null
    return {
      id: row.itemId,
      name: row.itemName,
      sector: row.itemSector,
      action: row.itemAction,
      glyph: row.itemGlyph,
      icon: row.itemIcon,
      desktopId: row.itemDesktopId,
      slug: row.itemSlug,
      pluginId: row.itemPluginId,
      presence: row.itemPresence,
      source: row.itemSource
    }
  }

  function setFilter(nextFilter) {
    root.filterText = nextFilter
    root.selectedIndex = 0
    root.rebuildDisplay()
  }

  function selectDelta(delta) {
    if (displayModel.count === 0) return
    root.selectedIndex = Orbit.wrapIndex(root.selectedIndex, displayModel.count, delta)
    var row = root.selectedRow()
    if (row) root.activeSector = row.itemSector
  }

  function selectSector(delta) {
    if (root.filterText) {
      root.selectDelta(delta)
      return
    }
    root.activeSector = Orbit.nextSector(root.activeSector, delta)
    var rows = root.displayRows()
    root.selectedIndex = Orbit.firstIndexForSector(rows, root.activeSector)
    var row = root.selectedRow()
    if (row) root.activeSector = row.itemSector
  }

  function selectIndex(index) {
    if (index < 0 || index >= displayModel.count) return
    root.selectedIndex = index
    var row = root.selectedRow()
    if (row) root.activeSector = row.itemSector
  }

  function iconFor(row) {
    var icon = row && row.itemIcon ? String(row.itemIcon) : ""
    if (!icon) return ""
    try {
      if (root.shell && root.shell.appLibrary && typeof root.shell.appLibrary.iconSource === "function")
        return root.shell.appLibrary.iconSource(icon)
    } catch (e) {}
    try {
      if (icon.indexOf("file://") === 0 || icon.indexOf("image://") === 0) return icon
      if (icon.charAt(0) === "/") return Util.fileUrl(icon)
      var themed = Quickshell.iconPath(icon, true)
      return themed || ""
    } catch (e2) { return "" }
  }

  function runArgv(argv) {
    if (!argv || argv.length === 0) return
    try {
      Quickshell.execDetached(argv)
    } catch (e) {
      try {
        if (typeof Util !== "undefined" && Util.execDetached)
          Util.execDetached(argv.join(" "))
      } catch (e2) {}
    }
  }

  function activateIndex(index) {
    if (index < 0 || index >= displayModel.count) return
    var entry = root.rowToEntry(displayModel.get(index))
    var spec = Orbit.launchSpec(entry)
    root.dismiss()
    if (spec.kind === "demo" || spec.kind === "noop") return
    root.runArgv(spec.argv)
  }

  function paintRings(canvas) {
    var ctx = canvas.getContext("2d")
    if (!ctx) return
    var w = canvas.width
    var h = canvas.height
    ctx.reset()
    ctx.clearRect(0, 0, w, h)
    if (w < 8 || h < 8) return
    var cx = w / 2
    var cy = h / 2
    var maxR = Math.min(w, h) * 0.48
    var searching = root.filterText.length > 0
    var rings = searching ? [0.42] : [Orbit.ringRadius("agents"), Orbit.ringRadius("themes"), Orbit.ringRadius("apps")]
    var outer = Orbit.ringRadius("apps")
    for (var i = 0; i < rings.length; i++) {
      var r = maxR * (rings[i] / outer)
      ctx.beginPath()
      ctx.lineWidth = i === rings.length - 1 ? 2.2 : 1.2
      ctx.strokeStyle = cssColor(root.accent, i === rings.length - 1 ? 0.38 : 0.18)
      ctx.setLineDash([7, 11])
      ctx.lineDashOffset = (root.orbitPhase * 40 * (i % 2 === 0 ? 1 : -1)) % 18
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.lineWidth = 1
    ctx.strokeStyle = cssColor(root.foreground, 0.12)
    ctx.moveTo(cx - maxR * 0.08, cy)
    ctx.lineTo(cx + maxR * 0.08, cy)
    ctx.moveTo(cx, cy - maxR * 0.08)
    ctx.lineTo(cx, cy + maxR * 0.08)
    ctx.stroke()
    ctx.beginPath()
    ctx.lineWidth = 1.4
    ctx.strokeStyle = cssColor(root.accent, 0.22)
    ctx.arc(cx, cy, maxR * 0.14, 0, Math.PI * 2)
    ctx.stroke()
  }

  function cssColor(c, a) {
    return "rgba("
      + Math.round(c.r * 255) + ","
      + Math.round(c.g * 255) + ","
      + Math.round(c.b * 255) + ","
      + a + ")"
  }

  ListModel { id: displayModel }

  FileView {
    path: Quickshell.env("HOME") + "/.hermes/state.db"
    printErrors: false
    onLoaded: {
      root.hermesHome = true
      if (root.opened) {
        root.refreshCatalog()
        root.rebuildDisplay()
      }
    }
    onLoadFailed: root.hermesHome = false
  }

  Process {
    id: hermesBinProc
    command: ["bash", "-c", "command -v hermes >/dev/null"]
    onExited: {
      root.hermesBin = hermesBinProc.exitCode === 0
      if (root.opened) {
        root.refreshCatalog()
        root.rebuildDisplay()
      }
    }
  }

  Process {
    id: themeListProc
    command: ["bash", "-c",
      "if command -v omarchy-theme-list >/dev/null; then omarchy-theme-list; "
      + "else "
      + "find \"$HOME/.config/omarchy/themes\" \"" + (root.omarchyPath || "/usr/share/omarchy") + "/themes\" "
      + "-mindepth 1 -maxdepth 1 \\( -type d -o -type l \\) -printf '%f\\n' 2>/dev/null "
      + "| sort -u | sed -E 's/(^|-)([a-z])/\\1\\u\\2/g; s/-/ /g'; fi"
    ]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.applyThemeList(String(text || ""))
    }
  }

  NumberAnimation on orbitPhase {
    running: root.opened
    from: 0
    to: Math.PI * 2
    duration: 52000
    loops: Animation.Infinite
  }

  PanelWindow {
    id: panel
    visible: root.opened
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    WlrLayershell.namespace: "smf-orbit-dock"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive
    exclusionMode: ExclusionMode.Ignore

    Rectangle {
      anchors.fill: parent
      color: root.scrim
    }

    Canvas {
      id: rings
      anchors.fill: parent
      renderStrategy: Canvas.Cooperative
      onPaint: root.paintRings(rings)
    }

    MouseArea {
      anchors.fill: parent
      onClicked: root.dismiss()
    }

    Item {
      id: keyCatcher
      anchors.fill: parent
      focus: true

      Keys.priority: Keys.BeforeItem
      Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Escape) {
          if (root.filterText) root.setFilter("")
          else root.dismiss()
          event.accepted = true
        } else if (typeof Util !== "undefined" && Util.editsFilter && Util.editsFilter(event, root.filterText)) {
          root.setFilter(Util.editedFilter(event, root.filterText))
          event.accepted = true
        } else if (event.key === Qt.Key_Backtab || (event.key === Qt.Key_Tab && (event.modifiers & Qt.ShiftModifier))) {
          root.selectSector(-1)
          event.accepted = true
        } else if (event.key === Qt.Key_Tab) {
          root.selectSector(1)
          event.accepted = true
        } else if (event.key === Qt.Key_Left) {
          root.selectDelta(-1)
          event.accepted = true
        } else if (event.key === Qt.Key_Right) {
          root.selectDelta(1)
          event.accepted = true
        } else if (event.key === Qt.Key_Up) {
          root.selectSector(-1)
          event.accepted = true
        } else if (event.key === Qt.Key_Down) {
          root.selectSector(1)
          event.accepted = true
        } else if (event.key === Qt.Key_Home) {
          root.selectIndex(0)
          event.accepted = true
        } else if (event.key === Qt.Key_End) {
          root.selectIndex(displayModel.count - 1)
          event.accepted = true
        } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
          root.activateIndex(root.selectedIndex)
          event.accepted = true
        } else if (event.text && event.text.length === 1 && event.text.charCodeAt(0) >= 32 && event.text.charCodeAt(0) !== 127) {
          root.setFilter(root.filterText + event.text)
          event.accepted = true
        }
      }
    }

    Item {
      id: stage
      anchors.fill: parent

      Repeater {
        model: displayModel
        delegate: OrbitTile {
          required property int index
          required property string itemId
          required property string itemName
          required property string itemSector
          required property string itemGlyph
          required property string itemIcon
          required property string itemPresence
          required property string itemRing
          required property int itemIndex
          required property int itemCount
          required property real itemRadius

          readonly property var placed: Orbit.positionRow({
            id: itemId,
            name: itemName,
            sector: itemSector,
            ring: itemRing,
            index: itemIndex,
            count: itemCount,
            radius: itemRadius
          }, root.orbitPhase)

          selected: index === root.selectedIndex
          title: itemName
          glyph: itemGlyph
          iconSource: root.iconFor({ itemIcon: itemIcon })
          sector: itemSector
          presence: Orbit.presenceLabel({ presence: itemPresence })
          accent: root.accent
          foreground: root.foreground
          glass: root.background
          discSize: root.tileSize
          x: stage.width / 2 + placed.nx * Math.min(stage.width, stage.height) * 0.82 - width / 2
          y: stage.height / 2 + placed.ny * Math.min(stage.height * 0.92, stage.width) * 0.82 - root.tileSize / 2
          z: selected ? 20 : 10
          onHovered: root.selectIndex(index)
          onActivated: root.activateIndex(index)
        }
      }
    }

    Rectangle {
      id: core
      width: Math.min(Style.space(340), panel.width * 0.42)
      height: Math.min(Style.space(196), panel.height * 0.28)
      radius: height / 2
      anchors.centerIn: parent
      color: Util.alpha(root.background, 0.78)
      border.width: 1
      border.color: Util.alpha(root.accent, 0.55)

      MouseArea { anchors.fill: parent; onClicked: {} }

      Column {
        anchors.centerIn: parent
        width: parent.width - Style.space(36)
        spacing: Style.space(6)

        Text {
          width: parent.width
          text: "ORBIT DOCK"
          color: root.accent
          opacity: 0.78
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          font.letterSpacing: 2.4
          font.bold: true
          horizontalAlignment: Text.AlignHCenter
        }

        Text {
          width: parent.width
          textFormat: Text.PlainText
          text: root.filterText || "Search apps, themes, agents…"
          color: root.foreground
          opacity: root.filterText ? 1 : 0.55
          font.family: root.fontFamily
          font.pixelSize: Style.font.heading
          font.bold: true
          horizontalAlignment: Text.AlignHCenter
          elide: Text.ElideRight
        }

        Text {
          width: parent.width
          textFormat: Text.PlainText
          text: {
            var row = root.selectedRow()
            if (!row) return displayModel.count === 0 ? "No matches" : ""
            var sector = String(row.itemSector || "").toUpperCase()
            return sector + "  ·  " + row.itemName
          }
          color: root.accent
          opacity: 0.9
          font.family: root.fontFamily
          font.pixelSize: Style.font.title
          horizontalAlignment: Text.AlignHCenter
          elide: Text.ElideRight
        }

        Text {
          width: parent.width
          text: Orbit.catalogHint(root.appsLive, root.themesLive, root.agentsLive)
          color: root.foreground
          opacity: 0.45
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          horizontalAlignment: Text.AlignHCenter
        }
      }
    }

    Text {
      anchors.bottom: parent.bottom
      anchors.horizontalCenter: parent.horizontalCenter
      anchors.bottomMargin: Style.space(28)
      z: 30
      text: "ESC close   ·   ENTER launch   ·   ← → orbit   ·   TAB sector"
      color: root.foreground
      opacity: 0.48
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      font.letterSpacing: 1.1
    }

  }

  Timer {
    interval: 40
    running: root.opened
    repeat: true
    onTriggered: rings.requestPaint()
  }

  Component.onCompleted: root.refreshCatalog()
}
