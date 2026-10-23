import fs from "node:fs";
const files = ["app/src/lib/format.ts","app/src/lib/prefs.ts","app/src/lib/lib.test.ts","app/src/components/SessionPanel.tsx","app/src/components/Home.tsx","app/src/App.tsx","app/src/ui2.css"];
for (const f of files) {
  const lines = fs.readFileSync("D:/Seyra/" + f, "utf8").split("\n");
  lines.forEach((l, i) => { if (l.includes("\uFFFD")) console.log(f + ":" + (i + 1) + ": " + l.trim().slice(0, 140)); });
}
