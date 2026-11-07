# Implementation Plan: Dinosaur Survival MUD 3D (Task Matrix)

This repository is standalone. All paths are relative to the repository root: the game is `index.html`, specs are in `.kiro/specs/`, automated checks are in `tests/`.

History note: tasks 1-14 were written when this game lived in a larger monorepo (`src/apps/textmud-3d/`, `.kiro/specs/textmud-3d/`). They are kept with corrected paths. Rooms: the v1 game had 3 rooms (`lobby`, `lab`, `control`); the current game has 5 (adds `pen`, `generator`, see `dinosaur-survival-spec.md` section 6). Only items actually verified are checked. Items marked "earlier run" were checked in an earlier session and were not re-run during the latest audit.

## Verified in the latest audit (`node tests/verify-textmud.mjs`, fake AI, headless Edge)

- [x] 15. README alignment: Raptor Pen and Geothermal Generator added, lab and control-room victory path preserved, `blast` alias and 3 taser charges.
  - **Spec**: `dinosaur-survival-spec.md` README alignment amendment and section 6.
  - **Verified**: all 8 room transitions and returns, card pickup, victory at generator and at control room, 3D group switches per room, screenshots of pen and generator looked distinct (green fence scene, amber generator). Scenes were seen only in a headless software-rendered screenshot, not on a real display.
  - **Not specified (open)**: any interaction in `pen` or `generator` beyond navigation and `restore power`. Not invented.

- [x] 16. Taser stun in real combat.
  - **Spec**: `dinosaur-survival-spec.md` section 7 (one-turn stun, recovery turn, lethal/empty cases).
  - **Verified**: stun / recovery alternation, flare clears recovery, shotgun and lethal shock, empty taser, status/inventory/badge, game over, restart reset.

- [x] 17. Stale AI replies are discarded (room change, restart, game over, reverse order).
  - **Spec**: section 8.
  - **Verified with fake fetch only**: late reply from the lobby neither narrates nor changes the lab's light, fog, intensity or animation; restart and game over drop replies; reverse-order replies keep only the newer; in-order replies both apply.

- [x] 18. Base room info first when an API key is set; AI narration is appended afterwards.
  - **Verified with fake fetch**: description, threat and exits are logged before any reply; HTTP failure and no reply leave controls and base text intact.

- [ ] 19. Live Gemini API verification (`node tests/verify-live-gemini.mjs`).
  - **Status**: NOT passed. The latest live run returned HTTP 402 from the real endpoint for the configured key (account/billing side), so no real AI response was ever received. The game kept the base text and stayed playable. Re-run with a working key before claiming live AI works.

- [ ] 20. Public/contest usage check for third-party names and settings from the earlier version.
  - **Status**: unverified, needs the project owner. The MIT license covers this repo's code only and is not a grant of rights over third-party names, characters, or settings.

- [ ] 21. Spec clean-up follow-ups.
  - [x] Duplicate task entries (12, 13, 14) merged; old paths corrected; `requirements.md` and `design.md` marked as v1 legacy.
  - [ ] Rewrite `requirements.md` / `design.md` for the Dinosaur Survival game (they still describe the v1 dungeon mage prototype). Not done.

## Earlier implementation tasks

- [x] 11. Dinosaur Survival Overhaul (v1: 3 rooms)
  - **Spec**: `dinosaur-survival-spec.md`; **File**: `index.html`
  - **Action**: 3-room graph, `executeSkill` (`shoot`/`shock`/`flare`), raptor pack combat, passcard + power restoration victory, dinosaur 3D dioramas, procedural Web Audio FX. Gemini engine retained for free-text commands. Now extended to 5 rooms (task 15).
  - **Verify (earlier run)**: headless Node harness played win, lose, restart and Gemini paths. Re-covered for the 5-room game by tasks 15-18.

- [x] 12. Visual Polish & Combat Feedback
  - **Spec**: `visual-polish-spec.md`; **File**: `index.html`
  - **Action**: Persistent raptor corpses and blood puddles, lead-raptor lunge, red hurt vignette, first-person shotgun with recoil, 3D muzzle flash, cyan taser strobe light.
  - **Verify (earlier run)**: headless Chrome (CDP): 0 console errors, effects triggered, corpses persist, ~50 FPS under software WebGL.

- [x] 13. Final Polish & Dynamic AI Storytelling
  - **Spec**: `final-polish-spec.md`; **File**: `index.html`
  - **Action**: Dummy player removed; upright T-Rex rib arch and skull backdrop; Gemini room narration on room entry and `look` (authoritative exits/threat lines stay code-generated; behavior updated by task 18: base text first, AI appended); masked `type="password"` API key dialog.
  - **Verify (earlier run)**: 0 console errors; key never rendered as text; ~33-35 FPS under CPU software WebGL.

- [x] 14. Hardening (Terra & DeepSeek audit)
  - **Spec**: `hardening-spec.md`; **File**: `index.html`
  - **Action**: `stepTimer` cleared in `clearTerminal()` (14.1); terminal DOM capped at 200 children (14.2); Three.js CDN tag carries SRI + `crossorigin="anonymous"` (14.3).
  - **Verify (earlier run)**: SRI recomputed, 600 lines leave 201 nodes, 5 rapid restarts leave 3 clean messages. The latest audit only confirmed that Three.js loads with the SRI tag (page boots).

- [ ] 2. Gemini World Engine integration (`callGeminiWorldEngine`)
  - **Spec**: `gemini-world-engine.md`; **File**: `index.html`
  - **Done in code**: async `fetch` to the Generative Language API with JSON sanitizing and offline fallback; fake-fetch behavior verified (tasks 17-18).
  - **Open**: real-API success never observed (task 19).

- [ ] 3. Terminal mechanical audio engine (`AudioEngine`: key click, thud, chime) (코드에는 있으나 미검증; 청취/테스트 미수행)
  - Exists in code and is used by the game; not verified by ear or by test. Note `AudioEngine` is a script-level `const`, not `window.AudioEngine` as the original verify step required.

- [ ] 4. Command history buffer (`HistoryBuffer`, ArrowUp/ArrowDown on `#mud-input`) (미구현)
  - NOT implemented (미구현): no `HistoryBuffer` or ArrowUp handling exists in `index.html`. Original requirement R1.3.

## Superseded (no longer applicable)

- Original task 1 (3-room overhaul): delivered by task 11 and extended by task 15.
- Original task 5 (dungeon torch palette `0x773311`): belongs to the v1 mage prototype; room themes in `THEMES` replace it.

## Rebrand work (items 22+; details in `.kiro/specs/dinosaur-survival-mud-rebrand/`)

- [x] 22. Spec file renamed the earlier spec file -> `dinosaur-survival-spec.md` (이전 스펙 파일) by filesystem move; references in `README.md`, `design.md`, `requirements.md`, `tasks.md` updated.
  - **Verified**: grep for the old path finds 0 hits outside the rebrand spec folder docs and the historical `tests/.results/preflight.json` (allowlisted, records the earlier git status). No other file or directory name contains any legacy term.
- [ ] 23. `index.html` rebrand (title "Dinosaur Survival MUD 3D", island "Ashfen Island", company "Calderyn Biosciences", card "Calderyn Security Passcard"; all tentative names). Edited per rebrand tasks 3.1-3.3; not yet re-verified here (미검증).
- [ ] 24. Replace legacy wording in `README.md` (rebrand task 2.3) and in the remaining spec docs and their titles (rebrand tasks 2.1, 6.3). 미구현.
- [ ] 25. Rewrite `requirements.md` / `design.md` for the current survival game (replaces the open part of item 21). 미구현.
- [ ] 26. Known bugs 1-4 re-check and fix only if reproducible (rebrand spec). 미구현.

## 병합 이력

- 12 (이전 중복 항목) -> 12: Visual Polish 항목이 중복되어 하나로 합침 (item 21).
- 13 (이전 중복 항목) -> 13: Final Polish 항목이 중복되어 하나로 합침 (item 21).
- 14 (이전 중복 항목) -> 14: Hardening 항목이 중복되어 하나로 합침 (item 21).
- Before/after numbering inside 12-14 is unchanged; only the duplicate entries were removed, and sub-items 14.1-14.3 stay under 14.
- 미구현 항목: 3 (검증 안 됨), 4 (HistoryBuffer), 19, 20, 21의 문서 재작성, 23-26.
