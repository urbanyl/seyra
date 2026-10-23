import fs from "node:fs";
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) { if (!/node_modules|\.git|dist|public/.test(p)) walk(p, out); }
    else if (/\.(ts|tsx|css|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
};
const files = [...walk("D:/Seyra/app/src"), "D:/Seyra/server/src/index.js"];
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const n = (s.match(/\uFFFD/g) || []).length;
  if (n) console.log(n, f);
}
