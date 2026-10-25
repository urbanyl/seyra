const base = "https://ai.seyra.website";
async function code(path, opt) {
  const r = await fetch(base + path, opt);
  return r.status;
}
console.log("/api/ps", await code("/api/ps"));
console.log("/api/tags", await code("/api/tags"));
console.log("/api/pull", await code("/api/pull", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "x" }) }));
console.log("/api/delete", await code("/api/delete", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "qwen2.5:1.5b" }) }));

const body = JSON.stringify({
  model: "qwen2.5:1.5b",
  messages: [{ role: "user", content: "Dis oui" }],
  stream: false,
  options: { num_predict: 1, num_ctx: 256 },
});
const codes = [];
for (let i = 0; i < 6; i++) {
  codes.push(await code("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body }));
}
console.log("chat x6:", codes.join(" "));
