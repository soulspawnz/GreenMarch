# GreenMarch verification

## Observed original gameplay

The supplied C64 program displayed the original first-level briefing: ten
lemmings, ten percent required, release rate fifty and five minutes. Browser
inputs selected the original digger and opened the terrain. Eight rescues were
observed first; another digger opened the right-hand ledge. The original result
screen subsequently reported all ten lemmings rescued and supplied the next-level
access code. The 100% screen was visually verified and retained as `success.bin`.

This was a staged browser run using preserved native snapshots between probes.
It is not a continuous cycle-timed input replay or a full-campaign completion.
No gameplay RAM, rescue count or timer was patched. Controls entered through the
emulated keyboard/joystick. A separate untouched attempt reached the original
zero-percent timeout screen, retained as `failure.bin`.

## Automated browser checks

A later continuous live run in the visible Codex in-app browser also reached
the original 100% success screen, using two diggers and normal controls without
restoring intermediate states. See [LIVE_PLAYTEST.md](LIVE_PLAYTEST.md).

`test/browser.mjs` passed in a separate Chromium using the actual local build:

- Native C64 skill index 7 after selecting Digger (key 8).
- Original joystick cursor moves; mouse target reached within one coordinate.
- Real post-mixer SID AC output measured (the retained run measured 0.05059 RMS).
- Actual mute and pause silence, stopped frame counter on pause, resumed frames,
  original default skill on restart, native fullscreen entry/exit.
- Original title, manual-code prompt, code submission, briefing and result screens.
- 390-pixel mobile layout without horizontal overflow, held touch movement and
  released movement after touch cancellation.
- Zero page errors, zero external HTTP requests and zero failed HTTP responses.

Private screenshots and the complete browser-results JSON are under this chat's
`visualizations/.../lemmings/` directory. They distinguish the verified original
result checkpoint from a newly completed automated run.

## Runtime and lifecycle

The focused `test/boot-browser.mjs` also passed: actual serial disk boot, original
loader intro with measured SID audio, physical Space advancing to the original
release-information screen, fresh-core transition and zero external requests or
page errors. Audio was measured before advancing; the following information page
is silent.

Reusing one VICE instance across gameplay/title checkpoint loads produced an
observed native WebAssembly memory trap. Each selected screen and restart now
owns a fresh iframe/core. The old core pauses, releases inputs and closes its
AudioContexts before document reclamation. The complete browser checks passed
after this change, including repeated screen transitions.

Two documented local frontend patches disable the upstream CDN update probe and
avoid restarting VICE during iframe teardown. `vendor/emulatorjs/LOCAL_PATCHES.json`
records the modified digest; original upstream digests remain in its provenance.

The static server binds only to loopback. A separate review found no exploitable
integration vulnerabilities; traversal/dotfile/malformed URL probes returned 404.
The external update probe found by that review was removed, and the browser
request assertion passed afterward.

## Media integrity

`tools/verify-media.mjs` passed for all three original disks, seventeen pinned
frontend source files (including the documented local patch) and ten core/screen
assets. Original archive and loader identities remained unchanged.

## Limits

The full-campaign extension verified all 100 original briefing/gameplay starts
and all 100 quick-start restores, including measured post-mixer SID output for
every entry. The per-level summary is in `media/campaign-validation.json`.
Desktop/mobile regression, native next-level/restart/menu flows and full original
boot with intro audio passed on the campaign build. See `CAMPAIGN.md` for details.

The initial first-level rescue test is separate from the subsequent 100-level
campaign checks described in [CAMPAIGN.md](CAMPAIGN.md). Loading and starting
every original level is distinct from solving every puzzle or reaching every
ending. Gameplay uses the original C64 program with VICE/reSID; a custom
JavaScript gameplay-engine reimplementation is outside this milestone.
