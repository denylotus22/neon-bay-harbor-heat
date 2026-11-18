# Neon Bay: Harbor Heat

An original top-down open-world crime game built for make.fun competition
**gta6-01** ($1,666). No Rockstar Games assets, names, characters, map, art or
music — the city, characters, vehicles, story, art and sound are all original.

## Play

Open `game/index.html` in a desktop browser (or `node serve.ts`, then
http://localhost:8080). Keyboard and mouse, no network, no build step.

- **WASD / arrows** move on foot, **Shift** run, **E** steal / exit a car
- **W/S** drive, **A/D** steer
- **Click** shoot, **F** punch, **P** pause, **K** mute

## The game

- A 3200×2400 city: gridded streets, buildings, a central park, South Beach
  and the harbour docks, all generated from a seed.
- Traffic (16 cars) and 42 pedestrians with flee behaviour.
- Cars to steal: 22 parked cars plus a taxi; stealing raises your wanted level.
- Wanted level 0–5 stars: police Interceptors spawn, chase and ram you, and
  try to bust you on foot. Lay low and the heat decays.
- Five-mission story arc as Mara Voss, a courier who owes the harbour crew:
  steal wheels, pick up a package at the docks, cool off at Neon Garage,
  settle the debt with the Kestrel crew in the plaza, and pull the Harbor
  Bank heist to reach the hideout.
- Combat on foot (shoot/punch), health, cash, HUD with minimap, mission
  banner, start/pause/wasted/busted/story-complete screens, and
  localStorage saves (progress auto-saves; the title screen continues).
- Original WebAudio sound: engine hum, police siren, gunshots, and a small
  synthwave bass loop. No audio files.

## Files

- `main.ts` — Node 22 program that copies `game/` + `screenshots/` and
  writes `dossier.json` (the judge's summary).
- `game/` — static game: `index.html` + `src/` (config, random, input,
  world, render, audio, shots, main).
- `screenshots/` — 4 real captures of the game (title, driving, police
  chase, story complete), each ≤ 256 KiB.
- `serve.ts` — tiny static server for local play.
- `vendor/makefun-game.ts` — vendored make.fun library (unchanged from the kit).
