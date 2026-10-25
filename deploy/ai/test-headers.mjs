const url = "https://ai.seyra.website/api/chat";
const payload = JSON.stringify({
  model: "qwen2.5:0.5b",
  messages: [{ role: "user", content: "Salut" }],
  stream: false,
});

async function tryIt(name, headers) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: payload,
  });
  const text = await res.text();
  console.log("=== " + name, res.status, JSON.stringify(text.slice(0, 160)));
}

await tryIt("plain", {});
await tryIt("origin", { origin: "https://ai.seyra.website" });
await tryIt("origin+fetch", {
  origin: "https://ai.seyra.website",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141",
});
const opt = await fetch(url, {
  method: "OPTIONS",
  headers: {
    origin: "https://ai.seyra.website",
    "access-control-request-method": "POST",
    "access-control-request-headers": "content-type",
  },
});
console.log("=== preflight", opt.status, JSON.stringify((await opt.text()).slice(0, 120)));
