# Development, testing and deployment

## Native runtime

Run `npm start` with Node.js 18 or newer and open localhost:8768. No package
installation is needed. `index.html` and `native.html` run the native first level.

- `native/engine.mjs`: deterministic JavaScript gameplay and snapshots.
- `native/render.mjs`: canvas renderer for the original graphics.
- `native/sid-player.mjs`, `sid-cpu.mjs`, `sid-worklet.mjs`: original audio only.
- `native/learning-*`: isolated simulation training and exact tick-input replay.
- `native/main.mjs`: controls, transport, audio and local experience archive.
- `native/assets/level.json`: level configuration and asset identities.

Read [NATIVE_ENGINE.md](NATIVE_ENGINE.md) for supported features, validation and fidelity
limits. The initial recreation supports Fun 1 and Digger, not all 100 levels.

```sh
npm run test:native
npm run verify:media
```

`test/native-browser.mjs PLAYWRIGHT_ENTRY CHROMIUM_EXE PRIVATE_OUTPUT_DIR [URL]`
checks original SID PCM, mouse digging, pause/mute, native training/Stop, manual
state preservation, complete input replay, storage and mobile layout. It rejects
full C64 emulator/ROM/disk requests. Browser tools are installed separately;
tests take their explicit paths and keep runtime captures private.

`test/native-mobile.mjs PLAYWRIGHT_ENTRY CHROMIUM_EXE PRIVATE_OUTPUT_DIR [URL]`
tests the deployed game with real touch events in two Chromium mobile profiles
(390 x 844 and 412 x 915), including manual digger assignment, terrain destruction,
SID output, mute, pause, rotation, full level completion and restart. These are
browser simulations; they do not establish compatibility with physical phones or
iOS Safari. The default URL is the public GitHub Pages build.

`test/digger-playtests.mjs PLAYWRIGHT_ENTRY CHROMIUM_EXE PRIVATE_OUTPUT_DIR [URL]`
runs twelve complete games across six Digger placements using desktop mouse,
keyboard, Assign Digger and mobile touch input. It checks the consumed skill,
actual terrain removal, descent, displayed animation frames and final outcome.
Some placements lose the level; the check distinguishes a poor route from an
incorrect skill or animation. Its default URL is the local native build.

## Original reference build

`emulator-reference.html`, `machine.html`, `main.mjs`, `campaign-machine.mjs` and
`vendor/emulatorjs/` preserve the previous original-C64 implementation. It loads
the three source disks and verified native checkpoints. Its 100 startup/audio
checks do not mean every original puzzle was solved. Original source media and
vendor digests are still checked by `tools/verify-media.mjs`.

The earlier emulator Adaptive Player experiment is separate, remains unverified
for active-stop cleanup, and is not the player used by the native page. Native
learning uses a different database and preserves any older local experience.

## GitHub Pages and documentation

The root of `main` publishes to https://soulspawnz.github.io/GreenMarch/.
`.nojekyll` preserves the static files. The native runtime uses ordinary static
assets, browser modules and an AudioWorklet; no custom isolation headers are needed.

README updates follow [the presentation workflow](../skills/readme-maintenance/SKILL.md).
Original attribution and license details live in [ORIGINAL_MEDIA.md](ORIGINAL_MEDIA.md).
