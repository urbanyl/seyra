const model = process.argv[2] || "qwen2.5:1.5b";
const t0 = Date.now();
const res = await fetch("http://127.0.0.1:11434/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    model,
    messages: [
      { role: "system", content: "Réponds en français, court et direct." },
      { role: "user", content: "Explique en trois phrases ce qu'est le chiffrement de bout en bout." },
    ],
    stream: false,
    options: { num_ctx: 2048, num_predict: 160, temperature: 0.7 },
  }),
});
const data = await res.json();
const secs = (Date.now() - t0) / 1000;
const ev = data.eval_count || 0;
const ed = (data.eval_duration || 1) / 1e9;
console.log("model:", model);
console.log("wall:", secs.toFixed(1) + "s", "tokens:", ev, "tok/s:", (ev / ed).toFixed(2));
console.log("answer:", (data.message && data.message.content || "").replace(/\n/g, " ").slice(0, 300));
