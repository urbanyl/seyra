import fs from "node:fs";
for (const f of ["app/src/lib/prefs.ts","app/src/components/home.css","app/src/styles.css","app/src/ui2.css"]) {
  fs.readFileSync("D:/Seyra/" + f, "utf8").split("\n").forEach((l, i) => {
    if (l.includes("\uFFFD")) console.log(f + ":" + (i + 1) + ": " + l.trim().slice(0, 110));
  });
}
