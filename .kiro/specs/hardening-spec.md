# Jurassic Park Text-MUD 3D: Hardening & Bug Fix Spec

> **Target**: `src/apps/textmud-3d/index.html` & `.gitignore`  
> **Source**: Adversarial Audit by Terra (`gpt-6.1-terra`) & DeepSeek (`DeepSeek-V4.1-Flash`)  
> **Status**: APPROVED for Kiro Implementation

---

## 1. Bug #1: Terminal Typing Queue Race Condition
- **Problem**: In `pumpPrint()`, recursive calls when `item.gen !== printGen` combined with active `setTimeout(step, 12)` timers cause interleaved, overlapping typing chains if the user clears or switches states quickly.
- **Specification**:
  1. Store the active step timer handle in a module-level variable `let stepTimer = null;`.
  2. Inside `clearTerminal()`:
     ```javascript
     if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
     ```
  3. Inside `pumpPrint()` and `step()`:
     When `item.gen !== printGen`, do NOT call `pumpPrint()` recursively. Simply `return` immediately and let the valid active pump handle the queue.

---

## 2. Bug #2: Terminal DOM Element Memory Leak
- **Problem**: `say()` caps the transcript array to 300, but DOM `<div>` nodes are continuously appended to `logEl` without limit, degrading browser rendering over long sessions.
- **Specification**:
  Inside `pumpPrint()` when appending a new div to `logEl`:
  ```javascript
  while (logEl.children.length > 200) {
    logEl.removeChild(logEl.firstChild);
  }
  ```

---

## 3. Security: CDN Subresource Integrity (SRI)
- **Problem**: Three.js is loaded from cdnjs without an integrity hash, presenting a supply chain vulnerability to stored API keys.
- **Specification**:
  Update the `<script>` tag loading Three.js:
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
          integrity="sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu"
          crossorigin="anonymous"></script>
  ```

---

## 4. Repository Cleanliness: .gitignore
- **Specification**:
  Ensure `_reports/` and `_work/` are excluded in root `.gitignore` so large video artifacts are never tracked by Git.
