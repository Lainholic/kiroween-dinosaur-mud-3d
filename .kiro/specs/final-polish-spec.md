# Specification: Dinosaur Survival MUD 3D — Final Polish & Dynamic AI Storytelling

This specification finalizes `index.html` for official hackathon demo video recording.

---

## 1. Remove Dummy Player & Towering T-Rex Skeleton
- **Remove Center Dummy Player**: Delete the third-person ball/cylinder player mesh (`charGroup`) from the center of the scene. The player is strictly 1st-person holding the shotgun.
- **Stand Up T-Rex Fossil Arch**:
  - The T-Rex ribcage must stand upright as a towering skeletal arch (height 2.0m - 2.5m, position closer at `z = -1.8`).
  - Stand the ribs vertically (`rotation.x = Math.PI / 2` or torus arc facing forward).
  - Enlarge the T-Rex skull and jaw with aged ivory bone material (`0xd8cfae`) so it forms a dramatic backdrop behind the raptor pack.
  - Position an amber spotlight/fill light so the fossil casts prominent shadows on the lobby floor.

---

## 2. Dynamic Room Narrative by Gemini (Live Mode)
- **WHEN** the player enters a room or types `look`:
  - **IF** a Gemini API key is present:
    - Send current game context (Room name, player HP, raptors alive/dead status, shells left, items held) to Gemini.
    - System prompt: *"You are the AI narrator for Ashfen Island. Write 2-3 atmospheric, tense sentences describing the current chamber, reflecting the survivor's recent combat wounds, gunfire smoke, and the state of the room."*
    - Stream the generated AI story into the terminal via `appendTeletype`.
  - **ELSE** (Offline Mode / No Key / Network Failure):
    - Instantly fall back to the pre-written classic MUD room descriptions without any latency.

---

## 3. Password Masking on API Key Input (Video Recording Safety)
- The API key input prompt must mask the input or use `<input type="password">` so when recording the demo video, the actual secret key is never leaked on camera.

---

## 4. Verification Checklist
- [ ] No dummy player standing in the center; 1st-person view is completely unobstructed.
- [ ] T-Rex ribcage and skull are clearly visible as a towering bone arch in the lobby.
- [ ] When offline, room descriptions print instantly.
- [ ] When live API key is set, Gemini generates rich context-aware story descriptions.
- [ ] Zero console errors; 60 FPS maintained.
