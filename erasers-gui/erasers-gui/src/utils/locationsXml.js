// locations XML (<locations><room><location/></room></locations>) の
// パースとシリアライズ。保存時は map_xml_sample のサンプルと同じ体裁で手書き整形する。

// XML 文字列を { rooms: [...] } 構造に変換する。失敗時は例外を投げる。
export function parseLocationsXml(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml")

  // DOMParser はパースエラーを <parsererror> 要素として埋め込む
  const errNode = doc.querySelector("parsererror")
  if (errNode) {
    throw new Error(errNode.textContent?.trim() || "XML の解析に失敗しました")
  }

  const root = doc.documentElement
  if (!root || root.tagName !== "locations") {
    throw new Error("ルート要素が <locations> ではありません")
  }

  const rooms = [...root.getElementsByTagName("room")].map(roomEl => ({
    name: roomEl.getAttribute("name") ?? "",
    position: roomEl.getAttribute("position") ?? "0.0 0.0 0.0 0.0",
    locations: [...roomEl.getElementsByTagName("location")].map(locEl => ({
      name: locEl.getAttribute("name") ?? "",
      global_position: locEl.getAttribute("global_position") ?? "0 0 0 0",
      put_position: locEl.getAttribute("put_position") ?? "0 0 0",
      isDoor: (locEl.getAttribute("isDoor") ?? "false").toLowerCase() === "true",
    })),
  }))

  return { rooms }
}

// XML 特殊文字を属性値用にエスケープする
function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// { rooms: [...] } 構造を XML 文字列に変換する（サンプルと同じ体裁）
export function serializeLocationsXml(model) {
  const lines = ["<?xml version='1.0' encoding='utf-8'?>", "<locations>"]

  ;(model.rooms ?? []).forEach((room, idx) => {
    lines.push(`    <room name="${escapeAttr(room.name)}" position="${escapeAttr(room.position)}">`)
    ;(room.locations ?? []).forEach(loc => {
      lines.push(
        `        <location name="${escapeAttr(loc.name)}" ` +
        `global_position="${escapeAttr(loc.global_position)}" ` +
        `put_position="${escapeAttr(loc.put_position)}" ` +
        `isDoor="${loc.isDoor ? "true" : "false"}" />`
      )
    })
    lines.push("    </room>")
    // room 間に空行を挟む（サンプルの体裁に合わせる）
    if (idx < (model.rooms.length - 1)) lines.push("")
  })

  lines.push("</locations>")
  return lines.join("\n")
}
