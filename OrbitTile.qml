import QtQuick
import qs.Commons

Item {
  id: tile

  property bool selected: false
  property string title: ""
  property string glyph: "󰣆"
  property string iconSource: ""
  property string sector: "apps"
  property string presence: ""
  property color accent: Color.accent
  property color foreground: Color.foreground
  property color glass: Color.menu.background
  property int discSize: Style.space(72)

  signal activated()
  signal hovered()

  width: discSize
  height: discSize + Style.space(28)

  property real pulse: selected ? 1 : 0.28

  SequentialAnimation on pulse {
    running: tile.selected
    loops: Animation.Infinite
    NumberAnimation { to: 1; duration: 720; easing.type: Easing.InOutSine }
    NumberAnimation { to: 0.38; duration: 720; easing.type: Easing.InOutSine }
  }

  onSelectedChanged: if (!selected) pulse = 0.28

  Rectangle {
    id: halo
    anchors.horizontalCenter: parent.horizontalCenter
    y: (tile.discSize - width) / 2
    width: tile.discSize + Style.space(18) * tile.pulse
    height: width
    radius: width / 2
    color: "transparent"
    border.width: Math.max(1, Math.round(Style.space(2) * (tile.selected ? 1 : 0.55)))
    border.color: Util.alpha(tile.accent, tile.selected ? 0.85 * tile.pulse : 0.28)
    opacity: tile.selected ? 0.95 : 0.55
  }

  Rectangle {
    id: disc
    anchors.horizontalCenter: parent.horizontalCenter
    y: 0
    width: tile.discSize
    height: tile.discSize
    radius: width / 2
    color: Util.alpha(tile.glass, tile.selected ? 0.82 : 0.55)
    border.width: tile.selected ? Math.max(2, Style.space(2)) : 1
    border.color: Util.alpha(tile.accent, tile.selected ? 0.95 : 0.42)

    Rectangle {
      anchors.fill: parent
      anchors.margins: Style.space(6)
      radius: width / 2
      color: Util.alpha(tile.accent, tile.selected ? 0.16 + 0.18 * tile.pulse : 0.07)
      border.width: 1
      border.color: Util.alpha(tile.foreground, 0.12)
    }

    Image {
      id: icon
      visible: tile.iconSource.length > 0
      anchors.centerIn: parent
      width: tile.discSize * 0.46
      height: width
      source: tile.iconSource
      fillMode: Image.PreserveAspectFit
      asynchronous: true
      smooth: true
    }

    Text {
      visible: !icon.visible
      anchors.centerIn: parent
      text: tile.glyph
      color: tile.selected ? tile.accent : tile.foreground
      font.family: Style.font.family
      font.pixelSize: Style.font.display
    }
  }

  Text {
    id: label
    anchors.top: disc.bottom
    anchors.topMargin: Style.space(4)
    anchors.horizontalCenter: parent.horizontalCenter
    width: Math.max(tile.discSize + Style.space(24), Style.space(88))
    text: tile.title
    color: tile.selected ? tile.accent : tile.foreground
    opacity: tile.selected ? 1 : 0.78
    font.family: Style.font.family
    font.pixelSize: Style.font.caption
    font.bold: tile.selected
    horizontalAlignment: Text.AlignHCenter
    elide: Text.ElideRight
    wrapMode: Text.NoWrap
  }

  Text {
    visible: tile.presence.length > 0 && tile.selected
    anchors.top: label.bottom
    anchors.horizontalCenter: parent.horizontalCenter
    text: tile.presence
    color: tile.accent
    opacity: 0.8
    font.family: Style.font.family
    font.pixelSize: Style.font.caption
    font.letterSpacing: 1.1
    font.bold: true
  }

  MouseArea {
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onEntered: tile.hovered()
    onClicked: tile.activated()
  }
}
