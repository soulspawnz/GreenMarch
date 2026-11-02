# Native engine: features and limits

GreenMarch currently supports **one native level: Fun 1, Just dig!** Its terrain,
lemming animations, entrance, exit and SID music use the original C64 graphics
and audio. Other native levels and skills are still to come.

## Gameplay

GreenMarch's JavaScript simulation handles spawning, walking, falling, Digger,
terrain changes, rescues, the timer and results. There are ten lemmings, ten
Diggers, five minutes and a 10% rescue target. Walking does not deform the soil.
Tapping or clicking a walking lemming assigns Digger.

Movement is an initial recreation, not a frame-perfect port. Collision, stepping,
falling and sprite placement need further comparison and refinement. Passing a
level or browser check does not establish exact agreement with the original.

## Graphics and music

The renderer uses the original terrain, 300 animation poses and entrance/exit
graphics. Canvas displays the multicolor pixels with nearest-neighbor scaling.
The Digger animation uses its downward-digging poses; an earlier visual bug
incorrectly displayed the Blocker animation while the lemming was digging.
Twelve complete playtests (six desktop and six Chromium touch simulations)
verified Digger assignment, soil removal, descent and the displayed poses.
Six placements won with 70-90% rescued; six lost. Those routing results are
separate from the skill/animation checks, which passed in all twelve runs.
Level configuration and SHA-256 asset identities are in
[level.json](../native/assets/level.json).

Music plays through a separate audio-only SID player and the standalone reSID
component. This is independent of JavaScript gameplay; the native page does not
load a full C64 machine, ROMs or disks. Audio can differ between SID/filter models.
Component source and license notices remain in [vendor/jssid](../vendor/jssid).

## Adaptive Player

Training runs in a separate simulation worker, leaving the manual game intact.
It explores eight authored Digger placements and retains their observed returns.
This is a small placement learner, not a general solver or neural network.

Each completed attempt is independently verified using its recorded tick inputs
before being saved. Replay best plays those inputs visibly through the engine;
replaying a winner does not count as another training discovery.

Local experience survives reload. Stop terminates the active worker and settles
the parent job. Export downloads the experience archive. Import, richer graphs,
other levels and additional skills are outside this first phase.

Training found a **9/10 rescue (90%)**, reproduced by a complete visible replay.
That meets the original 10% target; it is not a claim of 100% rescued.

## Browser checks

The engine tests cover level rules, asset identities, deterministic snapshots,
recorded replay, falling and standalone SID audio. Browser tests cover mouse
assignment, terrain digging, audio output, mute, pause, worker Stop, manual-game
preservation, training, reload and full visible replay. The native page makes
no full-C64 runtime or disk requests.

The published build also passed touch gameplay on two Chromium phone profiles:
390 x 844 at DPR 3 and 412 x 915 at DPR 2.625. Both assigned a Digger by touch,
changed terrain, played SID audio, passed mute, pause, panning and rotation checks,
and completed the level with **8/10 rescued**. Restart restored ten Diggers.
Neither run produced browser errors or failed HTTP responses. These are mobile
browser simulations; physical phones and iOS Safari remain untested.

Repeatable commands and test inputs are documented in [DEVELOPMENT.md](DEVELOPMENT.md).
Runtime screenshots and logs remain private.

## Original C64 reference

The separate [reference version](../emulator-reference.html) has all 100 original
levels and the original loading, title, manual-code, briefing and result screens.
It runs the original game using VICE. Those levels and non-level screens have
not all been recreated in the native engine.
