---
name: readme-maintenance
description: Maintain GreenMarch's public README, play preview and linked documentation while preserving its established presentation and attribution.
---

# GreenMarch README maintenance

The user prefers DeepFall's player-first presentation. For this project:

- Keep the original `artwork/banner.svg` at the top, linked to the online game.
- Keep a prominent Play online heading and a clickable start-screen preview.
  The heading, banner and preview should target the same published URL.
- Preserve the repository About website link; the user specifically likes it.
- Lead with what the game is, what it includes, how to play and a compact controls
  table. Put local setup after the player guide.
- Keep attribution concise in the README. Put full media provenance, component
  licensing and source/version details in `docs/ORIGINAL_MEDIA.md`; put runtime,
  testing and deployment details in `docs/DEVELOPMENT.md`.
- Preserve existing license files and accurate original-game attribution. Do
  not imply that the browser shell's license covers original game assets.
- Describe the current architecture accurately: native JavaScript gameplay starts
  with Fun 1; an audio-only original SID player is separate. The 100-level C64
  emulator remains a reference build. Do not call the emulator shell a native
  recreation or imply all 100 levels have been ported or solved.

Keep public copy focused on play, supported features and honest limitations.
Keep internal research tooling and asset-preparation methods in private notes.
Preserve original-game attribution and all required component license notices.

## Preview and checks

GitHub filters README iframes and scripts; use an ordinary linked image. Inspect
the saved screenshot before publishing, including the visible start button.
An in-app capture can be blank even when the DOM is ready; use a verified actual
site capture for static artwork, and do not claim it was a live in-app capture.

For documentation-only changes, check relative links and inspect GitHub's rendered
headings, image and play-link targets. Gameplay regression is unnecessary unless
runtime files changed. Record new user corrections here rather than creating a
second overlapping skill. Publication follows the current task's authorization;
this workflow does not independently authorize deployment or repository settings.
