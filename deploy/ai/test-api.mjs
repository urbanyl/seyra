const base = process.argv[2] || "http://127.0.0.1:11434";
const body = JSON.stringify({
  model: "qwen2.5:0.5b",
  messages: [{ role: "user", content: "Réponds juste: OK" }],
  stream: false,
});
const t0 = Date.now();
const res = await fetch(base + "/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body,
});
const text = await res.text();
console.log("status", res.status, "ms", Date.now() - t0);
console.log(text.slice(0, 400));
