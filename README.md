# PokeCatch Overlay

Static OBS browser-source overlay for Pokemon Community Game encounter messages on Twitch chat.

## What it does

- Connects to a Twitch channel's chat directly in the browser with `tmi.js`
- Watches for wild-Pokemon encounter style messages
- Looks up the Pokemon in PokeAPI to get its numeric ID
- Renders a Gen 3-inspired battle scene with the sprite from the PokeAPI sprites repository
- Works as a plain static site, so it can be hosted on GitHub Pages

## URL parameters

Use one of these query parameters when you add the page to OBS:

- `?channel=your_twitch_name`
- `?user=your_twitch_name`
- `?username=your_twitch_name`

Optional flags:

- `?animated=true` — use animated GIF sprites from Pokemon Showdown when available. The overlay will try `https://play.pokemonshowdown.com/sprites/ani/{pokemon-name}.gif` and fall back to the static PokeAPI sprite if the GIF is missing.

Example with animation and debug:

```text
https://YOUR_GITHUB_PAGES_URL/?channel=addie&animated=true&debug=true
```

Example:

```text
https://YOUR_GITHUB_PAGES_URL/?channel=addie
```

For layout testing without waiting for chat traffic:

```text
https://YOUR_GITHUB_PAGES_URL/?channel=addie&demo=1
```

For sprite tuning with direct local JSON saves:

```text
http://127.0.0.1:4173/?channel=addie&animated=true&demo=1&tuning=true
```

If you want fully automatic local file writes, start the helper service first:

```text
node local-save-server.js
```

Then `Save & Next` writes the full override map to `sprite-overrides.json` when the current sprite is animated, or `static-sprite-overrides.json` when it is not. If the local save service is not running, the page falls back to `Connect Folder` and the browser File System Access API.

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings, enable GitHub Pages from the main branch root.
3. Use the published Pages URL as your OBS browser source.
4. Append your Twitch name as the query parameter.

## Notes

- The overlay uses `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/<id>.png` for the battle sprite image.
- Encounter parsing is pattern-based because Pokemon Community Game chat wording can vary.
- If a Pokemon name is not resolved by PokeAPI exactly, that encounter is skipped and the overlay keeps listening.
- You can trigger a test encounter from the browser console with `window.PokeCatchOverlay.simulateEncounter("bulbasaur", "A wild Bulbasaur appeared!")`.