# Original media and attribution

## Source material

The three disk images came from the user-provided `lemmings.zip`, identified
with [C64.com](https://www.c64.com/games/260). Their original 174,848-byte D64
images and the archive hash are recorded in
[media/provenance.json](../media/provenance.json).

The deterministic campaign package contains those unmodified disk images and
an M3U playlist. The catalogue records the original native level-file identities.
See [the campaign documentation](CAMPAIGN.md).

## Graphics and sound

The native first level uses original terrain, lemming animations, entrance, exit
and SID music. [Features and limits](NATIVE_ENGINE.md) describes the current
engine and its supported content.

Gameplay now runs in GreenMarch's JavaScript engine. An audio-only 6502 runner
plays the original SID routines through standalone reSID; it does not run a
C64 machine or gameplay. Hardware audio can vary with physical SID/filter models.

The separate `emulator-reference.html` build executes the original 6510 program
with VICE. Its checkpoints retain original graphics, counters and SID state,
and its original boot includes the supplied release's TRSI loader/intros.

## Credits and licenses

- **Lemmings:** DMA Design / Psygnosis and the original contributors.
- **C64 conversion:** E&E Software.
- **C64 SID music:** Jeroen Tel ([C64 credits](https://www.c64-wiki.com/wiki/Lemmings)).
- **Supplied release loader/intros:** TRSI.
- **GreenMarch:** unofficial recreation name, native engine, wordmark and artwork.

The integration source and GreenMarch artwork are GPL-3.0 under the project
[LICENSE](../LICENSE). The project license does not grant rights to the original
Lemmings levels, graphics or audio, or to Commodore ROMs. Those remain the
property of their respective rights holders.

VICE is GPL-2.0-or-later, with reSID and its contributors credited by VICE.
EmulatorJS is GPL-3.0, pinned to v4.2.3; the matching core package is
`@emulatorjs/core-vice_x64sc@4.2.3`. Frontend source, packaged core, license,
hashes, provenance and documented local patches are retained in
[vendor/emulatorjs](../vendor/emulatorjs).

The native audio path uses Joe Hohertz's jsSID / Dag Lem's reSID JavaScript port,
copied from the already pinned DeepFall dependency. Its unchanged source wrapper,
upstream revision/digests and matching license notices are retained separately
in [vendor/jssid](../vendor/jssid). Those components retain their own licenses.

Upstream sources:

- [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS)
- [EmulatorJS core build system](https://github.com/EmulatorJS/build)
- [VICE libretro](https://github.com/libretro/vice-libretro)
- [VICE](https://vice-emu.sourceforge.io/)

## Integrity checks

`npm run verify:media` checks the original disks, pinned dependencies, campaign
catalogue and asset hashes. Native browser results and limits are documented
in [NATIVE_ENGINE.md](NATIVE_ENGINE.md); reference-version checks are in
[VALIDATION.md](VALIDATION.md).
