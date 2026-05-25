export const ACCENTS = {
  "#2871d9": { c: "oklch(0.52 0.16 245)", l: "oklch(0.96 0.04 245)", name: "Cobalt" },
  "#0e8a6a": { c: "oklch(0.52 0.12 165)", l: "oklch(0.96 0.04 165)", name: "Teal" },
  "#c0492b": { c: "oklch(0.55 0.17 35)",  l: "oklch(0.96 0.05 35)",  name: "Rust" },
  "#5e35b1": { c: "oklch(0.45 0.18 290)", l: "oklch(0.96 0.04 290)", name: "Indigo" },
};

export const ROBOT_TYPES = {
  "AMR":   { id: "MR-2025-A14F", name: "Atlas-04", series: "AMR // Mobile" },
  "ARM":   { id: "RA-2024-K22B", name: "Arm-12",   series: "ARM // Manipulator" },
  "DRONE": { id: "DR-2025-X09",  name: "Sky-07",   series: "UAV // Quadrotor" },
  "QUAD":  { id: "QD-2025-Q03",  name: "Spot-K3",  series: "LEGGED // Quadruped" },
  "FLEET": { id: "FL-2025-MULTI",name: "Fleet-01", series: "FLEET // 6 active" },
};

export function applyTokens(tweaks) {
  const a = ACCENTS[tweaks.accent] || ACCENTS["#2871d9"];
  document.documentElement.style.setProperty("--accent", a.c);
  document.documentElement.style.setProperty("--accent-2", a.l);
  if (tweaks.density === "compact") {
    document.documentElement.style.setProperty("--pad", "12px");
    document.body.style.fontSize = "13px";
  } else if (tweaks.density === "spacious") {
    document.documentElement.style.setProperty("--pad", "20px");
    document.body.style.fontSize = "15px";
  } else {
    document.documentElement.style.setProperty("--pad", "16px");
    document.body.style.fontSize = "14px";
  }
}
