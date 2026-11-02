# GreenMarch browser validation

Preserve the user's live tabs and run regression checks in a separate browser.
Use the Cortex runner in the Nexus environment. Keep captures and runtime logs
private; publish concise, accurate results and limitations.

## Native gameplay

- Run `test/presentation-browser.mjs` for mode switching, exact paused-state
  preservation, active playback, audio, mute, completion and saved preference.
- Pass `enhanced` after the URL to the campaign browser and mobile suites to
  exercise the second renderer/audio path across all levels and phone profiles.
- The parallel campaign sweep uses a silent Web Audio sink and measures real
  rendered PCM. Keep that test-only setup distinct from speaker output. A running
  AudioContext with a stalled clock does not establish that audio is rendering.

Use installed Playwright and Chromium with explicit paths. Do not reinstall
existing dependencies. See [development commands](../../docs/DEVELOPMENT.md).

- Run `test/native.mjs` for deterministic engine, asset and audio checks.
- Run `test/native-campaign.mjs` for all 100 configurations, binary identities,
  inventories, animation bounds, baseline simulations and snapshots.
- Run `test/native-tutorials.mjs` for seven complete solutions covering all eight
  skills and their deterministic replays.
- Run `test/native-campaign-browser.mjs` for all 100 UI starts and actual SID
  output, split between desktop and Chromium touch profiles.
- Run `test/native-campaign-play.mjs` for complete Floater/touch and Basher/mouse
  tutorial playthroughs using normal interface actions.
- Run `test/native-browser.mjs` for mouse assignment, terrain changes, original
  SID output, pause/mute, training isolation, active Stop, replay and persistence.
- Run `test/native-mobile.mjs` for touch assignment, panning, audio, rotation,
  actual level completion and restart on two phone-size profiles.
- For skill regressions, verify both simulation behavior and actual drawn poses.
  `test/digger-playtests.mjs` runs twelve complete desktop/touch games and checks
  Digger inventory, descent, terrain changes and absence of Blocker poses. Poor
  placement may lose a level without indicating the wrong skill was assigned.
- Distinguish Chromium touch simulation from physical phones and iOS Safari.
- Verify actual PCM after a user gesture; an AudioContext or meter alone is
  insufficient. Verify pause and mute silence, then resumed output.
- Retain a complete visible run, its actual result and recorded inputs. A saved
  result screen or a rescue counter alone does not prove completion.
- Keep native and original-reference results distinct. Native Fun 1 training
  reaches 100%; earlier movement models remain archived. This does not establish
  that every campaign level has been solved or that physics are frame-perfect.
- Run `tools/verify-media.mjs` for original media and pinned dependency identities.

## Reference version

Run the existing `test/browser.mjs`, `test/boot-browser.mjs` and campaign suites
against `emulator-reference.html` as appropriate. Keep a fresh core per selected
screen/restart and preserve explicit teardown checks. Allow audio and input
checks to wait for emulated-frame progress under CPU load.

Verify matching original briefings, actual startup and SID audio for campaign
entries. Starting all 100 levels does not mean solving all 100 puzzles.

## Presentation and privacy

For requested live demonstrations, use the supported in-app browser controls
and preserve the actual result tab. Inspect saved screenshots before publication;
a browser capture may be blank despite a ready DOM. Keep public copy focused on
play, features and honest limitations; internal research tooling and preparation
methods belong in private project notes.
