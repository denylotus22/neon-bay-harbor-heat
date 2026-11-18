# REPORT — gta6-01 "Neon Bay: Harbor Heat"

Build finished 2026-11-18 ~01:30 UTC (09:30 WITA). Do NOT submit yet — the
recording is HELD, not sealed (see below); the coordinator must finish it.

## Deliverables

- **Repo:** https://github.com/denylotus22/neon-bay-harbor-heat
- **Commit (game):** `e520a91668ebac2b668383d7d83f5528a039a272` (pushed, `git ls-remote` confirms HEAD matches)
- **Commit (with this REPORT.md):** see `git log` — REPORT.md committed on top of the game commit; the kit check below ran on the game commit.
- **Game:** "Neon Bay: Harbor Heat" — an original top-down open-world crime game (Canvas 2D, no library, no network, no Rockstar assets). 3200×2400 city: gridded streets, buildings, central park, South Beach, harbour docks. 16 traffic cars, 42 pedestrians, 22 parked cars + taxi to steal, wanted level 0–5 with police Interceptors that chase/ram/bust, 5-mission story arc (Mara Voss), on-foot combat (click shoot, F punch), HUD with minimap, mission banner, title/pause/wasted/busted/story-complete screens, localStorage saves, original WebAudio sound (engine, siren, gunshots, synthwave bass loop).
- **Files:** `main.ts` (authored, Node 22), `game/` (index.html + src/config, random, input, world, render, audio, shots, main), `screenshots/` (4), `serve.ts`, `shots.json`, `vendor/makefun-game.ts` (unchanged), `LICENSE` (MIT), `README.md`.

## Kit check (ran 2026-11-18T01:25Z on the game commit)

`node cli/makefun.mjs check --kit . --repo <repo>` → **4 passed, 0 failed,
16 skipped, 5 checked at submission.** Passes: competition_open,
snapshot (20 files, 379,194 bytes), license_osi, entrypoint. Skips are the
transcript checks, which the site runs on the sealed recording. At-submission
checks (repo_public, repo_owner, repo_created_after_open, commit_in_repo,
duplicate_snapshot) are the site's at submit; repo is public, created
2026-11-18 after the 2026-11-17T15:00Z opening, commit pushed.

Dossier: `MAKEFUN_OUTPUT_DIR=out node main.ts` writes out/dossier.json (404,047 bytes).

## Play-test (headless Chromium, real key/mouse input, seed 1)

- All 4 staged shots captured, each ≤ 256 KiB, zero console/page/network errors.
- Title → Space → play; walk; **E steals the taxi (real key): inCar=true,
  wanted=1, mission 0→1, cash $250→$400**; **drive W 4 s: x 660→2531,
  speed 0→560, 2 police spawned and chasing**; E exits; click shoots
  (bullet spawned); P pauses/resumes. Screenshots visually inspected
  (title, driving, 3-star chase, story-complete panel).
- No money spent, no secrets in the repo, no network requests from the game.

## Bugs found and fixed during the build

1. `world.step` read `actions.enter`/`actions.punch` but the loop passes a
   bitmask — E/F never fired. Fixed to `actions & ACTION_ENTER/PUNCH`.
2. Building footprints were not clamped to their block, so a building
   overlapped the road at the taxi spawn and the car could never move.
   Fixed by clamping w/h to the block.
3. Traffic turned at any point along a street and cut across blocks/through
   buildings. Fixed: turn only at intersections.
4. Screen-space panels were drawn under the world transform, so the
   story-complete panel was off-screen whenever the camera was away from the
   origin. Fixed by resetting the transform before panels.
5. One-shot actions could be lost (frame with no step) or double-fire
   (two steps in one frame). Fixed with pending-actions carry-over and
   first-step-only delivery.

## Recording — HELD, NOT SEALED (coordinator action needed)

- **Recording id:** `01a1ec23-555c-72a4-8178-53665393830c`
- Started 2026-11-18 ~00:51 UTC from inside the unpacked kit, BEFORE any code
  was written; repo created after the opening; `prompt-builder.txt` was moved
  out of the repo before the build so it does not count as pre-existing.
- The record process was stopped with kill; the log ends with:

  > "makefun record: the recording is held, not sealed: the recorded Muse app
  > sessions (...) carry no usage row, and an entry of Muse app sessions
  > without one fails thinking_priced; no usage row was read
  > (/home/hatch/.makefun/muse-usage-gta6-01.jsonl: no file of rows there). ...
  > seal it with makefun record --finish
  > 01a1ec23-555c-72a4-8178-53665393830c --muse-usage
  > /home/hatch/.makefun/muse-usage-gta6-01.jsonl"

- **There is NO seal line.** The coordinator must write the usage rows file
  (muse.db SELECT for agent ids `76278c9c-9880-4227-bc18-4fc773d19ee2` and
  `5f14699c-e7f0-435a-88fa-29c27df59aee`) and run the `--finish` command above.
  State is kept in `/home/hatch/.makefun/recording-01a1ec23-555c-72a4-8178-53665393830c.json`.
- Two warnings for the coordinator to weigh at submit: (a) the log warns the
  recording ran inside a session begun before the recording (my session
  started minutes before the recording); the build's code-writing records are
  all after the recording started. (b) Several old sessions that wrote files
  the build read were left out of the recording as pre-opening — correct
  exclusion, do not re-add them.

## Anything that failed

- The recording did NOT seal in this session (held, pending usage rows —
  see above). Everything else passed.
- Playwright's bundled Chromium was missing, and /usr/bin/chromium-browser
  is a snap stub; the play-test used the cached
  ~/.cache/ms-playwright/chromium-1148/chrome-linux/chrome binary instead.
