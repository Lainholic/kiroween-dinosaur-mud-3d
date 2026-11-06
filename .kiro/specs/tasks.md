# Implementation Plan: Text-MUD 3D (Autonomous Kiro Task Matrix)

Every task is strictly atomic, specifying target file, functions, inputs, outputs, and automated verification rules.

## Task Matrix

- [ ] 1. Jurassic Park MUD 3D Overhaul (★ PRIMARY KIRO ASSIGNMENT ★)
  - **Spec File**: Read `.kiro/specs/textmud-3d/jurassic-park-spec.md`.
  - **File**: `src/apps/textmud-3d/index.html`
  - **Tasks**:
    1. Update story to Isla Nublar containment breach & Visitor Center Lobby encounter with 3 juvenile Velociraptors.
    2. Implement 3-room matrix: `lobby` (raptor threat), `lab` (security passcard), `control` (UNIX power restore).
    3. Implement 3 survival skills: `shoot` (shotgun), `shock` (taser), `flare` (blinding flare).
    4. Build Three.js Jurassic dioramas: T-Rex fossil ribs, 3 raptors with yellow eyes, cryo lab tubes, control room servers.
    5. Wire Web Audio gunshot, taser buzz, and flare sound FX.
  - **Verify**: Run `node tests/verify_textmud.js` and confirm 0 console errors.

- [ ] 2. Core Gemini World Engine Integration
  - **Spec File**: Read `.kiro/specs/textmud-3d/gemini-world-engine.md`.
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Replace hardcoded `if-else` mock logic with the real async `callGeminiWorldEngine(cmdText)` pipeline.
  - **Verify**: Inspect `index.html` to confirm `fetch` call to Generative Language API and JSON scene3D dispatcher are in place.

- [ ] 3. Terminal Mechanical Audio Engine
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Implement `AudioEngine` object with `playKeyClick(char)`, `playThud()`, `playChime()`.
  - **Verify**: Audio functions must be attached to `window.AudioEngine` and callable without errors.

- [ ] 4. Command History Buffer
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Implement `HistoryBuffer` class and bind `ArrowUp` and `ArrowDown` on `#mud-input`.
  - **Verify**: Pressing Up arrow after submitting commands restores previous text in input.

- [ ] 5. Authentic Dungeon Palette & Dynamic Lighting
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Replace neon purple with authentic dungeon torch tones in `update3DScene`.
  - **Verify**: Executing unscripted input shifts point light to `0x773311` instead of purple.

- [x] 11. Jurassic Park Survival Overhaul
  - **Spec File**: `.kiro/specs/textmud-3d/jurassic-park-spec.md`
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: 3-room graph (`lobby`, `lab`, `control`), `executeSkill` (`shoot`/`shock`/`flare`), raptor pack combat, passcard + UNIX power restoration victory, Jurassic 3D dioramas, procedural Web Audio FX (gunshot, taser, flare, shriek). Gemini engine retained for free-text commands.
  - **Verify**: Headless Node harness played win, lose, restart and Gemini paths with 0 console errors.

- [x] 12. Jurassic Visual Polish & Combat Feedback
  - **Spec File**: `.kiro/specs/textmud-3d/visual-polish-spec.md`
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Add persistent dead raptor corpses with blood puddles, 1st-person Doom-style shotgun with recoil kick, muzzle flash, player hurt screen red vignette, and raptor jump scare lunge.
  - **Verify**: Test `shoot` recoil and confirm raptor corpse remains on floor after death.

- [ ] 13. Final Polish: Towering T-Rex Skeleton & Gemini Room Storytelling
  - **Spec File**: `.kiro/specs/textmud-3d/final-polish-spec.md`
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Remove center dummy player, stand T-Rex ribcage into towering arch, wire dynamic Gemini room storytelling, and mask API key prompt for safe video recording.
  - **Verify**: Confirm towering T-Rex is visible in lobby, dummy player is gone, and offline fallback remains instant.

- [x] 12. Visual Polish & Combat Feedback
  - **Spec File**: `.kiro/specs/textmud-3d/visual-polish-spec.md`
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Persistent raptor corpses + blood puddles, lead-raptor lunge and red hurt vignette, camera-attached first-person shotgun with recoil, 3D muzzle flash, cyan taser strobe light.
  - **Verify**: Headless Chrome (CDP) run: 0 console errors, recoil/flash/vignette/strobe triggered, corpses persist after leaving and re-entering the lobby, ~50 FPS under software WebGL.

- [x] 13. Final Polish & Dynamic AI Storytelling
  - **Spec File**: `.kiro/specs/textmud-3d/final-polish-spec.md`
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: Third-person dummy removed; upright T-Rex rib arch (peak 2.39m, front rib at z = -1.8) with enlarged skull/jaw backdrop and shadow-casting amber spotlight; Gemini room narration on room entry and `look` (instant offline fallback, authoritative exits/threat lines stay code-generated); masked `type="password"` API key dialog.
  - **Verify**: Headless Chrome (CDP): 0 console errors; offline `look` instant; mocked live narration sends HP/raptor/smoke context; key never rendered as text; ~3,300 FPS uncapped on RTX 4060 (worst frame 4.5ms), ~33-35 FPS under CPU software WebGL.

- [ ] 14. Hardening and Bug Fixes (Adversarial Audit by Terra & DeepSeek)
  - [ ] 14.1 Prevent `pumpPrint` concurrent timer race condition in `clearTerminal`
  - [ ] 14.2 Enforce 200 DOM element limit in `logEl` to prevent memory growth
  - [ ] 14.3 Add SRI `integrity` hash and `crossorigin` to Three.js script tag

- [x] 14. Hardening (Terra & DeepSeek audit)
  - **Spec File**: `.kiro/specs/textmud-3d/hardening-spec.md`
  - **File**: `src/apps/textmud-3d/index.html`
  - **Action**: `stepTimer` cleared in `clearTerminal()`; stale pump/step return without recursion; terminal DOM capped at 200 children; Three.js CDN tag carries SRI (`sha384-CI3E...`) + `crossorigin="anonymous"`. `.gitignore` already excludes `_reports/` and `_work/`.
  - **Verify**: SRI hash recomputed from the live cdnjs file; headless Chrome: Three.js loads, 600 lines leave 201 nodes, 5 rapid restarts mid-typing leave exactly 3 clean messages, 0 console errors; `node tests/verify_textmud.js` passes.
