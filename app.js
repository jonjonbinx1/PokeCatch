const urlParams = new URLSearchParams(window.location.search);
const channel =
  urlParams.get("channel") ||
  urlParams.get("user") ||
  urlParams.get("username") ||
  "";
const demoMode = urlParams.get("demo") === "1";
// optional: select a demo pokemon with ?demoPokemon=charizard
const demoPokemon =
  urlParams.get("demoPokemon") || urlParams.get("demo-pokemon") || urlParams.get("demo_pokemon") || null;
const animated = urlParams.get("animated") === "1" || urlParams.get("animated") === "true";
const debugMode = urlParams.get("debug") === "1" || urlParams.get("debug") === "true";
// tuning mode: show tuning panel and disable timers when present (?tuning=true)
const tuningMode = urlParams.get("tuning") === "1" || urlParams.get("tuning") === "true";
const savePort = urlParams.get("savePort") || urlParams.get("save-port") || "4174";

function getLocalSaveBaseUrl() {
  const host = window.location.hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    return null;
  }

  return `http://${host}:${savePort}`;
}

const localSaveBaseUrl = getLocalSaveBaseUrl();
const localSaveHealthUrl = localSaveBaseUrl ? `${localSaveBaseUrl}/__save-health` : null;
const localSaveEndpoint = localSaveBaseUrl ? `${localSaveBaseUrl}/__save-overrides` : null;

// optional: allow callers to override displayed sprite pixel size via ?spriteSize=NN (pixels)
const spriteSizeParam = urlParams.get("spriteSize") || urlParams.get("sprite-size") || urlParams.get("size");
let spriteSize = null;
if (spriteSizeParam) {
  const n = parseInt(spriteSizeParam, 10);
  if (!Number.isNaN(n) && isFinite(n) && n > 8 && n < 1600) spriteSize = n;
}

// optional: allow callers to disable loading/applying sprite override JSON via URL
const disableOverrides =
  urlParams.get("disableOverrides") === "1" ||
  urlParams.get("disable-overrides") === "1" ||
  urlParams.get("noOverrides") === "1" ||
  urlParams.get("no-overrides") === "1";

// DS mode is now the default layout. Pass ?ds=0 to force the older full-size scene.
const dsModeParam = urlParams.get("ds") ?? urlParams.get("ds-mode");
const dsMode = dsModeParam === null
  ? true
  : !["0", "false", "off", "no"].includes(dsModeParam.trim().toLowerCase());
if (dsMode && typeof document !== "undefined" && document.documentElement) {
  document.documentElement.classList.add("ds-mode");
}

// if the window/viewport is being scaled (e.g. dsWindowScale=2), apply an inverse
// inner scale so UI elements remain their original sizes. This will set a CSS
// variable `--ds-inner-scale` that `styles.css` uses to scale the overlay.
const dsWindowScaleParam = urlParams.get('dsWindowScale') || urlParams.get('ds-window-scale');
if (dsWindowScaleParam) {
  const n = parseFloat(dsWindowScaleParam);
  if (!Number.isNaN(n) && isFinite(n) && n > 0) {
    // Do not inverse-scale the inner UI; keep inner scale at 1 so increasing the
    // outer viewport actually makes the visuals larger instead of smaller.
    const innerScale = 1;
    try {
      document.documentElement.style.setProperty('--ds-inner-scale', String(innerScale));
      if (debugMode) addDebugMessage(`[DS] set inner scale ${innerScale} for dsWindowScale=${n}`);
    } catch (e) {
      // ignore if DOM not ready
    }
  }
}

// optional: allow callers to control sprite offsets via ?spriteOffsetX=NN&spriteOffsetY=NN (pixels)
const spriteOffsetXParam =
  urlParams.get("spriteOffsetX") || urlParams.get("sprite-offset-x") || urlParams.get("offsetX") || urlParams.get("x");
const spriteOffsetYParam =
  urlParams.get("spriteOffsetY") || urlParams.get("sprite-offset-y") || urlParams.get("offsetY") || urlParams.get("y");
let spriteOffsetX = null;
let spriteOffsetY = null;

// optional: allow callers to supply separate offsets for animated/static sprites
const spriteOffsetXAnimatedParam =
  urlParams.get("spriteOffsetXAnimated") || urlParams.get("sprite-offset-animated-x") || urlParams.get("animatedOffsetX") || urlParams.get("animated-offset-x");
const spriteOffsetYAnimatedParam =
  urlParams.get("spriteOffsetYAnimated") || urlParams.get("sprite-offset-animated-y") || urlParams.get("animatedOffsetY") || urlParams.get("animated-offset-y");
const spriteOffsetXStaticParam =
  urlParams.get("spriteOffsetXStatic") || urlParams.get("sprite-offset-static-x") || urlParams.get("staticOffsetX") || urlParams.get("static-offset-x");
const spriteOffsetYStaticParam =
  urlParams.get("spriteOffsetYStatic") || urlParams.get("sprite-offset-static-y") || urlParams.get("staticOffsetY") || urlParams.get("static-offset-y");
let spriteOffsetXAnimated = null;
let spriteOffsetYAnimated = null;
let spriteOffsetXStatic = null;
let spriteOffsetYStatic = null;

function parseOffsetParam(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  const m = s.match(/^(-?\d+)(px)?$/i);
  if (m) return parseInt(m[1], 10);
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && isFinite(n)) return n;
  return null;
}

spriteOffsetX = parseOffsetParam(spriteOffsetXParam);
spriteOffsetY = parseOffsetParam(spriteOffsetYParam);
spriteOffsetXAnimated = parseOffsetParam(spriteOffsetXAnimatedParam);
spriteOffsetYAnimated = parseOffsetParam(spriteOffsetYAnimatedParam);
spriteOffsetXStatic = parseOffsetParam(spriteOffsetXStaticParam);
spriteOffsetYStatic = parseOffsetParam(spriteOffsetYStaticParam);

const encounterPatterns = [
  /(?:a\s+wild|wild)\s+(.+?)\s+(?:appeared|has appeared|appears|spawned)\b/i,
  /you encountered\s+(?:a\s+)?wild\s+(.+?)(?:[!.]|$)/i,
  /(.+?)\s+has appeared in chat\b/i,
];

const specialNameMap = new Map([
  ["farfetch'd", "farfetchd"],
  ["sirfetch'd", "sirfetchd"],
  ["mr. mime", "mr-mime"],
  ["mime jr.", "mime-jr"],
  ["type: null", "type-null"],
  ["jangmo-o", "jangmo-o"],
  ["hakamo-o", "hakamo-o"],
  ["kommo-o", "kommo-o"],
  ["tapu koko", "tapu-koko"],
  ["tapu lele", "tapu-lele"],
  ["tapu bulu", "tapu-bulu"],
  ["tapu fini", "tapu-fini"],
  ["mr. rime", "mr-rime"],
  ["great tusk", "great-tusk"],
  ["brute bonnet", "brute-bonnet"],
  ["scream tail", "scream-tail"],
  ["flutter mane", "flutter-mane"],
  ["slither wing", "slither-wing"],
  ["sandy shocks", "sandy-shocks"],
  ["iron treads", "iron-treads"],
  ["iron bundle", "iron-bundle"],
  ["iron hands", "iron-hands"],
  ["iron jugulis", "iron-jugulis"],
  ["iron moth", "iron-moth"],
  ["iron thorns", "iron-thorns"],
  ["wo-chien", "wo-chien"],
  ["chien-pao", "chien-pao"],
  ["ting-lu", "ting-lu"],
  ["chi-yu", "chi-yu"],
  ["ho-oh", "ho-oh"],
  ["porygon-z", "porygon-z"],
  ["nidoran female", "nidoran-f"],
  ["nidoran male", "nidoran-m"],
  ["nidoranf", "nidoran-f"],
  ["nidoranm", "nidoran-m"],
  ["flabebe", "flabebe"],
]);

const dom = {
  battleScene: document.querySelector("#battleScene"),
  setupCard: document.querySelector("#setupCard"),
  statusStrip: document.querySelector(".status-strip"),
  debugPanel: document.querySelector("#debugPanel"),
  debugMessages: document.querySelector("#debugMessages"),
  tunePanel: document.querySelector("#tunePanel"),
  channelName: document.querySelector("#channelName"),
  connectionState: document.querySelector("#connectionState"),
  battleMessage: document.querySelector("#battleMessage"),
  pokemonName: document.querySelector("#pokemonName"),
  pokemonLevel: document.querySelector("#pokemonLevel"),
  pokemonSprite: document.querySelector("#pokemonSprite"),
  hpFill: document.querySelector("#hpFill"),
};

const encounterQueue = [];
const pokemonCache = new Map();
const twitchState = {
  reconnectTimer: null,
  socket: null,
};

let activeEncounter = false;
let hideTimeoutId = null;
let currentEncounter = null;
let countdownRaf = null;
let countdownStartTs = 0;
let countdownDuration = 90000;
let countdownActive = false;
let statusFadeTimer = null;

function addDebugMessage(text) {
  if (!debugMode) return;
  const container = dom.debugMessages;
  if (!container) return;
  const el = document.createElement("div");
  el.className = "debug-message";
  const ts = new Date().toLocaleTimeString();
  el.textContent = `[${ts}] ${text}`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}


function setConnectionState(text) {
  dom.connectionState.textContent = text;
  // show the status strip for any non-connected state
  if (!dom.statusStrip) return;

  if (/connected/i.test(text)) {
    // ensure visible initially
    dom.statusStrip.classList.remove("fade");
    if (statusFadeTimer) {
      clearTimeout(statusFadeTimer);
      statusFadeTimer = null;
    }
    // fade after 5s to keep screen clear
    statusFadeTimer = setTimeout(() => {
      dom.statusStrip.classList.add("fade");
      statusFadeTimer = null;
    }, 5000);
  } else {
    // any other state: cancel fade and make visible so user sees connectivity issues
    if (statusFadeTimer) {
      clearTimeout(statusFadeTimer);
      statusFadeTimer = null;
    }
    dom.statusStrip.classList.remove("fade");
  }
  if (debugMode) addDebugMessage(`CONN: ${text}`);
}

function normalizeSlug(rawName) {
  const cleaned = rawName
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[!?.:,]+$/g, "")
    .replace(/[’']/g, "'")
    .trim()
    .toLowerCase();

  if (specialNameMap.has(cleaned)) {
    return specialNameMap.get(cleaned);
  }

  const withoutAccents = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return withoutAccents
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatDisplayName(name) {
  return name.replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeIncomingMessage(raw) {
  if (!raw) return raw;
  // strip IRC CTCP / ACTION control characters (\x01)
  let s = raw.replace(/\u0001/g, "").replace(/\x01/g, "");
  // remove leading ACTION marker used for /me messages
  s = s.replace(/^\s*ACTION\s+/i, "");
  // remove common event tokens used by the bot
  s = s.replace(/deemon8EventSpawn/gi, "");
  // normalize whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function extractEncounterName(message) {
  for (const pattern of encounterPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function parseDurationFromMessage(message) {
  const timerMatch = message && message.match(/(\d{1,4})\s*(?:s|sec|secs|seconds)\b/i);
  if (timerMatch) {
    const secs = parseInt(timerMatch[1], 10);
    if (!Number.isNaN(secs)) return Math.max(1000, Math.min(300000, secs * 1000));
  }
  return countdownDuration; // default
}

function pickHpColor(percent) {
  if (percent <= 25) {
    return 'linear-gradient(90deg, #ff9672, #d95d3d)';
  }
  if (percent <= 50) {
    return 'linear-gradient(90deg, #f0ea8a, #d7c84c)';
  }
  return 'linear-gradient(90deg, #88d95d, #60b847)';
}

function setHpPercent(pct) {
  try {
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    if (!dom.hpFill) return;
    dom.hpFill.style.width = `${clamped}%`;
    dom.hpFill.style.background = pickHpColor(clamped);
  } catch (e) {
    if (debugMode) addDebugMessage(`[HP] set failed: ${e.message}`);
  }
}

async function fetchPokemonData(rawName) {
  const slug = normalizeSlug(rawName);

  if (!slug) {
    throw new Error("Unable to resolve Pokemon name from chat message.");
  }

  if (pokemonCache.has(slug)) {
    return pokemonCache.get(slug);
  }

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`);

  if (!response.ok) {
    throw new Error(`PokeAPI lookup failed for ${slug}.`);
  }

  const pokemon = await response.json();
  const normalized = {
    id: pokemon.id,
    name: pokemon.name,
    displayName: rawName,
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
  };

  // Wrap the sprite in a container so we can offset the container independently
  // from the image transform used by the entrance animation.
  try {
    const sprite = dom.pokemonSprite;
    if (sprite) {
      const parent = sprite.parentElement;
      if (!parent.classList || !parent.classList.contains("pokemon-sprite-wrap")) {
        const wrap = document.createElement("div");
        wrap.className = "pokemon-sprite-wrap";
        parent.insertBefore(wrap, sprite);
        wrap.appendChild(sprite);
      }
    }
  } catch (e) {
    console.warn("Failed to wrap pokemon sprite", e);
  }

  pokemonCache.set(slug, normalized);
  return normalized;
}

// per-pokemon overrides loaded from /sprite-overrides.json
let spriteOverrides = {};
// per-pokemon overrides specifically for static (non-animated) sprites
let staticSpriteOverrides = {};
const projectHandleDbName = "pokecatch-overlay";
const projectHandleStoreName = "handles";
const projectHandleKey = "project-directory";
let projectHandleDbPromise = null;
let projectDirectoryHandle = null;
let localSaveServiceState = localSaveBaseUrl ? "unknown" : "unavailable";

async function fetchJsonWithFallback(urls) {
  for (const u of urls) {
    try {
      const resp = await fetch(u);
      if (resp.ok) {
        const data = await resp.json();
        if (debugMode) addDebugMessage(`[OVRD] fetched ${u}`);
        return { data, url: u };
      } else {
        if (debugMode) addDebugMessage(`[OVRD] not found ${u} (${resp.status})`);
      }
    } catch (e) {
      if (debugMode) addDebugMessage(`[OVRD] fetch ${u} failed: ${e.message}`);
    }
  }
  return null;
}

async function loadSpriteOverrides() {
  if (disableOverrides) {
    spriteOverrides = {};
    staticSpriteOverrides = {};
    if (debugMode) addDebugMessage('[OVRD] sprite overrides disabled via URL param');
    return;
  }
  let baseUrl = null;
  if (typeof import.meta !== "undefined" && import.meta.url) {
    baseUrl = new URL(".", import.meta.url).href;
  } else {
    const script = document.querySelector('script[type="module"][src]');
    if (script && script.src) {
      baseUrl = new URL(".", script.src).href;
    } else if (document.baseURI) {
      baseUrl = document.baseURI;
    } else {
      baseUrl = window.location.href;
    }
  }

  const makeCandidates = (filename) => {
    const list = [];
    try {
      list.push(new URL(filename, baseUrl).href);
    } catch (e) {}
    try {
      list.push(new URL(filename, window.location.href).href);
    } catch (e) {}
    try {
      list.push(new URL('/' + filename, window.location.origin).href);
    } catch (e) {}
    list.push(filename);
    return Array.from(new Set(list));
  };

  // load animated/general overrides
  try {
    const spriteUrls = makeCandidates('sprite-overrides.json');
    const spriteResult = await fetchJsonWithFallback(spriteUrls);
    if (spriteResult && spriteResult.data) {
      spriteOverrides = spriteResult.data;
      if (debugMode) addDebugMessage(`[OVRD] loaded ${Object.keys(spriteOverrides).length} overrides from ${spriteResult.url}`);
    } else {
      if (debugMode) addDebugMessage('[OVRD] no sprite-overrides.json found');
    }
  } catch (e) {
    if (debugMode) addDebugMessage(`[OVRD] load failed: ${e.message}`);
  }

  // load static-only overrides (separate file)
  try {
    const staticUrls = makeCandidates('static-sprite-overrides.json');
    const staticResult = await fetchJsonWithFallback(staticUrls);
    if (staticResult && staticResult.data) {
      staticSpriteOverrides = staticResult.data;
      if (debugMode) addDebugMessage(`[OVRD] loaded ${Object.keys(staticSpriteOverrides).length} static overrides from ${staticResult.url}`);
    } else {
      if (debugMode) addDebugMessage('[OVRD] no static-sprite-overrides.json found');
    }
  } catch (e) {
    if (debugMode) addDebugMessage(`[OVRD] static load failed: ${e.message}`);
  }
}

function getOverrideFor(slug, isAnimated = false) {
  if (!slug) return null;
  if (disableOverrides) return null;
  const key = String(slug).toLowerCase();
  if (!isAnimated && staticSpriteOverrides && staticSpriteOverrides[key]) {
    return staticSpriteOverrides[key];
  }
  return spriteOverrides[key] || null;
}

function getSpriteVariantInfo(img = dom.pokemonSprite) {
  const src = img && img.src ? String(img.src).toLowerCase() : "";
  const isAnimatedSprite = src
    ? src.endsWith(".gif") || src.includes("/ani/")
    : animated;

  return {
    isAnimatedSprite,
    map: isAnimatedSprite ? spriteOverrides : staticSpriteOverrides,
    targetFile: isAnimatedSprite ? "sprite-overrides.json" : "static-sprite-overrides.json",
  };
}

function sortOverrideEntries(map) {
  return Object.keys(map || {})
    .sort((left, right) => left.localeCompare(right))
    .reduce((sorted, key) => {
      sorted[key] = map[key];
      return sorted;
    }, {});
}

function clearEncounterQueue() {
  while (encounterQueue.length > 0) {
    const pending = encounterQueue.shift();
    if (pending && pending._expiryTimer) {
      clearTimeout(pending._expiryTimer);
      pending._expiryTimer = null;
    }
  }
}

function openProjectHandleDb() {
  if (!("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  if (!projectHandleDbPromise) {
    projectHandleDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(projectHandleDbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(projectHandleStoreName)) {
          db.createObjectStore(projectHandleStoreName);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      console.warn("Failed to open project handle storage", error);
      return null;
    });
  }

  return projectHandleDbPromise;
}

async function readStoredProjectDirectoryHandle() {
  const db = await openProjectHandleDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(projectHandleStoreName, "readonly");
    const request = tx.objectStore(projectHandleStoreName).get(projectHandleKey);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function writeStoredProjectDirectoryHandle(handle) {
  const db = await openProjectHandleDb();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(projectHandleStoreName, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    try {
      tx.objectStore(projectHandleStoreName).put(handle, projectHandleKey);
    } catch (error) {
      console.warn("Failed to persist project folder handle", error);
      resolve();
    }
  });
}

async function getDirectoryPermission(handle, request = false) {
  if (!handle) return "prompt";

  const options = { mode: "readwrite" };
  if (typeof handle.queryPermission === "function") {
    const state = await handle.queryPermission(options);
    if (state === "granted") {
      return state;
    }
  }

  if (request && typeof handle.requestPermission === "function") {
    return handle.requestPermission(options);
  }

  return "prompt";
}

function setTuneSaveStatus(message, tone = "warning") {
  const statusEl = document.getElementById("tuneSaveStatus");
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

async function checkLocalSaveService(force = false) {
  if (!localSaveHealthUrl) {
    localSaveServiceState = "unavailable";
    return false;
  }

  if (!force && (localSaveServiceState === "available" || localSaveServiceState === "unavailable")) {
    return localSaveServiceState === "available";
  }

  try {
    const response = await fetch(localSaveHealthUrl, {
      method: "GET",
      cache: "no-store",
      mode: "cors",
    });
    localSaveServiceState = response.ok ? "available" : "unavailable";
  } catch (error) {
    localSaveServiceState = "unavailable";
  }

  return localSaveServiceState === "available";
}

function syncTuneSaveStatus(message, tone) {
  if (message) {
    setTuneSaveStatus(message, tone);
    return;
  }

  const { isAnimatedSprite, targetFile } = getSpriteVariantInfo();
  const variantLabel = isAnimatedSprite ? "animated" : "static";

  if (localSaveServiceState === "available") {
    setTuneSaveStatus(`Local save service is ready for ${targetFile}.`, "ready");
    return;
  }

  if (typeof window.showDirectoryPicker !== "function") {
    setTuneSaveStatus(`Direct file saving is unavailable in this browser for ${targetFile}.`, "error");
    return;
  }

  if (projectDirectoryHandle) {
    const folderName = projectDirectoryHandle.name || "selected folder";
    setTuneSaveStatus(`Ready to save ${variantLabel} overrides to ${folderName}/${targetFile}.`, "ready");
    return;
  }

  setTuneSaveStatus(`Connect the PokeCatch folder to save ${variantLabel} overrides to ${targetFile}.`, "warning");
}

async function saveSpriteOverridesViaService(targetFile, sortedOverrides) {
  if (!localSaveEndpoint) {
    return { saved: false, reason: "service-unavailable" };
  }

  try {
    const response = await fetch(localSaveEndpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetFile,
        overrides: sortedOverrides,
      }),
    });

    if (!response.ok) {
      throw new Error(`Save service returned ${response.status}`);
    }

    localSaveServiceState = "available";
    return { saved: true };
  } catch (error) {
    localSaveServiceState = "unavailable";
    return { saved: false, reason: "service-failed", error };
  }
}

async function ensureProjectDirectoryHandle(options = {}) {
  const { forcePrompt = false } = options;

  if (typeof window.showDirectoryPicker !== "function") {
    syncTuneSaveStatus(null, null);
    return null;
  }

  let handle = forcePrompt ? null : projectDirectoryHandle;

  if (!handle && !forcePrompt) {
    handle = await readStoredProjectDirectoryHandle();
    if (handle) {
      projectDirectoryHandle = handle;
    }
  }

  if (handle) {
    const permission = await getDirectoryPermission(handle, true);
    if (permission === "granted") {
      projectDirectoryHandle = handle;
      syncTuneSaveStatus();
      return handle;
    }
  }

  try {
    handle = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (error) {
    if (error && error.name !== "AbortError") {
      console.error(error);
      syncTuneSaveStatus("Could not open the project folder picker.", "error");
    }
    return null;
  }

  const permission = await getDirectoryPermission(handle, true);
  if (permission !== "granted") {
    syncTuneSaveStatus("Folder access was not granted.", "error");
    return null;
  }

  projectDirectoryHandle = handle;
  await writeStoredProjectDirectoryHandle(handle);
  syncTuneSaveStatus(`Connected ${handle.name || "project folder"}.`, "success");
  return handle;
}

async function saveSpriteOverridesToDisk(options = {}) {
  const { forcePrompt = false } = options;
  const slug = window._tuningSlug || (currentEncounter && currentEncounter.pokemon && normalizeSlug(currentEncounter.pokemon.name));
  if (!slug) {
    syncTuneSaveStatus("No Pokemon is selected for saving.", "error");
    return { saved: false, slug: null };
  }

  const { map, isAnimatedSprite, targetFile } = getSpriteVariantInfo();
  const sortedOverrides = sortOverrideEntries(map);

  const serviceResult = await saveSpriteOverridesViaService(targetFile, sortedOverrides);
  if (serviceResult.saved) {
    const override = map[slug] || null;
    window._pendingExport = { [slug]: override, targetFile, isImgAnimated: isAnimatedSprite };
    window.dispatchEvent(new CustomEvent("pokecatch:pendingExport", { detail: { slug, override, isImgAnimated: isAnimatedSprite, targetFile, saved: true } }));
    syncTuneSaveStatus(`Saved ${slug} to ${targetFile}.`, "success");
    if (debugMode) addDebugMessage(`[SAVE] ${slug} -> ${targetFile} (local service)`);
    return { saved: true, slug, override, targetFile, isImgAnimated: isAnimatedSprite };
  }

  const handle = await ensureProjectDirectoryHandle({ forcePrompt });
  if (!handle) {
    return { saved: false, slug, targetFile, isImgAnimated: isAnimatedSprite };
  }

  try {
    const fileHandle = await handle.getFileHandle(targetFile, { create: true });
    const writable = await fileHandle.createWritable();
    const payload = `${JSON.stringify(sortedOverrides, null, 4)}\n`;
    await writable.write(payload);
    await writable.close();

    const override = map[slug] || null;
    window._pendingExport = { [slug]: override, targetFile, isImgAnimated: isAnimatedSprite };
    window.dispatchEvent(new CustomEvent("pokecatch:pendingExport", { detail: { slug, override, isImgAnimated: isAnimatedSprite, targetFile, saved: true } }));
    syncTuneSaveStatus(`Saved ${slug} to ${targetFile}.`, "success");
    if (debugMode) addDebugMessage(`[SAVE] ${slug} -> ${targetFile}`);
    return { saved: true, slug, override, targetFile, isImgAnimated: isAnimatedSprite };
  } catch (error) {
    console.error(error);
    syncTuneSaveStatus(`Failed to save ${targetFile}: ${error.message}`, "error");
    if (debugMode) addDebugMessage(`[SAVE] failed ${targetFile}: ${error.message}`);
    return { saved: false, slug, targetFile, error, isImgAnimated: isAnimatedSprite };
  }
}

function applySpriteSizing(slug, img, wrap, isAnimated = false) {
  try {
    const override = getOverrideFor(slug, isAnimated);
    const backdrop = document.querySelector('.battle-backdrop');
    const bdH = backdrop ? backdrop.clientHeight : window.innerHeight;

    if (override && (override.width || override.offsetX || override.offsetY)) {
      if (override.width) wrap.style.width = `${override.width}px`;
      if (override.offsetX !== undefined || override.offsetY !== undefined) {
        const ox = override.offsetX || 0;
        const oy = override.offsetY || 0;
        wrap.style.transform = `translate(calc(-50% + ${ox}px), ${oy}px)`;
      }
      if (debugMode) addDebugMessage(`[OVRD] applied ${slug} w=${override.width||'auto'} x=${override.offsetX||0} y=${override.offsetY||0}`);
      return;
    }

    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!(nw && nh)) return;

    // Choose a target display height based on the backdrop height and allow
    // proportional scaling as the viewport grows. Use reasonable clamps to
    // avoid extremely tiny or huge sprites.
    const targetH = Math.max(48, Math.round(bdH * 0.32 * 1.33));
    // Allow up/down scaling but clamp between 0.5x and 3x the natural size
    // so sprites remain visible but not excessively blown-up.
    const scale = Math.max(0.5, Math.min(3, targetH / nh));
    const displayW = Math.round(nw * scale);
    wrap.style.width = `${displayW}px`;
    if (debugMode) addDebugMessage(`[SIZE] ${slug} nw=${nw} nh=${nh} -> w=${displayW} scale=${scale.toFixed(2)} targetH=${targetH}`);
  } catch (e) {
    if (debugMode) addDebugMessage(`[SIZE] error ${e.message}`);
  }
}

function queueEncounter(encounter) {
  encounterQueue.push(encounter);
  if (debugMode) addDebugMessage(`[ENCOUNTER QUEUED] ${encounter.sender}: ${encounter.message} dur=${encounter.durationMs}ms`);

  // schedule expiry so the encounter times out even if it doesn't render
  if (!tuningMode && encounter.durationMs && !encounter._expiryTimer) {
    encounter._expiryTimer = window.setTimeout(() => {
      const idx = encounterQueue.indexOf(encounter);
      if (idx !== -1) {
        encounterQueue.splice(idx, 1);
        if (debugMode) addDebugMessage(`[EXPIRE] encounter expired before render: ${encounter.name}`);
      }
    }, encounter.durationMs);
  } else if (tuningMode && debugMode) {
    addDebugMessage(`[TUNE] skipping expiry scheduling for ${encounter.name}`);
  }

  if (!activeEncounter) {
    void playNextEncounter();
  }
}

function simulateEncounter(name = "pikachu", message = null) {
  const durationMs = parseDurationFromMessage(message);
  const receivedAt = performance.now();
  queueEncounter({
    name,
    sender: "demo",
    message,
    durationMs,
    receivedAt,
  });
}

async function playNextEncounter() {
  const nextEncounter = encounterQueue.shift();

  if (!nextEncounter) {
    activeEncounter = false;
    return;
  }

  activeEncounter = true;

  try {
    const pokemon = await fetchPokemonData(nextEncounter.name);
    renderEncounter(pokemon, nextEncounter);
  } catch (error) {
    console.error(error);
    setConnectionState("Connected · lookup failed");
    activeEncounter = false;
    void playNextEncounter();
  }
}

function renderEncounter(pokemon, encounter) {
  if (hideTimeoutId) {
    window.clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }

  stopHpCountdown();

  const level = Math.max(2, Math.min(100, Math.round(pokemon.id / 8) + 2));
  const displayName = formatDisplayName(pokemon.displayName || pokemon.name);

  currentEncounter = {
    pokemon,
    displayName,
    message: (encounter && encounter.message) || `A WILD ${displayName.toUpperCase()} APPEARED`,
    decisionOccurred: false,
    receivedAt: encounter && encounter.receivedAt ? encounter.receivedAt : performance.now(),
    durationMs: encounter && encounter.durationMs ? encounter.durationMs : countdownDuration,
  };

  // hide visual until sprite and sizing are ready
  dom.setupCard.style.display = "none";
  dom.battleScene.className = "battle-scene hidden";
  dom.battleScene.hidden = true;
  dom.pokemonName.textContent = currentEncounter.displayName;
  dom.pokemonLevel.textContent = `Lv. ${level}`;
  dom.battleMessage.classList.remove("caught", "escaped");
  dom.battleMessage.textContent = currentEncounter.message;
  dom.pokemonSprite.alt = `${displayName} sprite`;
  dom.pokemonSprite.style.animation = "none";

  // set initial HP fill based on time already elapsed
  const now = performance.now();
  const elapsed = now - currentEncounter.receivedAt;
  const remaining = Math.max(0, currentEncounter.durationMs - elapsed);
  const initialPct = currentEncounter.durationMs > 0 ? Math.max(0, 100 * (remaining / currentEncounter.durationMs)) : 0;
  setHpPercent(initialPct);

  // clear any expiry timer now that we're rendering
  if (encounter && encounter._expiryTimer) {
    clearTimeout(encounter._expiryTimer);
    encounter._expiryTimer = null;
  }

  // handle sizing/overrides after the image loads, then show the scene and start countdown
  function handleSpriteLoad() {
    const slug = pokemon.name || normalizeSlug(displayName);
    const wrap = dom.pokemonSprite.parentElement && dom.pokemonSprite.parentElement.classList.contains('pokemon-sprite-wrap')
      ? dom.pokemonSprite.parentElement
      : dom.pokemonSprite;
    // Detect whether the loaded image is actually animated (GIF) or static (PNG)
    const src = (dom.pokemonSprite && dom.pokemonSprite.src) ? String(dom.pokemonSprite.src).toLowerCase() : '';
    const isSpriteAnimated = src.endsWith('.gif') || src.includes('/ani/');

    // Only pixelate animated sprites; static PNGs should render with smoothing
    try {
      if (dom.pokemonSprite && dom.pokemonSprite.classList) {
        if (isSpriteAnimated) dom.pokemonSprite.classList.add('pixelated');
        else dom.pokemonSprite.classList.remove('pixelated');
      }
    } catch (e) { /* ignore */ }

    applySpriteSizing(slug, dom.pokemonSprite, wrap, isSpriteAnimated);

    // If time already expired while loading, skip rendering
    const now2 = performance.now();
    const elapsed2 = now2 - currentEncounter.receivedAt;
    const remaining2 = Math.max(0, currentEncounter.durationMs - elapsed2);
    if (remaining2 <= 0) {
      if (debugMode) addDebugMessage(`[EXPIRED] ${currentEncounter.displayName} expired before render`);
      currentEncounter = null;
      activeEncounter = false;
      void playNextEncounter();
      return;
    }

    // show the scene now that sprite sizing is applied
    dom.battleScene.className = "battle-scene";
    dom.battleScene.hidden = false;

    // restart the animation on the image
    dom.pokemonSprite.style.animation = "none";
    void dom.pokemonSprite.offsetWidth;
    dom.pokemonSprite.style.animation = "pokemonEntrance 700ms steps(6, end) both";

    syncTuneSaveStatus();
    if (typeof window._updateTunePanel === "function") {
      window._updateTunePanel();
    }

    // start countdown aligned to the original receipt timestamp (unless tuning)
    if (!tuningMode) {
      if (debugMode) addDebugMessage(`[TIMER] resume start=${currentEncounter.receivedAt} total=${currentEncounter.durationMs}ms`);
      startHpCountdown(currentEncounter.durationMs, currentEncounter.receivedAt);
    } else if (debugMode) {
      addDebugMessage(`[TUNE] tuning mode active — timer suppressed for ${currentEncounter.displayName}`);
    }
  }

  function useStatic() {
    dom.pokemonSprite.onerror = null;
    dom.pokemonSprite.onload = () => {
      if (debugMode) addDebugMessage(`[ANIM] using static ${pokemon.spriteUrl}`);
      handleSpriteLoad();
    };
    dom.pokemonSprite.src = pokemon.spriteUrl;
  }

  if (animated) {
    const aniName = pokemon.name || normalizeSlug(displayName);
    const aniUrl = `https://play.pokemonshowdown.com/sprites/ani/${aniName}.gif`;
    dom.pokemonSprite.onerror = () => {
      // fallback to static
      if (debugMode) addDebugMessage(`[ANIM] failed to load ${aniUrl}`);
      useStatic();
    };
    dom.pokemonSprite.onload = () => {
      if (debugMode) addDebugMessage(`[ANIM] loaded ${aniUrl}`);
      handleSpriteLoad();
    };
    dom.pokemonSprite.src = aniUrl;
  } else {
    useStatic();
  }

  // determine countdown duration: default (90s) or parse from the message (e.g. "90s")
  let duration = countdownDuration;
  const timerMatch = currentEncounter.message && currentEncounter.message.match(/(\d{1,4})\s*(?:s|sec|secs|seconds)\b/i);
  if (timerMatch) {
    const secs = parseInt(timerMatch[1], 10);
    if (!Number.isNaN(secs)) duration = Math.max(1000, Math.min(300000, secs * 1000));
  }
  if (!tuningMode) {
    if (debugMode) addDebugMessage(`[TIMER] start ${duration}ms`);
    startHpCountdown(duration);
  } else if (debugMode) {
    addDebugMessage(`[TUNE] tuning mode active — timer suppressed (would be ${duration}ms)`);
  }
}

function parseTags(rawTags) {
  return rawTags.split(";").reduce((accumulator, pair) => {
    const [key, value = ""] = pair.split("=");
    accumulator[key] = value
      .replace(/\\s/g, " ")
      .replace(/\\:/g, ";")
      .replace(/\\r/g, "\r")
      .replace(/\\n/g, "\n");
    return accumulator;
  }, {});
}

function parseIrcLine(line) {
  let workingLine = line;
  let tags = {};
  let prefix = "";

  if (workingLine.startsWith("@")) {
    const firstSpace = workingLine.indexOf(" ");
    tags = parseTags(workingLine.slice(1, firstSpace));
    workingLine = workingLine.slice(firstSpace + 1);
  }

  if (workingLine.startsWith(":")) {
    const firstSpace = workingLine.indexOf(" ");
    prefix = workingLine.slice(1, firstSpace);
    workingLine = workingLine.slice(firstSpace + 1);
  }

  const trailingIndex = workingLine.indexOf(" :");
  const trailing = trailingIndex >= 0 ? workingLine.slice(trailingIndex + 2) : "";
  const body = trailingIndex >= 0 ? workingLine.slice(0, trailingIndex) : workingLine;
  const parts = body.split(" ").filter(Boolean);
  const command = parts.shift() || "";

  return {
    command,
    params: parts,
    prefix,
    tags,
    trailing,
  };
}

function scheduleReconnect(targetChannel) {
  if (twitchState.reconnectTimer) {
    return;
  }

  setConnectionState("Reconnecting");
  twitchState.reconnectTimer = window.setTimeout(() => {
    twitchState.reconnectTimer = null;
    startChatClient(targetChannel);
  }, 5000);
}

function handlePrivmsg(line) {
  const sender = line.tags["display-name"] || line.prefix.split("!")[0] || "chat";
  const rawMessage = line.trailing;
  // log raw and normalized messages in debug mode
  if (debugMode) addDebugMessage(`RAW: ${rawMessage}`);
  const message = normalizeIncomingMessage(rawMessage);
  if (debugMode) addDebugMessage(`NORM: ${message}`);

  // First, detect any decision messages (caught/escaped)
  const decision = detectDecision(message);
  if (decision) {
    const by = decision.by || sender || (line.tags && (line.tags["display-name"] || line.tags.username));
    const targetSlug = decision.pokemonName ? normalizeSlug(decision.pokemonName) : null;

    if (currentEncounter) {
      const currentSlug = normalizeSlug(currentEncounter.pokemon.displayName || currentEncounter.pokemon.name);
      if (!targetSlug || targetSlug === currentSlug) {
        applyDecision(decision.type, by);
        return;
      }
    }
  }

  const encounterName = extractEncounterName(message);
  if (encounterName) {
    const durationMs = parseDurationFromMessage(message);
    const receivedAt = performance.now();
    const enc = {
      name: encounterName,
      sender,
      message,
      durationMs,
      receivedAt,
    };
    if (debugMode) addDebugMessage(`[RECV] ${sender} spawned ${encounterName} dur=${durationMs}ms at ${new Date().toLocaleTimeString()}`);
    queueEncounter(enc);
  }
}

// HP countdown control — drains the HP bar until a decision (caught/escaped) arrives
function startHpCountdown(totalDurationMs, startTs) {
  if (countdownRaf) {
    cancelAnimationFrame(countdownRaf);
    countdownRaf = null;
  }

  countdownStartTs = typeof startTs === "number" ? startTs : performance.now();
  countdownDuration = totalDurationMs;
  countdownActive = true;

  function tick(now) {
    const elapsed = now - countdownStartTs;
    const pct = Math.max(0, 100 * (1 - elapsed / countdownDuration));
    setHpPercent(pct);

    if (pct <= 0) {
      countdownActive = false;
      countdownRaf = null;
      onCountdownFinish();
      return;
    }

    countdownRaf = requestAnimationFrame(tick);
  }

  // initialize to current percentage immediately (avoid flicker)
  const now = performance.now();
  const initPct = Math.max(0, 100 * (1 - (now - countdownStartTs) / countdownDuration));
  setHpPercent(initPct);

  countdownRaf = requestAnimationFrame(tick);
}

function stopHpCountdown() {
  if (countdownRaf) {
    cancelAnimationFrame(countdownRaf);
    countdownRaf = null;
  }
  countdownActive = false;
}

function onCountdownFinish() {
  // No explicit decision arrived during countdown; hide after a short pause
  dom.battleMessage.textContent = "Time expired";
  hideTimeoutId = window.setTimeout(() => {
    hideScene();
  }, 1400);
}

function applyDecision(type, by) {
  if (!currentEncounter || currentEncounter.decisionOccurred) return;
  currentEncounter.decisionOccurred = true;
  stopHpCountdown();

  const currentPct = parseFloat(dom.hpFill.style.width) || 0;
  const startTs = performance.now();
  const animDuration = 700;

  function animate(now) {
    const t = Math.min(1, (now - startTs) / animDuration);
    const newPct = Math.max(0, currentPct * (1 - t));
    setHpPercent(newPct);

    if (t < 1) {
      requestAnimationFrame(animate);
      return;
    }

    if (type === "caught") {
      dom.battleMessage.classList.add("caught");
      dom.battleMessage.textContent = by
        ? `${currentEncounter.displayName} was caught by ${by}!`
        : `${currentEncounter.displayName} was caught!`;
    } else {
      dom.battleMessage.classList.add("escaped");
      dom.battleMessage.textContent = `${currentEncounter.displayName} escaped!`;
    }

    hideTimeoutId = window.setTimeout(() => {
      hideScene();
    }, 4800);
  }

  requestAnimationFrame(animate);
}

function hideScene() {
  stopHpCountdown();
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }

  dom.battleScene.className = "battle-scene hidden";
  dom.battleScene.hidden = true;
  // show the setup card only when no channel has been configured
  dom.setupCard.style.display = channel ? "none" : "";
  setHpPercent(100);
  dom.battleMessage.classList.remove("caught", "escaped");

  // clear sprite and handlers to stop any GIF animation and avoid stale handlers
  if (dom.pokemonSprite) {
    dom.pokemonSprite.onerror = null;
    dom.pokemonSprite.onload = null;
    try { if (dom.pokemonSprite.classList) dom.pokemonSprite.classList.remove('pixelated'); } catch (e) { }
    dom.pokemonSprite.src = "";
    const wrap = dom.pokemonSprite.parentElement && dom.pokemonSprite.parentElement.classList && dom.pokemonSprite.parentElement.classList.contains('pokemon-sprite-wrap')
      ? dom.pokemonSprite.parentElement
      : null;
    if (wrap) {
      wrap.style.width = "";
      wrap.style.transform = "";
    }
    // reset HP fill to full
    try { setHpPercent(100); } catch (e) { }
  }

  currentEncounter = null;
  activeEncounter = false;
  void playNextEncounter();
}

function detectDecision(message) {
  if (!message) return null;

  const caughtMatch = message.match(/(?:^|\s)([^\s]+)\s+caught\s+(?:a\s+|the\s+)?(.+?)(?:[!.,]|$)/i);
  if (caughtMatch) {
    return { type: "caught", by: caughtMatch[1], pokemonName: caughtMatch[2] };
  }

  if (/\b(caught|caught it|was caught|has been caught)\b/i.test(message)) {
    return { type: "caught" };
  }

  if (/\b(escaped|ran away|got away|fled|was not caught|not caught)\b/i.test(message)) {
    return { type: "escaped" };
  }

  return null;
}

function startChatClient(targetChannel) {
  if (twitchState.socket && twitchState.socket.readyState <= WebSocket.OPEN) {
    twitchState.socket.close();
  }

  setConnectionState("Connecting");

  const anonymousNick = `justinfan${Math.floor(10000 + Math.random() * 90000)}`;
  const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
  twitchState.socket = socket;

  socket.addEventListener("open", () => {
    socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
    socket.send("PASS SCHMOOPIIE");
    socket.send(`NICK ${anonymousNick}`);
    socket.send(`JOIN #${targetChannel}`);
    setConnectionState("Connected");
  });

  socket.addEventListener("message", (event) => {
    const lines = String(event.data).split("\r\n").filter(Boolean);

    for (const rawLine of lines) {
      if (rawLine.startsWith("PING")) {
        socket.send(rawLine.replace("PING", "PONG"));
        continue;
      }

      const parsedLine = parseIrcLine(rawLine);

      if (parsedLine.command === "PRIVMSG") {
        const sender = parsedLine.tags["display-name"] || parsedLine.prefix.split("!")[0] || "chat";
        const message = parsedLine.trailing;
        if (debugMode) addDebugMessage(`${sender}: ${message}`);
        handlePrivmsg(parsedLine);
      }
    }
  });

  socket.addEventListener("close", () => {
    setConnectionState("Disconnected");

    if (twitchState.socket === socket) {
      scheduleReconnect(targetChannel);
    }
  });

  socket.addEventListener("error", (error) => {
    console.error(error);
    setConnectionState("Connection error");
  });
}

async function init() {
  window.PokeCatchOverlay = {
    simulateEncounter,
    forceDecision: (type, by) => {
      try {
        applyDecision(type, by);
      } catch (e) {
        console.error(e);
      }
    },
    simulateRaw: (raw, displayName = "PokemonCommunityGame") => {
      try {
        const parsed = { tags: { "display-name": displayName }, prefix: `${displayName}!bot`, trailing: raw };
        handlePrivmsg(parsed);
      } catch (e) {
        console.error(e);
      }
    },
  };

  // load per-pokemon overrides (non-blocking but awaited so demo uses them)
  try {
    await loadSpriteOverrides();
  } catch (e) {
    /* ignore */
  }

  /***************************
   * Tuning UI and helpers
   * Adds an inline control panel for fast per-pokemon tuning
   ***************************/

  function _parseMatrixTransform(transform) {
    if (!transform || transform === 'none') return { x: 0, y: 0 };
    const m = transform.match(/matrix\(([-0-9e., ]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(s => parseFloat(s.trim()));
      return { x: Math.round(parts[4] || 0), y: Math.round(parts[5] || 0) };
    }
    const m3 = transform.match(/matrix3d\(([-0-9e., ]+)\)/);
    if (m3) {
      const parts = m3[1].split(',').map(s => parseFloat(s.trim()));
      return { x: Math.round(parts[12] || 0), y: Math.round(parts[13] || 0) };
    }
    return { x: 0, y: 0 };
  }

  async function ensureAlphabetListLoaded() {
    const names = await fetchAlphabetList();
    if (typeof window._populateTunePokemonList === 'function') {
      window._populateTunePokemonList(names);
    }
    return names;
  }

  async function tuneToIndex(index) {
    const names = await ensureAlphabetListLoaded();
    if (!Array.isArray(names) || names.length === 0) return null;

    const safeIndex = ((index % names.length) + names.length) % names.length;
    window._tuningIndex = safeIndex;
    return window.PokeCatchOverlay.tune(names[safeIndex]);
  }

  async function stepTuningPokemon(step) {
    const names = await ensureAlphabetListLoaded();
    if (!Array.isArray(names) || names.length === 0) return null;

    let index = typeof window._tuningIndex === 'number' ? window._tuningIndex : names.indexOf(window._tuningSlug);
    if (index < 0) index = 0;
    return tuneToIndex(index + step);
  }

  function setupTuneUI() {
    const panel = document.getElementById('tunePanel');
    if (!panel) return;
    panel.classList.remove('hidden');

    const slugEl = panel.querySelector('#tuneSlug');
    const indexEl = panel.querySelector('#tuneIndex');
    const pokemonInput = panel.querySelector('#tunePokemonInput');
    const pokemonList = panel.querySelector('#tunePokemonList');
    const jumpBtn = panel.querySelector('#tuneJump');
    const connectFolderBtn = panel.querySelector('#tuneConnectFolder');
    const widthRange = panel.querySelector('#tuneWidthRange');
    const widthNum = panel.querySelector('#tuneWidthNum');
    const oxRange = panel.querySelector('#tuneOffsetXRange');
    const oxNum = panel.querySelector('#tuneOffsetXNum');
    const oyRange = panel.querySelector('#tuneOffsetYRange');
    const oyNum = panel.querySelector('#tuneOffsetYNum');
    const replayBtn = panel.querySelector('#tuneReplay');
    const prevBtn = panel.querySelector('#tunePrev');
    const saveNextBtn = panel.querySelector('#tuneSaveNext');
    const nextBtn = panel.querySelector('#tuneNext');

    function populateTunePokemonList(names) {
      if (!pokemonList || !Array.isArray(names)) return;
      if (pokemonList.dataset.count === String(names.length)) return;

      pokemonList.textContent = '';
      const fragment = document.createDocumentFragment();
      names.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        fragment.appendChild(option);
      });
      pokemonList.appendChild(fragment);
      pokemonList.dataset.count = String(names.length);
    }

    window._populateTunePokemonList = populateTunePokemonList;

    function readWrap() {
      const img = dom.pokemonSprite;
      if (!img) return null;
      return img.parentElement && img.parentElement.classList && img.parentElement.classList.contains('pokemon-sprite-wrap')
        ? img.parentElement
        : img;
    }

    function getComputedOffsets(wrap) {
      if (!wrap) return { ox: 0, oy: 0 };
      const style = window.getComputedStyle(wrap);
      const transform = style.transform || style.webkitTransform || 'none';
      const parsed = _parseMatrixTransform(transform);
      if (parsed.x || parsed.y) return { ox: parsed.x, oy: parsed.y };
      const varX = wrap.style.getPropertyValue('--pokemon-sprite-offset-x') || style.getPropertyValue('--pokemon-sprite-offset-x') || '';
      const varY = wrap.style.getPropertyValue('--pokemon-sprite-offset-y') || style.getPropertyValue('--pokemon-sprite-offset-y') || '';
      const ox = varX ? Math.round(parseFloat(varX) || 0) : 0;
      const oy = varY ? Math.round(parseFloat(varY) || 0) : 0;
      return { ox, oy };
    }

    function updateTunePanel() {
      const slug = window._tuningSlug || (currentEncounter && currentEncounter.pokemon && normalizeSlug(currentEncounter.pokemon.name)) || '';

      // If we don't yet have an alphabet list, fetch it asynchronously and initialize tuning state.
      if (!Array.isArray(window._alphabetList) || window._alphabetList.length === 0) {
        ensureAlphabetListLoaded().then((names) => {
          if (Array.isArray(names) && names.length) {
            let startSlug = window._tuningSlug || (typeof demoPokemon === 'string' ? normalizeSlug(demoPokemon) : null);
            if (!startSlug) startSlug = names[0];
            let idx = names.indexOf(startSlug);
            if (idx === -1) idx = 0;
            window._tuningIndex = idx;
            window._tuningSlug = names[idx];
            // render the encounter for the chosen slug
            void window.PokeCatchOverlay.tune(names[idx]);
            // refresh panel after a short delay
            setTimeout(updateTunePanel, 240);
          }
        }).catch((e) => { if (debugMode) addDebugMessage(`[ALPHA] update failed: ${e.message}`); });
        slugEl.textContent = slug || '-';
        indexEl.textContent = '-';
        return;
      }

      slugEl.textContent = slug || '-';
      if (pokemonInput) {
        pokemonInput.value = slug || '';
      }
      indexEl.textContent = Array.isArray(window._alphabetList) && typeof window._tuningIndex === 'number'
        ? `${window._tuningIndex + 1}/${window._alphabetList.length}`
        : '-';

      populateTunePokemonList(window._alphabetList || []);
      const { map } = getSpriteVariantInfo();
      const override = slug ? (map[slug] || {}) : {};
      const widthVal = override.width !== undefined ? override.width : 0;
      const oxVal = override.offsetX !== undefined ? override.offsetX : 0;
      const oyVal = override.offsetY !== undefined ? override.offsetY : 0;

      widthRange.value = widthVal; widthNum.value = widthVal;
      oxRange.value = oxVal; oxNum.value = oxVal;
      oyRange.value = oyVal; oyNum.value = oyVal;
      syncTuneSaveStatus();
    }

    function applyFromUI() {
      const w = parseInt(widthNum.value, 10) || undefined;
      const ox = parseInt(oxNum.value, 10) || 0;
      const oy = parseInt(oyNum.value, 10) || 0;
      window.PokeCatchOverlay.setTempOverride({ width: w, offsetX: ox, offsetY: oy });
    }

    widthRange.addEventListener('input', (e) => { widthNum.value = e.target.value; applyFromUI(); });
    widthNum.addEventListener('change', (e) => { widthRange.value = e.target.value; applyFromUI(); });
    oxRange.addEventListener('input', (e) => { oxNum.value = e.target.value; applyFromUI(); });
    oxNum.addEventListener('change', (e) => { oxRange.value = e.target.value; applyFromUI(); });
    oyRange.addEventListener('input', (e) => { oyNum.value = e.target.value; applyFromUI(); });
    oyNum.addEventListener('change', (e) => { oyRange.value = e.target.value; applyFromUI(); });

    async function jumpToSelectedPokemon() {
      const value = pokemonInput && pokemonInput.value ? pokemonInput.value.trim() : '';
      if (!value) return null;
      const tuned = await window.PokeCatchOverlay.tune(value);
      updateTunePanel();
      return tuned;
    }

    replayBtn.addEventListener('click', async () => {
      if (window._tuningSlug) {
        await window.PokeCatchOverlay.tune(window._tuningSlug);
      }
    });

    if (pokemonInput) {
      pokemonInput.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await jumpToSelectedPokemon();
      });
    }

    if (jumpBtn) {
      jumpBtn.addEventListener('click', async () => {
        await jumpToSelectedPokemon();
      });
    }

    if (connectFolderBtn) {
      connectFolderBtn.addEventListener('click', async () => {
        await ensureProjectDirectoryHandle({ forcePrompt: true });
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        await stepTuningPokemon(-1);
        updateTunePanel();
      });
    }

    saveNextBtn.addEventListener('click', async () => {
      applyFromUI();
      const saved = await saveSpriteOverridesToDisk();
      if (!saved || !saved.saved) return;
      await stepTuningPokemon(1);
      updateTunePanel();
    });

    nextBtn.addEventListener('click', async () => {
      await stepTuningPokemon(1);
      updateTunePanel();
    });

    window._updateTunePanel = updateTunePanel;
    void checkLocalSaveService(true).then(() => {
      syncTuneSaveStatus();
    });
    void readStoredProjectDirectoryHandle().then((handle) => {
      if (handle) {
        projectDirectoryHandle = handle;
      }
      syncTuneSaveStatus();
    });
    updateTunePanel();
  }

  async function fetchAlphabetList() {
    if (Array.isArray(window._alphabetList) && window._alphabetList.length > 0) return window._alphabetList;
    try {
      const resp = await fetch('https://pokeapi.co/api/v2/pokemon?limit=2000');
      if (!resp.ok) {
        if (debugMode) addDebugMessage(`[ALPHA] fetch failed: ${resp.status}`);
        window._alphabetList = [];
        return window._alphabetList;
      }
      const j = await resp.json();
      const names = Array.from(new Set((j.results || []).map(r => r.name)));
      names.sort((a, b) => a.replace(/-/g, ' ').localeCompare(b.replace(/-/g, ' ')));
      window._alphabetList = names;
      if (debugMode) addDebugMessage(`[ALPHA] loaded ${names.length} names`);
      return names;
    } catch (e) {
      if (debugMode) addDebugMessage(`[ALPHA] failed: ${e.message}`);
      window._alphabetList = [];
      return window._alphabetList;
    }
  }

  if (tuningMode) {
    try {
      (async () => {
        const names = await ensureAlphabetListLoaded();
        // determine starting slug: existing tuning slug, demoPokemon, or first in list
        let startSlug = window._tuningSlug || (typeof demoPokemon === 'string' ? normalizeSlug(demoPokemon) : null);
        if (!startSlug && Array.isArray(names) && names.length) startSlug = names[0];
        if (startSlug && Array.isArray(names) && names.length) {
          let idx = names.indexOf(startSlug);
          if (idx === -1) idx = 0;
          window._tuningIndex = idx;
          window._tuningSlug = names[idx];
          await window.PokeCatchOverlay.tune(names[idx]);
        }
        setTimeout(setupTuneUI, 300);
      })();
    } catch (e) { /* ignore */ }
  }

  // Tuning helpers: allow interactive per-pokemon adjustments during tuning session.
  window.PokeCatchOverlay.tune = async function (name) {
    const rawName = String(name || demoPokemon || 'pikachu').trim();
    const slug = normalizeSlug(rawName);
    if (!slug) return null;

    window._tuningSlug = slug;
    if (Array.isArray(window._alphabetList) && window._alphabetList.length > 0) {
      const idx = window._alphabetList.indexOf(slug);
      if (idx !== -1) {
        window._tuningIndex = idx;
      }
    }

    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }

    stopHpCountdown();
    clearEncounterQueue();
    activeEncounter = true;

    try {
      const pokemon = await fetchPokemonData(rawName);
      renderEncounter(pokemon, {
        name: rawName,
        sender: 'tuning',
        message: `A WILD ${formatDisplayName(pokemon.displayName || pokemon.name).toUpperCase()} APPEARED`,
        durationMs: countdownDuration,
        receivedAt: performance.now(),
      });
    } catch (error) {
      console.error(error);
      syncTuneSaveStatus(`Could not load ${rawName}.`, 'error');
      return null;
    }

    if (typeof window._updateTunePanel === 'function') window._updateTunePanel();
    return slug;
  };

  window.PokeCatchOverlay.saveAndNext = async function () {
    const saved = await saveSpriteOverridesToDisk();
    if (!saved || !saved.saved) return saved;

    const next = await stepTuningPokemon(1);
    return Object.assign({}, saved, { next });
  };

  window.PokeCatchOverlay.saveOverrides = saveSpriteOverridesToDisk;

  window.PokeCatchOverlay.getPendingExport = function () {
    return window._pendingExport || null;
  };

  window.PokeCatchOverlay.setTempOverride = function (o) {
    const slug = window._tuningSlug || (currentEncounter && currentEncounter.pokemon && normalizeSlug(currentEncounter.pokemon.name));
    if (!slug) return null;
    const img = dom.pokemonSprite;
    const src = img && img.src ? String(img.src).toLowerCase() : '';
    const isImgAnimated = src.endsWith('.gif') || src.includes('/ani/');
    const map = isImgAnimated ? spriteOverrides : staticSpriteOverrides;
    const entry = Object.assign({}, map[slug] || {});
    if (o.width !== undefined) entry.width = o.width;
    if (o.offsetX !== undefined) entry.offsetX = o.offsetX;
    if (o.offsetY !== undefined) entry.offsetY = o.offsetY;
    map[slug] = entry;
    const wrap = img && img.parentElement && img.parentElement.classList && img.parentElement.classList.contains('pokemon-sprite-wrap') ? img.parentElement : img;
    try { applySpriteSizing(slug, dom.pokemonSprite, wrap, isImgAnimated); } catch (e) { /* ignore */ }
    if (debugMode) addDebugMessage(`[TUNE] temp override for ${slug} (${isImgAnimated ? 'animated' : 'static'}) -> ${JSON.stringify(entry)}`);
    return entry;
  };

  window.PokeCatchOverlay.getTempOverride = function (slug) {
    if (!slug) slug = window._tuningSlug;
    if (!slug) return null;
    const key = String(slug).toLowerCase();
    const { map } = getSpriteVariantInfo();
    return map[key] || null;
  };

  window.PokeCatchOverlay.listOverrides = function () {
    // merge animated/general overrides with static overrides; static entries take precedence
    return Object.assign({}, spriteOverrides, staticSpriteOverrides);
  };

  window.PokeCatchOverlay.exportOverride = function (slug) {
    if (!slug) slug = window._tuningSlug;
    if (!slug) return null;
    const key = String(slug).toLowerCase();
    const { map, targetFile } = getSpriteVariantInfo();
    const o = map[key] || null;
    return o ? { [slug]: o, targetFile } : null;
  };

  // If the user supplied ?spriteSize=NN, apply it as a CSS variable so the sprite is constrained.
  if (spriteSize) {
    try {
      document.documentElement.style.setProperty("--pokemon-sprite-size", `${spriteSize}px`);
      // when explicit pixel size is provided, ensure no additional auto-scaling
      document.documentElement.style.setProperty("--pokemon-sprite-scale", "1");
      if (debugMode) addDebugMessage(`[SPRITE] size ${spriteSize}px`);
    } catch (e) {
      console.warn("Failed to apply spriteSize", e);
    }
  }

  // If animated and no explicit spriteSize was provided, scale default sprite size down by 50%.
  try {
    if (animated) {
      if (!spriteSize) {
        document.documentElement.style.setProperty("--pokemon-sprite-scale", "0.5");
        if (debugMode) addDebugMessage("[SPRITE] animated auto-scale 0.5");
      } else {
        document.documentElement.style.setProperty("--pokemon-sprite-scale", "1");
      }

      // Determine offsets: prefer animated-specific params, fall back to legacy/global, then to animated defaults.
      const defaultAnimatedOffsetX = 100; // move right
      const defaultAnimatedOffsetY = -45; // move up slightly
      const appliedOffsetX = typeof spriteOffsetXAnimated === "number"
        ? spriteOffsetXAnimated
        : (typeof spriteOffsetX === "number" ? spriteOffsetX : defaultAnimatedOffsetX);
      const appliedOffsetY = typeof spriteOffsetYAnimated === "number"
        ? spriteOffsetYAnimated
        : (typeof spriteOffsetY === "number" ? spriteOffsetY : defaultAnimatedOffsetY);
      document.documentElement.style.setProperty("--pokemon-sprite-offset-x", `${appliedOffsetX}px`);
      document.documentElement.style.setProperty("--pokemon-sprite-offset-y", `${appliedOffsetY}px`);
      if (debugMode) addDebugMessage(`[SPRITE] animated offset x:${appliedOffsetX}px y:${appliedOffsetY}px`);
    } else {
      document.documentElement.style.setProperty("--pokemon-sprite-scale", "1");

      // Static (non-animated) offsets: prefer static-specific params, then legacy/global, then zero.
      const defaultStaticOffsetX = 0;
      const defaultStaticOffsetY = 0;
      const appliedOffsetX = typeof spriteOffsetXStatic === "number"
        ? spriteOffsetXStatic
        : (typeof spriteOffsetX === "number" ? spriteOffsetX : defaultStaticOffsetX);
      const appliedOffsetY = typeof spriteOffsetYStatic === "number"
        ? spriteOffsetYStatic
        : (typeof spriteOffsetY === "number" ? spriteOffsetY : defaultStaticOffsetY);
      document.documentElement.style.setProperty("--pokemon-sprite-offset-x", `${appliedOffsetX}px`);
      document.documentElement.style.setProperty("--pokemon-sprite-offset-y", `${appliedOffsetY}px`);
      if (debugMode) addDebugMessage(`[SPRITE] static offset x:${appliedOffsetX}px y:${appliedOffsetY}px`);
    }
  } catch (e) {
    // ignore
  }
  if (!channel) {
    dom.channelName.textContent = "Missing ?channel=";
    setConnectionState("Awaiting setup");

    // show debug panel even when not connected if the debug flag is set
    if (debugMode && dom.debugPanel) {
      dom.debugPanel.classList.remove("hidden");
      dom.debugPanel.hidden = false;
    } else if (dom.debugPanel) {
      dom.debugPanel.classList.add("hidden");
      dom.debugPanel.hidden = true;
    }
    // show/hide tuning panel when tuning mode is enabled
    if (dom.tunePanel) {
      if (tuningMode) {
        dom.tunePanel.classList.remove('hidden');
        dom.tunePanel.hidden = false;
      } else {
        dom.tunePanel.classList.add('hidden');
        dom.tunePanel.hidden = true;
      }
    }

    if (demoMode) {
      window.setTimeout(() => {
        if (demoPokemon) simulateEncounter(demoPokemon);
        else simulateEncounter();
      }, 600);
    }

    return;
  }

  // hide the setup card immediately when a channel is provided — keep overlay empty until an encounter
  dom.setupCard.style.display = "none";

  const sanitizedChannel = channel.trim().replace(/^#/, "").toLowerCase();
  dom.channelName.textContent = sanitizedChannel;
  document.title = `${sanitizedChannel} · PokeCatch Overlay${dsMode ? " (DS)" : ""}`;
  if (demoMode) {
    window.setTimeout(() => {
      if (demoPokemon) simulateEncounter(demoPokemon);
      else simulateEncounter();
    }, 1200);
  }

  // show or hide debug panel based on URL param
  if (dom.debugPanel) {
    if (debugMode) {
      dom.debugPanel.classList.remove("hidden");
      dom.debugPanel.hidden = false;
    } else {
      dom.debugPanel.classList.add("hidden");
      dom.debugPanel.hidden = true;
    }
  }
  // show/hide tuning panel based on URL param
  if (dom.tunePanel) {
    if (tuningMode) {
      dom.tunePanel.classList.remove('hidden');
      dom.tunePanel.hidden = false;
    } else {
      dom.tunePanel.classList.add('hidden');
      dom.tunePanel.hidden = true;
    }
  }

  startChatClient(sanitizedChannel);
}

init();