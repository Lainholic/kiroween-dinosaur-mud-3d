# Devpost Submission Form: Dinosaur Survival MUD 3D

## 1. Project Overview

* **Project Title:** Dinosaur Survival MUD 3D: Ashfen Island Survival
* **Tagline / Elevator Pitch:** 80s retro CRT text-MUD fused with Three.js 60FPS 3D WebGL and Gemini Live World Engine — zero perceived latency.
* **Category / Track:** Frankenstein (Stitching incompatible tech into an unexpectedly cohesive app)
* **GitHub Repository:** https://github.com/Lainholic/kiroween-dinosaur-mud-3d
* **Demo Video URL:** https://youtu.be/WR_MknIr1j4 (1m 34s, 1080p 60fps)

---

## 2. Built With (Tags)
`javascript`, `three.js`, `webgl`, `web-audio-api`, `gemini-api`, `kiro`, `html5`, `css3`

---

## 3. Project Story (Copy & Paste into Devpost description)

### 💡 Inspiration
What happens when you fuse a 1980s green-phosphor text MUD with a modern 60 FPS Three.js WebGL viewport and Google's Gemini generative AI? 

Traditional text adventures offer unparalleled storytelling depth but lack immediate spatial feedback. Modern 3D games offer visceral action but constrain player freedom to pre-rendered sequences. We asked: *Can we resurrect the tactile suspense of 80s command parsers while granting real-time 3D spatial presence and an unscripted AI Dungeon Master?* 

This hybrid chimera is our answer to the Kiroween **Frankenstein Track**.

### 🦖 What It Does
**Dinosaur Survival MUD 3D** drops players onto **Ashfen Island**, an abandoned biotechnology facility operated by Calderyn Biosciences where an island-wide power grid failure has breached velociraptor containment.

* **Left Panel (42% CRT Terminal):** Authentic monospace green-phosphor terminal with scanlines, prompt chips, and procedural typewriter audio clicks.
* **Right Panel (58% Three.js Viewport):** Real-time 60FPS 3D first-person perspective featuring a double-barrel SPAS-12 shotgun with recoil kick, 3D muzzle flashes, dynamic lighting, atmospheric volumetric fog, a menacing T-Rex skeletal arch, and active velociraptor pack animations.
* **Gemini World Engine (AI Dungeon Master):** Powered by `gemini-3.1-flash-lite`, the model dynamically generates reactive room narrations reflecting player combat wounds and ammunition, and mutates 3D scene parameters (lighting, fog, camera shake) in response to free-form text commands.
* **Deterministic Survival Loop:** Players must manage 100 HP, 3 shotgun shells, 2 flares, and 3 taser charges, defeat the velociraptor pack in the lobby, navigate to the Genetics Lab to retrieve the security passcard, and reach the Control Room or Geothermal Generator to execute `restore power` and signal the rescue helicopter.

### ⚡ How We Built It (Kiro Spec-Driven Architecture)
We strictly followed the **Kiro Spec-Driven Development** methodology:
1. **Specs First (`/.kiro/specs/`):** Before touching code, we authored formal `requirements.md`, `design.md`, and `tasks.md` defining strict 60 FPS performance budgets, EARS requirements, and FSM transition contracts.
2. **Zero-Dependency Client (`index.html`):** The entire application is delivered as a zero-build single HTML file. No Node.js bundling or complex dependencies required — just double-click to play in any modern browser.
3. **Procedural Web Audio:** All sound effects (shotgun blast sub-bass, taser voltage arpeggios, flare hissing, raptor screech LFO, typewriter clicks) are synthesized on the fly via the Web Audio API without relying on external audio assets.
4. **Perceived Zero Latency Architecture:** When players enter a room, deterministic room facts and exits print instantly (0ms), masking the asynchronous Gemini inference (~400-800ms) that enriches the scene with atmospheric flavor.
5. **100% Offline Resiliency:** If no Gemini API key is provided or network issues occur, the game seamlessly falls back to pre-authored narrative logic without breaking gameplay.

### 🧗 Challenges We Ran Into
* **Taming AI Hallucinations in Combat:** LLMs often hallucinate stats, grant infinite ammo, or declare premature victories. We decoupled combat mechanics (HP, ammunition, inventory) into a strict deterministic JavaScript engine, using Gemini exclusively for atmospheric narration and 3D parameter mutations.
* **Audio Autoplay Policies:** Modern browsers aggressively block Web Audio until user gestures. We implemented a `safeAudio` guard layer ensuring audio initializes gracefully upon the first user interaction without crashing the render loop.
* **Independent IP Scrubbing:** To ensure 100% original intellectual property, we rigorously audited the entire codebase and spec suite with automated AST linters, replacing legacy franchise references with our original Ashfen Island and Calderyn Biosciences lore.

### 🏆 Accomplishments We're Proud Of
* Achieving constant **60 FPS** WebGL rendering while simultaneously driving procedural audio synthesis and teletype streaming.
* Delivering a truly playable, tense survival horror experience with zero build steps or npm installations.
* Passing our comprehensive 15-case automated test harness (`tests/verify-textmud.mjs`, `tests/verify-live-gemini.mjs`, `tests/verify-layout.mjs`) with 100% clean passes and real Gemini API live HTTP 200 verification.

### 📚 What We Learned
Building with Kiro's spec-to-runtime discipline proved that having a single source of truth in `/.kiro/specs/` allows rapid, fearless refactoring and architecture hardening. Writing acceptance criteria first eliminated regressions before they could happen.

### 🚀 What's Next
* Procedurally generated multi-floor underground bunker complexes.
* Spatial HRTF 3D audio so players can hear velociraptor footsteps stalking behind them in the dark.
* Multiplayer co-op survival terminal over WebSockets.
