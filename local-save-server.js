const http = require("node:http");
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