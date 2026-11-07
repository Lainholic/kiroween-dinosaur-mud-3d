# Dinosaur Survival MUD 3D: Ashfen Island Survival

> **Kiroween 2026 Hackathon Entry**  
> **Category:** Frankenstein (Stitching disparate tech: 80s Retro CRT Text-MUD × Gemini World Engine × Three.js Realtime 3D WebGL)  
> **Developer:** Doo Hwan Yoon ([@Lainholic](https://github.com/Lainholic))  
> **Demo Video:** [Watch 1m 34s YouTube Demo](https://youtu.be/WR_MknIr1j4)

---

## 📽️ Demo Showcase

[![Dinosaur Survival MUD 3D Demo](https://img.youtube.com/vi/WR_MknIr1j4/0.jpg)](https://youtu.be/WR_MknIr1j4)

Watch the complete end-to-end survival walkthrough: **[YouTube 1080p Video (1:34)](https://youtu.be/WR_MknIr1j4)**. Features live Gemini World Engine integration (`[LIVE API ACTIVE]`), procedural Web Audio, 3D WebGL combat recoil, and power restoration victory.

---

## 🦖 What is Dinosaur Survival MUD 3D?

**Dinosaur Survival MUD 3D** is an original dinosaur survival MUD and interactive thriller set on Ashfen Island, an abandoned Calderyn Biosciences research site. It stitches together three seemingly incompatible eras of computing into a unified web experience:

1. **80s Amber/Green Phosphor CRT Terminal:** Authentic tactile parser with typewriter audio synthesis, command chips, and a text-based parser.
2. **Three.js WebGL 3D Real-time Viewport:** First-person shotgun with recoil kick, 3D muzzle flash, dynamic lighting, atmospheric volumetric fog, a menacing T-Rex skeleton rib arch, and active velociraptors.
3. **Gemini Live AI Dungeon Master:** Powered by Google's `gemini-3.1-flash-lite`, the model dynamically generates reactive survival room narrations and mutates 3D scene parameters based on the player's real-time HP, combat history, and remaining ammunition.

---

## ⚡ The Frankenstein Fusion (Why stitch these together?)

Traditional text-MUDs lack spatial immersion, while modern 3D games often sacrifice open-ended textual storytelling. 

By stitching **retro deterministic MUD mechanics** with **real-time 3D rendering** and an **autonomous AI world engine**, we achieve:
* **Perceived Zero Latency:** Offline fallback instantly responds with classic Ashfen Island survival text while the Gemini World Engine asynchronously enriches the room with contextual tension.
* **Deterministic Rules + AI Emergence:** Combat stats (HP, shotgun shells, taser charges, keycards) are deterministically managed by the game loop, preventing AI hallucination or god-moding, while the narrative flavor and environmental mood shift dynamically based on Gemini's inference.

---

## 🎮 How to Play

### Online / Local Execution (Zero-Dependency Single File)
Just open `index.html` in any modern web browser! No Node.js build step or npm installation required.

```bash
# Clone the repository
git clone https://github.com/Lainholic/kiroween-dinosaur-mud-3d.git
cd kiroween-dinosaur-mud-3d

# Open directly in browser or serve with any static server:
npx serve .
# or simply double-click index.html
```

### Controls & Commands
* `look` / `l`: Inspect current surroundings and prompt Gemini for live contextual storytelling.
* `north`, `east`, `south`, `west` (or `n`, `e`, `s`, `w`): Navigate the five rooms: Visitor Center Lobby (hub: north Control Room, east Genetics Lab, west Raptor Pen) and Geothermal Generator (east of the Control Room).
* `shoot` / `blast`: Fire your pump-action SPAS-12 shotgun with 3D camera recoil and muzzle flash.
* `shock` / `taser`: Fire one of 3 taser charges. A shock that does not kill the pack stuns it for one turn (no counter-attack); the next turn it recovers and cannot be stunned again. Rules: `.kiro/specs/dinosaur-survival-spec.md` section 7.
* `take card`: Retrieve the Calderyn Security Passcard from the cryogenic lab.
* `restore power`: Re-engage island grid safety breakers at the geothermal plant.
* `status`, `inventory`: Check medical vitals and remaining defense ordnance.

---

## 🛠️ Built with Kiro (Spec-Driven Development)

This project was built following the **Kiro Spec-Driven Architecture** preserved in `/.kiro`:

1. **`/.kiro/specs/requirements.md`**: Core requirements defining dual-pane layout, terminal mechanics, and Three.js 3D diorama constraints.
2. **`/.kiro/specs/design.md`**: State machine transitions, visual theme tokens, and Gemini World Engine mutation contracts.
3. **`/.kiro/specs/tasks.md`**: implementation task matrix with verified and still-open items marked honestly (see the file).
4. **`/.kiro/specs/hardening-spec.md`**: Production hardening, including SRI hash enforcement on CDN tags (`integrity="sha384-CI3E..."`), terminal DOM capping (200 nodes), and typing race condition resolution.

---

## 🔒 Security & Privacy

* **Zero Hardcoded Secrets:** The application runs out of the box in offline simulation mode without an API key.
* **Client-Isolated API Key:** Players can optionally provide their own Google AI Studio key via a masked `type="password"` modal dialog. Keys are stored strictly in client `localStorage` and dispatched solely to Google's official endpoint via HTTPS headers.
* **Full Subresource Integrity (SRI):** External libraries (Three.js r128) are loaded with strict SHA-384 integrity hashes and `crossorigin="anonymous"`.

---

## ✅ Tests

```bash
node tests/verify-textmud.mjs        # headless Edge/Chrome, fake AI, no network key needed
node tests/verify-live-gemini.mjs    # optional, real API, needs GEMINI_API_KEY (never prints the key)
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).
