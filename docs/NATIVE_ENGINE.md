# Native engine: features and limits

GreenMarch includes all **100 original C64 levels**: 25 each in Fun, Tricky,
Taxing and Mayhem. Every level has its original terrain, inventory, population,
rescue requirement, timer, entrances, exit, object graphics and SID music.
All levels are available from the campaign selector; progress stays in your browser.

## Gameplay

The JavaScript engine supports Climber, Floater, Bomber, Blocker, Builder, Basher,
Miner and Digger. Climbing and floating are permanent abilities. Builders add
stairs, destructive skills remove terrain, Blockers turn walkers, and Bombers
explode after a countdown. Walking does not deform the soil.

The engine handles multiple entrances, release rates, steel, directional walls,
water and lethal regions, pause, restart, results and campaign progression.
The renderer uses the original multicolor terrain, 300 animation poses and
animated object strips. Digger displays its downward-digging poses.

Movement, work timings, terrain cuts and object collision are an initial
recreation, **not a frame-perfect port**. All 100 layouts are included, but not
every puzzle has been solved or checked for exact agreement with the original.
More demanding routes may expose physics differences.

## Music

Original music runs through a separate audio-only 6502/SID player and reSID.
The native page loads no full C64 machine, ROMs or disks. Pause and mute silence
audio. Output can differ between SID/filter models. Component sources and
license notices remain in [vendor/jssid](../vendor/jssid).

## Adaptive Player

Training currently supports Fun 1. A separate worker explores eight authored
Digger placements while preserving the manual game. Completed attempts are
verified with their recorded simulation-tick inputs before being saved; replay
does not count as another training discovery. The current movement model finds
and reproduces a **10/10 rescue**.

Local experience survives reload. Earlier attempts and models are preserved as
an archive when movement changes; Export includes both current and archived
experience. Stop ends active training and preserves completed attempts. This is
a small placement learner, not a general solver. Import and richer graphs are
not implemented.

## Validation

Automated checks verify all 100 level configurations and binary asset identities,
inventories, animation bounds, complete waiting-only simulations and snapshots.
Seven tutorial solutions use ordinary skills and terrain observations, covering
all eight skills. They rescue **10/10, 10/10, 22/25, 10/10, 30/30, 28/30 and
13/25**, respectively, and each meets its original target and replays exactly.
Synthetic fixtures separately check steel, directional walls, water, falling,
explosions, blocking and permanent abilities.

Browser checks exercise all 100 level starts with actual SID output, and separate
checks cover mouse and touch assignment, terrain changes, audio, mute, pause,
training isolation, active Stop, persistence and complete replay. Phone tests use
Chromium touch profiles: both 390 x 844 and 412 x 915 complete Fun 1 with 10/10
rescued, including rotation and restart checks. Separate UI runs complete Fun 2
by touch (10/10) and Fun 5 by mouse (30/30). These are not physical-device or iOS
Safari checks. Startup checks do
not establish that all 100 puzzles are solvable with these physics.

Commands are documented in [DEVELOPMENT.md](DEVELOPMENT.md). Runtime logs and
test captures remain private.

## Original C64 reference

The separate [reference version](../emulator-reference.html) runs the original
game using VICE, including the original loading, title, manual-code, briefing
and result screens. Those non-level screens remain separate from the native
campaign's own menus and results.
