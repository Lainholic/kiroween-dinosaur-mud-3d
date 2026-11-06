# Specification: Jurassic Park MUD 3D (Isla Nublar Survival)

## 1. Setting & Narrative Premise
- **Theme**: 1980s retro terminal interface connected to InGen's central mainframe on Isla Nublar.
- **Premise**: Main power grid failure across the park. Security fences offline. Containment breached.
- **Starting Location**: **Visitor Center Lobby**.
- **First Encounter**: A pack of **3 Juvenile Velociraptors** (HP: 45) stalking the shadows around the shattered fossil display.

---

## 2. Room Navigation Matrix (3 Connected Chambers)

```text
       [NORTH] Main Control Room
          │    (UNIX Mainframe, Power Grid Terminal)
          │
[WEST] Visitor Center Lobby ────── [EAST] Genetics Laboratory
(Player Start, T-Rex Ribs,              (Cryo Storage, Embryo Vats,
 Baby Raptors Encounter)                 InGen Security Passcard)
```

1. **Visitor Center Lobby** (`lobby`):
   - Exits: `NORTH` to Control Room, `EAST` to Genetics Lab.
   - Threat: 3 Baby Velociraptors active.
2. **Genetics Laboratory** (`lab`):
   - Exits: `WEST` to Lobby.
   - Item to take: `InGen Security Passcard` (`take card`, `take passcard`).
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
   - Deals 14-21 electrical damage.
   - Triggers electric buzz sound + cyan arc flash in 3D scene + light camera shake (0.3).
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

## 5. Implementation Instructions for Kiro

Kiro must update `src/apps/textmud-3d/index.html`:
1. Update introductory text and room descriptions to match the Jurassic Park storyline.
2. Implement the 3-room graph (`lobby`, `lab`, `control`) with proper directional exits (`north`, `south`, `east`, `west`).
3. Implement `executeSkill(type)` for `shoot`, `shock`, `flare`, and raptor counter-attacks.
4. Replace the old 3D stone props with the Jurassic diorama groups (fossil ribs + raptors, lab tubes, mainframe).
5. Ensure procedural Web Audio triggers for gunshot, taser, flare, and raptor shriek.
6. Verify the page runs without errors and updates cleanly.
