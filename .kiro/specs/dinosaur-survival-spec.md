# Specification: Dinosaur Survival MUD 3D (Ashfen Island Survival)

## 1. Setting & Narrative Premise
- **Theme**: 1980s retro terminal interface connected to Calderyn Biosciences' central mainframe on Ashfen Island.
- **Premise**: Main power grid failure across the park. Security fences offline. Containment breached.
- **Starting Location**: **Visitor Center Lobby**.
- **First Encounter**: A pack of **3 Juvenile Velociraptors** (HP: 45) stalking the shadows around the shattered fossil display.

## README alignment amendment
- Preserve the existing laboratory and lobby encounter. Add a Raptor Pen west of the lobby and a Geothermal Generator east of the control room, with return paths.
- `blast` is an alias for `shoot`; `status` reports health and remaining supplies. `restore power` with the passcard works at the generator and remains supported at the control terminal for existing players.
- Track three taser charges; `shock` consumes one and fails without damage when empty. Show charges in inventory and the status badge.
- Each added room has a distinguishable 3D scene and lighting. Validate navigation, both restoration locations, ammunition, restart, and existing victory path in a background browser.

---

## 2. Room Navigation Matrix (v1 baseline: 3 chambers; superseded by the 5-room graph in section 6)

> Status note: this section records the original 3-room design (v1). The shipped game has 5 rooms, see section 6. The lobby gained a WEST exit and the control room gained an EAST exit; the other v1 exits are unchanged.

```text
       [NORTH] Main Control Room
          │    (UNIX Mainframe, Power Grid Terminal)
          │
[WEST] Visitor Center Lobby ────── [EAST] Genetics Laboratory
(Player Start, T-Rex Ribs,              (Cryo Storage, Embryo Vats,
 Baby Raptors Encounter)                 Calderyn Security Passcard)
```

1. **Visitor Center Lobby** (`lobby`):
   - Exits: `NORTH` to Control Room, `EAST` to Genetics Lab.
   - Threat: 3 Baby Velociraptors active.
2. **Genetics Laboratory** (`lab`):
   - Exits: `WEST` to Lobby.
   - Item to take: `Calderyn Security Passcard` (`take card`, `take passcard`).
3. **Main Control Room** (`control`):
   - Exits: `SOUTH` to Lobby.
   - Goal: `restore power` or `use card` on the UNIX terminal triggers park recovery & rescue helicopter (VICTORY).

---

## 3. Survival Combat & Skill Rules

### Player Stats
- **Health**: 100 / 100 HP (Tracked in header badge `#player-hp-badge`).
- **Inventory**: `SPAS-12 Shotgun (3 Shells)`, `Road Flare (2)`, `Cattle Prod Taser`.

### Active Skills
1. **`shoot` / `shotgun`**:
   - Uses 1 shell.
   - Deals 20-35 damage to the raptor pack.
   - Triggers shotgun blast sound + white/yellow muzzle flash in 3D scene + heavy camera shake (0.6).
2. **`shock` / `taser`**:
   - Uses 1 taser charge (3 at start). With 0 charges it fails without damage or counter-attack.
   - Deals 14-21 electrical damage.
   - Triggers electric buzz sound + cyan arc flash in 3D scene + light camera shake (0.3).
   - **Stun** (see section 7): if the pack survives, it is stunned and does not counter-attack this turn.
3. **`flare`**:
   - Uses 1 flare.
   - Emits blazing crimson light in 3D scene + flare hiss sound.
   - Temporarily blinds the raptors, **cancelling their counter-attack for that turn**.

### Enemy Behavior (Raptor Pack)
- Starting HP: 45 / 45.
- On hit: If HP > 0, raptors counter-attack for 8-17 damage to player.
- On death (HP <= 0): Raptors shriek and flee into the jungle. Lobby is secured.
- If player HP <= 0: Game Over state; type `restart` to reboot simulation.

---

## 4. 3D Diorama & Atmospheric Lighting Requirements

1. **Visitor Center Lobby**:
   - Centerpiece: Fallen T-Rex fossil ribcage geometry (torus arcs).
   - Entities: 3 stylized juvenile raptor meshes with glowing yellow predatory eyes.
   - Lighting: Rotating amber/red emergency siren light (`0xff3300`).
2. **Genetics Laboratory**:
   - Centerpiece: 3 cylindrical incubation vats with amber embryo spheres.
   - Lighting: Toxic cryogenic green (`0x00ff88`).
3. **Main Control Room**:
   - Centerpiece: Server mainframe cabinet with glowing CRT monitor planes.
   - Lighting: Computer terminal cyan/blue (`0x2288ff`).

---

## 5. Implementation Instructions for Kiro (v1 baseline)

Kiro must update `index.html` (repository root; v1 history used `src/apps/textmud-3d/index.html` inside the former monorepo):
1. Update introductory text and room descriptions to match the Ashfen Island storyline.
2. Implement the 3-room graph (`lobby`, `lab`, `control`) with proper directional exits (`north`, `south`, `east`, `west`).
3. Implement `executeSkill(type)` for `shoot`, `shock`, `flare`, and raptor counter-attacks.
4. Replace the old 3D stone props with the dinosaur diorama groups (fossil ribs + raptors, lab tubes, mainframe).
5. Ensure procedural Web Audio triggers for gunshot, taser, flare, and raptor shriek.
6. Verify the page runs without errors and updates cleanly.

---

## 6. Current Room Graph (v2: 5 rooms)

| Room id | Name | Exits | Interaction |
| :-- | :-- | :-- | :-- |
| `lobby` | Visitor Center Lobby | N control, E lab, W pen | Raptor pack encounter. Leaving while the pack lives costs 8-17 HP. |
| `lab` | Genetics Laboratory | W lobby | `take card` |
| `control` | Main Control Room | S lobby, E generator | `restore power` with card (victory path A, existing) |
| `pen` | Raptor Pen | E lobby | Navigation and scene only |
| `generator` | Geothermal Generator | W control | `restore power` with card (victory path B) |

- Every room has a return path. The generator is reached only through the control room (lobby -> control -> generator).
- Rooms `pen` and `generator` are scene and navigation additions requested by the README alignment. **No further interactions (items, puzzles, enemies) are specified or confirmed for them.** Do not invent any without a new instruction from the project owner (Hwan). `restore power` at the generator is the only confirmed interaction there.

## 7. Taser Stun Rules (shock)

Goal: make the README promise ("stun raptors in close proximity") real, without making the taser a dominant strategy.

- **Trigger**: a `shock` that leaves the pack alive (HP > 0) stuns it, unless the pack is in stun recovery.
- **Duration**: exactly one combat turn. The raptor counter-attack that would follow the shock is cancelled ("Stunned, the raptors cannot counter-attack this turn", same outcome as a flare blind). The stun ends at the end of that turn. It does not carry into the next action and does not protect the player when leaving the lobby (leaving still costs 8-17 HP while the pack lives).
- **Recovery**: after a stunned turn the pack is in stun recovery. The next combat action (`shoot`, `shock` or `flare`) resolves normally: a `shock` still deals damage but cannot stun and the pack counter-attacks. Any combat action then clears the recovery state. So consecutive shocks alternate stun / no stun.
- **Lethal shock**: if the shock kills the pack, no stun and no counter-attack, as for any lethal hit.
- **Empty taser**: no damage, no stun, no counter-attack, no charge consumed.
- **Balance**: shock stays weaker than the shotgun (14-21 vs 20-35 damage, 3 charges vs 3 shells). A taser-only run needs 3 shocks (average damage 52.5 vs pack HP 45) and takes exactly one counter-attack in the 3-shock sequence (stun, no stun, stun/lethal), because two shocks deal at most 42 damage and cannot kill the 45 HP pack. Flare keeps its separate role: no damage, cancels one counter.
- **Presentation**: raptors twitch with cyan-tinted eyes (`raptorFx.mode = 'stun'`, about 1.2 s); the log line states the stun.
- **State**: `state.stunRecovery` (boolean) lives in `freshState()` and resets on `restart`. Game over and restart clear it.
- **Regression scope**: flare, shotgun, taser charges (inventory/status/badge), game over, restart.

## 8. AI Response Handling (Gemini)

1. **Base information first**: with an API key set, `look` and room entry print the full offline description, threat line and exits immediately (zero latency). The AI narration is appended afterwards as an optional extra paragraph. Failure or delay never removes or delays the base text, controls, or exits.
2. **Staleness guard**: each AI request captures a context token (restart epoch, room visit counter, request sequence). A response is discarded (no narration, no 3D effect, no state change) if the player has moved to another room, restarted, hit game over, won, or if a newer request has already been applied.
3. **Reverse-order replies**: for free-text requests, a reply that arrives after a newer request was already applied is discarded.
4. **Authority**: the AI never changes HP, ammo, items, exits or victory. Those lines are always code-generated.
5. **Verification split**: (a) automated checks use a fake `fetch` (deterministic, no network); (b) a separate live check calls the real endpoint using `GEMINI_API_KEY` from the environment. Live checks must never log the key or response text, only status and length/shape.

## 9. Open Items (need the project owner)

- Interactions for the Raptor Pen and the Geothermal Generator beyond navigation and `restore power`: not specified.
- Confirmation that no third-party name, character, or setting from the earlier version remains in a public or contest submission: not verified. The MIT license in this repository covers this repository's code only and does not grant any right over third-party names, characters, or settings.
