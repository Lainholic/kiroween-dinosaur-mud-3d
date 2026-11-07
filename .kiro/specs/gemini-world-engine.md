# Kiro Implementation Guide: Gemini World Engine Integration
(키로가 직접 구현할 수 있도록 작성된 Gemini API ↔ Three.js 실시간 월드 엔진 가이드)

## 1. 목적 (Goal)
Kiro는 `index.html` 파일에 가짜 `if-else` 눈속임 코드를 걷어내고, **유저가 친 자유 텍스트를 실제 Google Gemini API로 전송하여 실시간 3D 공간 제어 JSON을 받아 Three.js를 실시간으로 변형하는 진짜 월드 엔진 파이프라인**을 구현한다.

---

## 2. API 호출 스펙 (Gemini REST Specification)

### 2.1 엔드포인트
```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}
Content-Type: application/json
```

### 2.2 시스템 프롬프트 및 JSON 스키마 (Request Payload)
Kiro는 아래의 JSON 페이로드를 조립하여 `fetch`로 전송해야 한다:

```json
{
  "system_instruction": {
    "parts": [
      {
        "text": "You are the AI Dungeon Master and World Engine for a retro 3D dark fantasy text MUD. The user will input an action. You must return a strict JSON object that dictates both the narrative story and the real-time 3D Three.js scene parameters. Output ONLY raw JSON matching this schema, no markdown fences:\n{\n  \"narrativeText\": \"Descriptive atmosphere and result of the action (2-3 sentences)\",\n  \"scene3D\": {\n    \"characterAnimation\": \"IDLE\" | \"WALK\" | \"INTERACT\" | \"CAST\",\n    \"lightColor\": \"#hex color (e.g. #ff7700 for torch, #ff2200 for fire, #00ffcc for shockwave, #773311 for dark shadow)\",\n    \"lightIntensity\": 2.2,\n    \"fogDensity\": 0.04,\n    \"cameraShake\": false\n  }\n}"
      }
    ]
  },
  "contents": [
    {
      "parts": [
        {
          "text": "User action: {USER_COMMAND}\nCurrent Room: {CURRENT_ROOM}\nPrevious state: {PREVIOUS_STATE}"
        }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json",
    "temperature": 0.7
  }
}
```

---

## 3. Kiro가 작성해야 할 3개 핵심 자바스크립트 함수

### [함수 1] `callGeminiWorldEngine(prompt, context)`
* **위치**: `index.html` 스크립트 영역
* **역할**: 
  1. `localStorage.getItem('GEMINI_API_KEY')` 또는 입력창에서 키를 읽는다.
  2. 키가 없거나 호출이 실패하면 즉시 `getLocalFallbackWorld(prompt)`를 호출해 크래시 없이 반응한다.
  3. `fetch`로 Gemini API를 호출하고 반환된 JSON 문자열을 파싱한다.
  4. 파싱된 객체 `{ narrativeText, scene3D }`를 반환한다.

### [함수 2] `applyWorldMutation(worldData)`
* **위치**: `index.html` 스크립트 영역
* **역할**:
  1. `worldData.narrativeText`를 좌측 터미널의 `appendTeletype()`으로 타이핑 출력한다.
  2. `worldData.scene3D.characterAnimation`을 우측 Three.js의 `currentAnim`에 즉시 반영한다 (`IDLE`, `WALK`, `INTERACT`, `CAST`).
  3. `worldData.scene3D.lightColor`를 `targetLightColor`에 적용하여 Three.js 조명이 부드럽게 전환되게 한다.
  4. `worldData.scene3D.fogDensity`를 씬 안개 밀도에 동적 반영한다.
  5. `worldData.scene3D.cameraShake`가 `true`이면 카메라 쉐이크를 0.3초간 발동시킨다.

### [함수 3] API 키 설정 UI (`renderApiKeyModal`)
* **위치**: 화면 상단 헤더의 `GEMINI WORLD ENGINE` 뱃지 클릭 시 작동
* **역할**: 
  * 뱃지를 클릭하면 `prompt("Enter Google Gemini API Key:")` 또는 미니 팝업을 띄워 `localStorage.setItem('GEMINI_API_KEY', key)`에 저장.
  * 키가 입력되면 뱃지 상태를 `[LIVE API ACTIVE]` 초록불로 전환.
  * 키가 없으면 `[OFFLINE SIMULATION]` 주황불로 자동 전환되어 오프라인에서도 심사위원이 자유롭게 테스트 가능.

---

## 4. Kiro에게 전달할 실행 명령 프롬프트 (Kiro Direct Prompt)

환님께서 Kiro에게 그대로 복사해서 전달할 프롬프트:

```text
Kiro, implement the real Gemini World Engine into `index.html` following `.kiro/specs/gemini-world-engine.md`.
Specifically:
1. Replace the hardcoded `if (cmd.includes('flame'))` block with an async `callGeminiWorldEngine(cmdText)` pipeline.
2. Send user actions to Gemini's `generateContent` endpoint using `response_mime_type: "application/json"`.
3. Dispatch the returned `scene3D` parameters (animation, lightColor, fogDensity, cameraShake) directly into Three.js.
4. Add an API key config prompt bound to the header badge, persisting to localStorage with graceful offline fallback.
5. Verify the code runs without syntax errors and updates the 3D scene on text response.
```
