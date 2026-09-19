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
  property bool forceDemo: false
  property string filterText: ""
  property string actionHint: ""
  property string launchError: ""
  property int selectedIndex: 0
  property string activeSector: "apps"
  property real orbitPhase: 0
  property var catalog: []
  property var liveApps: []
  property var liveThemes: []
  property var liveAgents: []
  property string appsError: ""
  property string themesError: ""
  property string agentsError: ""
  property bool appsProbed: false
  property bool themesProbed: false
  property bool agentsProbed: false
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
  readonly property string appsMode: Orbit.sectorMode(root.liveApps, root.appsError, root.appsProbed, root.forceDemo)
  readonly property string themesMode: Orbit.sectorMode(root.liveThemes, root.themesError, root.themesProbed, root.forceDemo)
  readonly property string agentsMode: Orbit.sectorMode(root.liveAgents, root.agentsError, root.agentsProbed, root.forceDemo)
  readonly property bool appsLive: root.appsMode === "live" || root.appsMode === "stale"
  readonly property bool themesLive: root.themesMode === "live" || root.themesMode === "stale"
  readonly property bool agentsLive: root.agentsMode === "live" || root.agentsMode === "stale"

  function catalogFlags() {
    return {
      appsError: root.appsError,
      themesError: root.themesError,
      agentsError: root.agentsError,
      appsProbed: root.appsProbed,
      themesProbed: root.themesProbed,
      agentsProbed: root.agentsProbed,
      forceDemo: root.forceDemo
    }
  }

  function open(payloadJson) {
    var payload = Orbit.parsePayload(payloadJson)
    root.filterText = payload.filter
    if (payload.sector) root.activeSector = payload.sector
    root.forceDemo = payload.forceDemo === true
    root.actionHint = ""
    root.launchError = ""
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
      if (!plugins) {
        if (root.agentsError === "plugin registry failed") root.agentsError = ""
        return ids
      }
      for (var key in plugins) ids.push(String(key))
      if (root.agentsError === "plugin registry failed") root.agentsError = ""
    } catch (e) {
      root.agentsError = "plugin registry failed"
    }
    return ids
  }

  function collectApps() {
    var primary = []
    var fallback = []
    var primaryTried = false
    var fallbackTried = false
    var primaryFailed = false
    var fallbackFailed = false
    try {
      if (root.shell && root.shell.appLibrary && typeof root.shell.appLibrary.sortedEntries === "function") {
        primaryTried = true
        primary = root.shell.appLibrary.sortedEntries("") || []
      }
    } catch (e1) {
      primaryTried = true
      primaryFailed = true
      primary = []
    }
    try {
      fallbackTried = true
      fallback = (DesktopEntries.applications && DesktopEntries.applications.values) || []
    } catch (e2) {
      fallbackTried = true
      fallbackFailed = true
      fallback = []
    }
    var result = Orbit.appDiscovery(primary, fallback, primaryFailed, fallbackFailed)
    var attempts = (primaryTried ? 1 : 0) + (fallbackTried ? 1 : 0)
    var failures = (primaryTried && primaryFailed ? 1 : 0) + (fallbackTried && fallbackFailed ? 1 : 0)
    root.liveApps = result.items
    root.appsProbed = true
    root.appsError = (attempts > 0 && failures === attempts && result.items.length === 0)
      ? "desktop catalog failed"
      : ""
    return root.liveApps
  }

  function collectAgents() {
    var agents = Orbit.detectAgents(root.installedPluginIds(), {
      hermesHome: root.hermesHome,
      hermesBin: root.hermesBin
    })
    root.liveAgents = agents
    root.agentsProbed = true
    return agents
  }

  function rebuildCatalog() {
    root.catalog = Orbit.mergeCatalog(root.liveApps, root.liveThemes, root.liveAgents, root.catalogFlags())
    root.rebuildDisplay()
  }

  function kickProbe(proc) {
    if (!proc) return
    if (proc.running) proc.running = false
    proc.running = true
  }

  function refreshCatalog() {
    root.collectApps()
    root.collectAgents()
    root.rebuildCatalog()
    root.kickProbe(themeListProc)
    root.kickProbe(hermesBinProc)
  }

  function applyThemeDiscovery() {
    var result = Orbit.themeDiscovery(themeListProc.lastText, themeListProc.lastCode)
    if (result.error && root.liveThemes.length > 0) {
      root.themesError = result.error
      root.themesProbed = true
    } else {
      root.liveThemes = result.items
      root.themesError = result.error
      root.themesProbed = result.probed
    }
    root.rebuildCatalog()
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
        itemChip: Orbit.presenceLabel(row),
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

  function clearHint() {
    root.actionHint = ""
  }

  function setFilter(nextFilter) {
    root.filterText = nextFilter
    root.selectedIndex = 0
    root.clearHint()
    root.rebuildDisplay()
  }

  function selectDelta(delta) {
    if (displayModel.count === 0) return
    root.clearHint()
    root.selectedIndex = Orbit.wrapIndex(root.selectedIndex, displayModel.count, delta)
    var row = root.selectedRow()
    if (row) root.activeSector = row.itemSector
  }

  function selectSector(delta) {
    root.clearHint()
    if (root.filterText) {
      root.selectDelta(delta)
      return
    }
    var rows = root.displayRows()
    root.activeSector = Orbit.nextOccupiedSector(rows, root.activeSector, delta)
    var idx = Orbit.firstIndexForSector(rows, root.activeSector)
    if (idx >= 0) root.selectedIndex = idx
    var row = root.selectedRow()
    if (row) root.activeSector = row.itemSector
  }

  function selectIndex(index) {
    if (index < 0 || index >= displayModel.count) return
    root.clearHint()
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
    if (!argv || argv.length === 0) return false
    try {
      Quickshell.execDetached(argv)
      return true
    } catch (e) {
      try {
        if (typeof Util !== "undefined" && Util.execDetached) {
          Util.execDetached(argv.join(" "))
          return true
        }
      } catch (e2) {}
    }
    return false
  }

  function activateIndex(index) {
    if (index < 0 || index >= displayModel.count) return
    var entry = root.rowToEntry(displayModel.get(index))
    var spec = Orbit.launchSpec(entry)
    if (!Orbit.shouldDismissOnLaunch(spec)) {
      root.actionHint = Orbit.launchHint(entry)
      return
    }
    var ok = root.runArgv(spec.argv)
    if (ok) {
      root.actionHint = ""
      root.launchError = ""
      root.dismiss()
      return
    }
    root.launchError = "launch failed"
    root.actionHint = "launch failed · " + ((entry && entry.name) || spec.kind)
  }

  function emptyCaption() {
    if (root.filterText) return "No matches"
    return "EMPTY catalog · nothing to orbit"
  }

  function coreCaption() {
    if (root.actionHint) return root.actionHint
    var row = root.selectedRow()
    if (!row) return displayModel.count === 0 ? root.emptyCaption() : ""
    return Orbit.statusLine({
      apps: root.appsMode,
      themes: root.themesMode,
      agents: root.agentsMode
    }, root.rowToEntry(row), "")
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

  function chipFill(mode) {
    if (mode === "live") return 0.28
    if (mode === "err") return 0.24
    if (mode === "stale") return 0.20
    return 0.16
  }

  ListModel { id: displayModel }

  FileView {
    path: Quickshell.env("HOME") + "/.hermes/state.db"
    printErrors: false
    onLoaded: {
      root.hermesHome = true
      if (root.opened) {
        root.refreshCatalog()
      }
    }
    onLoadFailed: {
      root.hermesHome = false
      if (root.opened && root.agentsProbed) {
        root.collectAgents()
        root.rebuildCatalog()
      }
    }
  }

  Process {
    id: hermesBinProc
    command: ["bash", "-c", "command -v hermes >/dev/null"]
    onExited: {
      root.hermesBin = hermesBinProc.exitCode === 0
      if (root.opened) {
        root.collectAgents()
        root.rebuildCatalog()
      }
    }
  }

  Process {
    id: themeListProc
    property string lastText: ""
    property int lastCode: 0
    command: Orbit.themeListCommand(root.omarchyPath)
    stdout: StdioCollector {
      id: themeStdout
      waitForEnd: true
      onStreamFinished: themeListProc.lastText = String(text || "")
    }
    onExited: {
      themeListProc.lastCode = themeListProc.exitCode
      if (themeStdout && themeStdout.text)
        themeListProc.lastText = String(themeStdout.text || "")
      root.applyThemeDiscovery()
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
          required property string itemChip
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
          presence: itemChip
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
      id: honesty
      anchors.top: parent.top
      anchors.horizontalCenter: parent.horizontalCenter
      anchors.topMargin: Style.space(22)
      width: honestyRow.implicitWidth + Style.space(28)
      height: Style.space(36)
      radius: height / 2
      color: Util.alpha(root.background, 0.78)
      border.width: 1
      border.color: Util.alpha(root.accent, 0.55)
      z: 30

      Row {
        id: honestyRow
        anchors.centerIn: parent
        spacing: Style.space(8)

        Rectangle {
          width: appsChip.implicitWidth + Style.space(14)
          height: Style.space(20)
          radius: height / 2
          color: Util.alpha(root.accent, root.chipFill(root.appsMode))
          border.width: 1
          border.color: Util.alpha(root.accent, 0.7)
          Text {
            id: appsChip
            anchors.centerIn: parent
            text: "APPS " + Orbit.sectorLabel(root.appsMode)
            color: root.accent
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.1
          }
        }

        Rectangle {
          width: themesChip.implicitWidth + Style.space(14)
          height: Style.space(20)
          radius: height / 2
          color: Util.alpha(root.accent, root.chipFill(root.themesMode))
          border.width: 1
          border.color: Util.alpha(root.accent, 0.7)
          Text {
            id: themesChip
            anchors.centerIn: parent
            text: "THEMES " + Orbit.sectorLabel(root.themesMode)
            color: root.accent
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.1
          }
        }

        Rectangle {
          width: agentsChip.implicitWidth + Style.space(14)
          height: Style.space(20)
          radius: height / 2
          color: Util.alpha(root.accent, root.chipFill(root.agentsMode))
          border.width: 1
          border.color: Util.alpha(root.accent, 0.7)
          Text {
            id: agentsChip
            anchors.centerIn: parent
            text: "AGENTS " + Orbit.sectorLabel(root.agentsMode)
            color: root.accent
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.1
          }
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
          text: root.coreCaption()
          color: root.accent
          opacity: 0.9
          font.family: root.fontFamily
          font.pixelSize: Style.font.title
          horizontalAlignment: Text.AlignHCenter
          elide: Text.ElideRight
        }

        Text {
          width: parent.width
          textFormat: Text.PlainText
          text: Orbit.catalogHint(root.appsMode, root.themesMode, root.agentsMode)
          color: root.foreground
          opacity: 0.62
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
      textFormat: Text.PlainText
      text: Orbit.footerHint(root.filterText, root.rowToEntry(root.selectedRow()))
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
