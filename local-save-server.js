const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs/promises");
const path = require("node:path");

const host = process.env.POKECATCH_SAVE_HOST || "127.0.0.1";
const port = Number(process.env.POKECATCH_SAVE_PORT || 4174);
const rootDir = __dirname;
const allowedFiles = new Set(["sprite-overrides.json", "static-sprite-overrides.json"]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { ok: false });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/__save-health") {
    sendJson(response, 200, { ok: true, rootDir, port });
    return;
  }

  // Proxy endpoint for Pokemon cries to avoid CORS issues when serving from localhost
  // Example: GET /__proxy/cry/pikachu -> will proxy https://play.pokemonshowdown.com/audio/cries/pikachu.mp3
  if (request.method === "GET" && request.url && request.url.startsWith('/__proxy/cry/')) {
    try {
      // extract the trailing path after /__proxy/cry/
      const tail = request.url.replace(/^\/__proxy\/cry\//, '');
      const raw = decodeURIComponent((tail.split('?')[0] || '')).trim();
      // allow requests like /__proxy/cry/tyranitar or /__proxy/cry/tyranitar.mp3
      let slug = raw.replace(/\.(mp3|ogg)$/i, '');
      slug = slug.replace(/[^a-z0-9\-]/ig, '').toLowerCase();
      if (!slug) {
        sendJson(response, 400, { ok: false, error: 'Missing slug' });
        return;
      }

      const tryCandidate = (remoteUrl) => new Promise((resolve) => {
        const req = https.get(remoteUrl, { headers: { 'User-Agent': 'PokeCatch-Proxy' } }, (res2) => {
          // Accept 200 OK or 206 Partial Content
          if (res2.statusCode >= 200 && res2.statusCode < 300) {
            const headers = {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Cache-Control': 'no-store',
            };
            if (res2.headers['content-type']) headers['Content-Type'] = res2.headers['content-type'];
            if (res2.headers['content-length']) headers['Content-Length'] = res2.headers['content-length'];
            response.writeHead(res2.statusCode, headers);
            res2.pipe(response);
            res2.on('end', () => resolve(true));
            res2.on('close', () => resolve(true));
          } else {
            // consume and resolve false so caller can try next
            res2.resume();
            resolve(false);
          }
        });
        req.on('error', () => resolve(false));
      });

      const base = 'https://play.pokemonshowdown.com/audio/cries/';
      const candidates = [`${base}${slug}.mp3`, `${base}${slug}.ogg`];
      for (const c of candidates) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await tryCandidate(c);
        if (ok) return;
      }

      // not found
      sendJson(response, 404, { ok: false, error: 'Cry not found' });
      return;
    } catch (err) {
      sendJson(response, 500, { ok: false, error: String(err && err.message ? err.message : err) });
      return;
    }
  }

  if (request.method !== "POST" || request.url !== "/__save-overrides") {
    sendJson(response, 404, { ok: false, error: "Not found" });
    return;
  }

  try {
    const body = await readBody(request);
    const parsed = JSON.parse(body || "{}");
    const targetFile = String(parsed.targetFile || "");
    const overrides = parsed.overrides;

    if (!allowedFiles.has(targetFile)) {
      sendJson(response, 400, { ok: false, error: "Invalid target file" });
      return;
    }

    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      sendJson(response, 400, { ok: false, error: "Overrides payload must be an object" });
      return;
    }

    const filePath = path.join(rootDir, targetFile);
    const payload = `${JSON.stringify(overrides, null, 4)}\n`;
    await fs.writeFile(filePath, payload, "utf8");
    sendJson(response, 200, { ok: true, targetFile, filePath });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`PokeCatch save server listening on http://${host}:${port}`);
});