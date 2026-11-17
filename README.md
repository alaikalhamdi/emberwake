# emberwake

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/alaikalhamdi/emberwake/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/alaikalhamdi/emberwake/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Emberwake** is a top-down arena defence game for the browser. You are a firefly guarding the last Heartbloom in a night garden. Ten waves of gloom creatures come for it: drifting moths, lunging darters, husks that burst into mites, spore-spitters that circle at range, and finally the Gloomwarden. Shoot ember bolts with the mouse and flare-dash through danger. After each wave the bloom offers three boons, so every run builds differently. Collect nectar to heal the bloom and chain kills for score multipliers.

- **WASD / arrows**: fly · **mouse**: aim · **hold left click / Space**: shoot
- **right click / Shift**: flare dash (hurts foes, dodges harm) · **1 2 3**: pick a boon
- **P / Esc**: pause · **M**: sound · **R**: restart

Plain static files under `game/` with no build step, no libraries and no network requests. All art is drawn on canvas and all sound is synthesised with Web Audio.

## Run it

```sh
node serve.ts    # then open http://localhost:8080
```

Hand it in (writes `out/` with the dossier): `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
Retake the screenshots: `node serve.ts --port 8123` in one shell, then `node tools/capture.ts --port 8123`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tsm8jr3f&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
