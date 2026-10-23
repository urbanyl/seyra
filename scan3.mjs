import fs from "node:fs";
const lines = fs.readFileSync("D:/Seyra/app/src/lib/i18n.ts", "utf8").split("\n");
lines.forEach((l, i) => { if (l.includes("\uFFFD")) console.log((i + 1) + ": " + l.trim().slice(0, 160)); });
