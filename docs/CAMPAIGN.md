# Original C64 campaign

## Task contract

Deliverable: all 100 original C64 levels, organised as 25 levels in each of Fun,
Tricky, Taxing and Mayhem, accessible from GreenMarch with original terrain,
animation, skills, SID music/effects and native progression.

Preserve the original disks and game code. Use normal password/menu inputs and
native disk changes. Do not synthesize levels or patch gameplay RAM. Keep the
original boot, title, briefings and result screens available.

Acceptance: each catalogue entry reaches its matching original briefing and
enters gameplay; validate the three disk sides, representative SID output,
selected-level restart and campaign navigation. Distinguish loading validation
from actually solving all 100 puzzles.

## Implementation phases

1. Verify the original disk inventory and native level/password loading.
2. Add a full campaign selector, disk controls and selected-level restart.
3. Validate all original levels, document observed limits and publish changes.

## Original media and level loading

The unmodified D64 directory entries contain all 100 native level files: FA–FY,
TA–TY, XA–XY and MA–MY. `media/campaign.json` records each file's disk side,
byte count and SHA-256. `tools/build-campaign.mjs` verifies the source disks and
creates a deterministic ZIP containing their original bytes and an M3U playlist.

The disk loader needs common data from disk 1 side A before loading a level.
Its own on-screen prompt then identifies disk 2 side A or side B. GreenMarch
reads those displayed prompts and uses the core's native disk-control API. No
gameplay memory or disk content is rewritten.

The catalogue opens levels through the original password/menu code. Published
password lists contain several transcription differences; corrections are
recorded in `media/campaign-codes.json` and checked against the original game's
own next-level text and successful native loading.

Verified native briefing states supply quick starts. Each selection creates a
fresh iframe/core, restores the original machine state, selects its original
disk and checks the displayed level/rating before reporting readiness. The
complete original boot and ordinary password/disk loading remain available.

## Runtime correction

EmulatorJS 4.2.3 constructs its disk menu before initializing `allSettings`.
With three disks, applying the menu default therefore throws during startup.
The local frontend patch initializes settings first. Original frontend digests
and the patched digest remain in the vendor provenance and patch receipt.

Password key remapping, press and release now wait for emulated frames. Fixed
wall-clock delays could miss characters while multiple native cores were under
load. The original keyboard matrix and game code remain unchanged.

The original game resolved four transcription differences in the published
password data: Taxing 1 `IGDHKDIJFA`, Taxing 7 `HLLILAIHEL`, Taxing 19
`GDALCDJLKD`, and Mayhem 24 `JIFEKAAJDG`. All four were checked through the
native password loader and matching original briefings.

## Validation method

`test/campaign.mjs` checks every selected original briefing, enters gameplay,
verifies advancing native frames and observes post-mixer SID AC output above
0.001. It also checks that all three images are mounted and that no external
HTTP requests, failed HTTP responses or page errors occur. Raw captures and
per-level receipts remain private; native machine states used as game assets
have hashes in the catalogue.

`test/campaign-flow.mjs` separately checks original success-to-next-level
progression, current-level restart, the Next level button, physical password
typing (including F without entering fullscreen) and mobile campaign controls.
The desktop/mobile controls and complete disk-boot suites remain applicable.

These checks establish loading, gameplay startup, controls and sound. They do
not claim that every puzzle has been solved or every campaign ending reached.

## Verified result

All 100 catalogue entries passed original briefing identity, gameplay startup
and measured SID output checks. All 100 installed quick starts then passed the
same checks, including requests for their matching native checkpoint assets.
The original program supplied every level name and briefing statistic.

[media/campaign-validation.json](../media/campaign-validation.json) contains the
per-level native-file/checkpoint identities and observed nonzero SID AC samples.
The disk, frontend, core, catalogue and checkpoint integrity checks passed.
Desktop/mobile regression, original boot/intro SID, native success-to-next-level
progression, selected-level restart and physical password typing also passed.
No external HTTP requests, failed responses or page errors were accepted.

An in-app browser smoke test also loaded and started original Mayhem 25,
"Just a Minute (Part two)". Its paused run was retained for the user.
