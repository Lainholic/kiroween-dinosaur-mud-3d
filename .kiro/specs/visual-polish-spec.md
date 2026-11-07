# Specification: Dinosaur Survival MUD 3D — Visual Polish & Combat Feedback

This specification enhances `index.html` with visceral combat feedback, dead raptor corpses, first-person weapon animations, and screen impact effects.

---

## 1. Monster Corpses & Blood Puddle (Dead Raptor Persistence)
- **WHEN** the raptor pack HP reaches 0:
  - Do **NOT** hide the raptors.
  - Animate the raptor meshes collapsing onto their sides (`rotation.z = Math.PI / 2`, `position.y = 0.15`).
  - Spawn flat dark crimson blood puddles beneath each fallen raptor (`THREE.CircleGeometry(0.6)`, rotation x = -Math.PI/2, color `0x550000`, roughness 0.3).
  - The corpses and puddles remain permanently visible in the Lobby even if the player explores the Lab or Control Room and returns.

---

## 2. Player Hurt Screen Vignette & Jump Scare Lunge
- **WHEN** the raptor pack counter-attacks the player:
  - The lead raptor rapidly lunges toward the camera (`z` increases toward camera up to `5.5`) for 120ms before springing back.
  - Flash a full-screen or viewport red vignette (`rgba(220, 20, 20, 0.45)`) that fades out smoothly over 250ms.
  - Trigger heavy camera shake (amount 0.5) with a bone-jarring impact thud SFX.

---

## 3. First-Person Shotgun Rig & Recoil (Doom Style)
- Add a stylized 1인칭 shotgun barrel attached directly to the camera:
  - Geometry: Dual dark gunmetal cylinders (`radius: 0.045`, `length: 0.8`, color `0x1a1a1a`, metalness 0.9).
  - Position: Pinned to bottom-center of the camera view (`camera.add(shotgunGroup)`, pos: `[0.25, -0.35, -0.7]`).
  - **Recoil Kick**: On `shoot`, the shotgun kicks violently backward and upward (`z += 0.18`, `rotation.x += 0.25`) and smoothly lerps back to baseline over 6 frames.

---

## 4. 3D Muzzle Flash & Taser Arc Lighting
- **Shotgun Muzzle Flash**:
  - Spawn an explosive jagged yellow/orange fire flash (`THREE.DodecahedronGeometry(0.18)`, emissive `0xffaa00`) at the shotgun tip for 60ms.
  - Spike the scene's point light intensity to 4.5 for 1 frame.
- **Taser Electrical Arc**:
  - On `shock`, pulse a high-frequency cyan strobe light (`0x00ffff`, intensity 3.5) centered on the raptor pack for 180ms to visualize the high-voltage stun.

---

## 5. Verification & Checklist
- [ ] Shotgun barrel visible in bottom-right of 3D viewport with smooth idle breathing bob.
- [ ] Recoil animation fires on `shoot` with visible yellow muzzle flash.
- [ ] Screen flashes crimson red and camera jolts when taking damage.
- [ ] Fallen raptors remain on the floor as corpses with blood pools after death.
- [ ] Zero console errors; 60 FPS maintained.
