# Requirements Specification: Text-MUD 3D (Frankenstein Track)

> **LEGACY (v1 prototype).** This document describes the original dungeon/mage prototype. The shipped game is the Dinosaur Survival MUD (5 rooms); its current rules are in `dinosaur-survival-spec.md`. Rewrite pending (tasks.md item 21).

## 1. Problem & Concept
- **The Chimera**: Stitch together two wildly incompatible eras of computing into a unified, surprisingly powerful application:
  1. An authentic **1980s monochrome CRT text-based MUD (Multi-User Dungeon) terminal** with amber/phosphor scanlines and mechanical teletype sound synthesis.
  2. A real-time **Three.js 60FPS WebGL 3D chamber** with dynamic lighting, stylized low-poly mage character, and interactive dungeon props.
  3. A generative AI **World Engine (Gemini 3.8 Flash)** translating unscripted, open-ended player intentions simultaneously into rich narrative prose and 3D spatial parameters.
- **Track**: Kiroween 2026 — Frankenstein Track ("Stitch together a chimera of incompatible technologies into a single, unexpectedly powerful app").

## 2. Performance Budgets & Target Metrics
- **Frame Rate**: Constant **60 FPS** WebGL rendering during active 3D character animation and dynamic light flickering.
- **Perceived Input Latency**: **0.00s (Instantaneous)**.
  - On Enter press, terminal teletype audio/text streaming begins immediately (0ms).
  - Background Gemini 3.8 Flash API request (~400-800ms) executes in parallel while the user reads the unfolding text.
  - 3D animation and scene parameters morph seamlessly as the user finishes reading.
- **Bundle & Footprint**: Single standalone HTML/JS client; zero build-step requirement for instant preview in any modern browser.

## 3. Functional Requirements (EARS Format)

### [R1] Terminal UI & CRT Presentation (Left 42%)
- **R1.1 Monospace CRT Aesthetics**: The system **SHALL** render a phosphor green terminal with high-contrast text, scanline overlay, and subtle CRT curvature glow.
- **R1.2 Procedural Teletype Audio**: **WHEN** any text is printed to the log, the system **SHALL** synthesize mechanical typewriter click SFX via the Web Audio API without relying on external WAV/MP3 files.
- **R1.3 Command History Buffer**: **WHEN** the user presses Up or Down arrow keys in the prompt, the system **SHALL** navigate through previously executed commands.
- **R1.4 Quick Action Chips**: The system **SHALL** provide clickable chip shortcuts (`look`, `cast flame`, `open chest`, `whisper blood`, `explore north`) for touch or rapid mouse testing.

### [R2] Three.js 3D Dungeon Chamber (Right 58%)
- **R2.1 Dungeon Geometry**: The system **SHALL** render a 3D stone crypt with tiled ground, four gothic stone pillars, an ancient central floating obelisk/altar, an archway, and a mysterious chest.
- **R2.2 Stylized Character Entity**: The system **SHALL** render a multi-mesh adventurer/mage figure equipped with a hooded mantle, glowing eyes, and an arcane staff with an energy gem.
- **R2.3 4-State Animation FSM**:
  - `IDLE`: Subtle breathing bobbing and gentle staff flotation.
  - `WALK`: Bouncing step cadence, staff swing, forward displacement.
  - `INTERACT`: Forward lean, reaching arm gesture toward prop/altar.
  - `CAST`: High staff elevation, glowing aura pulse, and energetic vibration.
- **R2.4 Dynamic Atmospheric Lighting & Fog**:
  - Point light torch with randomized frequency flickering (LFO simulation).
  - Smooth color interpolation (LERP) between ambient states (Torch Orange, Arcane Cyan, Blood Crimson, Void Purple).
  - Dynamic exponential fog (`THREE.FogExp2`) adjusting density based on dungeon tension.
- **R2.5 Camera FX**: **WHEN** a high-energy spell or crypt shockwave triggers, the system **SHALL** apply a decayed camera shake vibration.

### [R3] Hybrid Local FSM & Gemini 3.8 Flash World Engine
- **R3.1 Deterministic Local FSM (< 1ms)**: **WHEN** standard commands (`look`, `inventory`, `help`, `clear`, navigation) are issued, the local state engine **SHALL** immediately return pre-computed narrative and 3D states.
- **R3.2 Creative Action Router**: **WHEN** the user inputs an unscripted creative action (e.g., "pry the jewel from the altar", "pour blood into the brazier"), the system **SHALL** route the input to the Gemini 3.8 Flash World Engine.
- **R3.3 Structured JSON Protocol**: The Gemini bridge **SHALL** request and validate the following JSON contract:
  ```json
  {
    "narrativeText": "Your fingers grasp the icy facet of the gem...",
    "scene3D": {
      "characterAnimation": "INTERACT",
      "lightColor": "#00ffcc",
      "lightIntensity": 2.8,
      "fogColor": "#002222",
      "fogDensity": 0.06,
      "cameraShake": true,
      "spawnProps": ["glowing_gem"]
    }
  }
  ```
- **R3.4 Zero-Crash Offline Fallback**: **WHEN** API keys are missing or network calls fail, the system **SHALL** automatically engage an algorithmic local generative fallback, preventing freezes or unhandled rejections.

### [R4] Developer & Judge Polish
- **R4.1 Live HUD**: The system **SHALL** display an overlay showing real-time FPS, current FSM state, active light hex, fog density, and perceived latency.
- **R4.2 API Key Configuration**: The system **SHALL** provide an in-terminal or non-intrusive key toggle (`/key` or top badge) allowing judges to run live against their own Gemini API keys or utilize the built-in offline simulation mode.

## 이전 버전 기록

- v1은 던전/마법사 프로토타입이었고, 그 다음 단계(v1.5)는 3개 방(로비, 연구실, 관제실)으로 구성된 공룡 생존 MUD였다. 이 기록은 이력이며 현재 규칙이 아니다.

## 현재 5개 방 구성 (요약)

- 로비(Visitor Center Lobby)에서 북쪽(N)은 관제실(Main Control Room), 동쪽(E)은 연구실(Genetics Laboratory), 서쪽(W)은 랩터 우리(Raptor Pen)다.
- 관제실에서 동쪽(E)은 발전소(Geothermal Generator)다.
- 자세한 규칙은 dinosaur-survival-spec.md를 따른다.
