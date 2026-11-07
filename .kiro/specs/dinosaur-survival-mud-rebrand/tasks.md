# Implementation Plan: Dinosaur Survival MUD 3D 리브랜딩

## Overview

`index.html`(단일 파일, JavaScript)의 옛 명칭을 새 명칭(`BRAND`)으로 교체하고, 알려진 버그 4건은 재현을 먼저 확인한 뒤 필요한 부분만 최소 수정한다. 이후 테스트(`tests/`, Node 내장 모듈 + 개발 전용 `fast-check`)를 확장하고, 옛 명칭 검사, 실제 AI 호출 검증(Live_Check), 검증 보고서 생성 순서로 진행한다. 구현 언어는 설계 문서가 지정한 JavaScript(ES 모듈 `.mjs` 테스트 포함)이다.

작업 원칙:
- 기존 코드를 파괴하지 않는다. 수정 대상 함수나 구간만 고친다.
- `git commit`, `git push`, 원격 브랜치/PR 생성, `git reset --hard`, `git restore`, `git stash`, `git clean`은 어떤 작업에서도 실행하지 않는다.
- 검증 명령을 실행해 통과를 확인한 뒤에만 `[x]`로 표시한다.
- API 키 값과 응답 본문은 어떤 파일과 출력에도 기록하지 않는다.

## Tasks

- [x] 1. 사전 조사
  - [x] 1.1 저장소 경로 관계 확인
    - 두 경로(`c:\AI\projects\kiroween-textmud-3d`, `C:\AI\projects\kiroween-textmud-3d`)에 대해 `Resolve-Path`, `(Get-Item).LinkType`, `git rev-parse --show-toplevel` 결과를 수집한다.
    - 동일 저장소 여부와 근거 값을 `tests/.results/preflight.json`에 기록한다. 명령 실패 시 파일을 수정하지 않고 사유를 기록한 뒤 중단한다.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Working_Tree_Snapshot 생성
    - 저장소 밖(`$env:TEMP\mud-snapshot-<timestamp>\`)에 `status.txt`, `tracked.patch`, `untracked\` 사본을 만든다.
    - 추적 변경 파일 수(패치의 `diff --git` 개수) + 미추적 사본 수가 `git status --porcelain` 항목 수와 일치하는지 확인하고, 불일치하면 수정 없이 중단한다.
    - 스냅샷 경로와 파일 수를 `tests/.results/preflight.json`에 기록한다.
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

  - [x] 1.3 스펙 문서와 steering 읽기 확인
    - `README.md`, `.kiro/specs/` 기존 8개 문서, `.kiro/steering/project.md`를 읽고 파일명 9개 목록을 기록한다.
    - 하나라도 없거나 읽을 수 없으면 구현을 시작하지 않고 누락 파일명을 기록한다.
    - `gemini-world-engine.md`가 깨져 보이면 바이트를 직접 읽어 UTF-8 디코딩 가능 여부로 원인(파일 자체 또는 터미널 표시)을 판별하고, 파일 자체가 깨진 경우에만 정리한다.
    - _Requirements: 2.1, 2.4, 2.6, 2.7_

- [x] 2. 스펙 문서 갱신 (구현 전)
  - [x] 2.1 기존 스펙 문서에 새 방향 반영
    - 새 명칭(Rebrand_Names), Legacy_Terms 제거 규칙, 버그 수정 범위를 `.kiro/specs/` 기존 문서에 해당 절만 갱신해 반영한다. 유효한 기존 내용은 삭제하지 않는다.
    - `requirements.md`와 `design.md`(v1 LEGACY)는 최상단 LEGACY 표시를 유지하고, 3개 방 설명은 "이전 버전 기록" 구획으로 옮긴 뒤 5개 방 기준 본문을 추가한다.
    - 수정한 문서명과 절 제목을 `tests/.results/spec-changes.json`에 기록한다.
    - _Requirements: 2.2, 2.3, 10.1, 10.6, 10.7_

  - [x] 2.2 기존 `tasks.md`(`.kiro/specs/tasks.md`) 정리와 스펙 파일 이름 변경
    - 리브랜딩 작업을 기존 번호를 잇는 목록으로 추가하고, 중복/모순 항목은 "병합 이력" 구획에 병합 전후 번호와 사유를 1줄 이상 기록한다.
    - 미구현 항목(`HistoryBuffer` 등)은 `[ ]`와 "미구현" 문구로 표시한다.
    - 옛 작품 이름이 들어간 스펙 파일을 `dinosaur-survival-spec.md`로 파일 시스템 이름 변경하고 `README.md`와 `.kiro/specs/` 안 모든 참조를 갱신한다.
    - _Requirements: 5.3, 10.2, 10.3, 10.4, 10.5_

  - [x] 2.3 README 갱신
    - 제목, 소개, 명령어 안내, 이미지 대체 텍스트를 새 명칭으로 교체한다.
    - 데모 링크 앞뒤 1문장 이내에 Existing_Demo_Video가 이전 게임 녹화본이며 이번 변경으로 바뀌지 않았다는 취지의 문구를 넣는다. GitHub, 유튜브, Devpost 문자열은 변경하지 않는다.
    - _Requirements: 5.1, 5.5, 5.6_

- [x] 3. 이름 교체와 BRAND 정의
  - [x] 3.1 `BRAND` 상수 도입과 화면 문자열 교체
    - `index.html` 스크립트 맨 위에 `const BRAND = Object.freeze({ title, island, company, card, adminLogin })`을 정의한다(값은 design의 C2).
    - `<title>`, 헤더(부팅 시 `BRAND`로 덮어쓰기), 인트로, 방 설명, 카드 문구, 인벤토리, 도움말, 로그인 이름, 승리 문구, 게임 오버 문구를 `BRAND` 기반으로 교체한다. `<title>`의 "(Frankenstein Track)" 접미사는 제거한다.
    - 원작 대사와 승리 문구는 원문과 연속 일치 단어가 4개 미만이 되게 교체한다. 방 이름 5개와 모든 수치는 변경하지 않는다.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.10, 6.8, 6.9, 6.10_

  - [x] 3.2 `classifyCommand` 분리와 카드 명령 정규식 수정
    - `route()`의 정규식 판정을 순수 함수 `classifyCommand(raw) -> {type, arg?}`로 분리하고 `route()`는 결과로 분기만 하게 한다(분기 순서 유지).
    - 카드 정규식은 `/^(take|get|grab|pick up) (the )?(security )?(pass ?card|card)$/`로 바꿔 이전 회사 이름이 들어간 카드 명령이 알 수 없는 명령이 되게 한다.
    - 입력이 이상해도 예외 없이 `FREE_TEXT` 등 안전한 기본값을 반환한다.
    - _Requirements: 4.5, 4.6, 6.7_

  - [x] 3.3 프롬프트, 주석, 로컬 저장소 키 정리
    - `SYSTEM_PROMPT`, `NARRATOR_PROMPT`에 `BRAND.title`, `BRAND.island`, `BRAND.company`를 각 1회 이상 포함시키고 옛 명칭을 제거한다.
    - 코드 주석, 변수명, 함수명에서 옛 명칭을 제거한다. 로컬 저장소 키는 `GEMINI_API_KEY` 하나이며 옛 명칭이 아니므로 예외 0개로 기록한다.
    - _Requirements: 4.7, 4.8, 4.9_

- [x] 4. 버그 재현 확인과 최소 수정
  - [x] 4.1 버그 1~4 현재 코드 재현 확인
    - `window.__mud` 훅으로 시나리오를 실행해 테이저 스턴, 늦은 AI 응답 폐기, 기본 정보 우선 출력, 타임아웃의 현재 동작을 확인한다.
    - 시도한 입력 순서, 기대 결과, 실제 결과를 `tests/.results/repro.json`에 기록한다. 재현되지 않는 항목은 코드를 수정하지 않는다.
    - _Requirements: 7.7, 8.7, 9.1_

  - [x] 4.2 테이저 스턴 판정 최소 수정
    - 재현 결과 부족분이 있을 때만 `executeSkill`의 스턴 계산을 순수 함수 `resolveStunTurn({type, raptorHp, blind, stunRecovery, taserCharges}) -> {stunned, nextStunRecovery, counterAllowed}`로 추출/보정한다.
    - 충전량 0이면 상태 변화 없이 실패 메시지 1회, `restartGame`과 게임 오버 시 `stunRecovery=false`, 스턴 로그 1줄, `STUN_SECONDS`는 1.0~1.4 범위를 보장한다.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.3 AI 문맥 토큰과 응답 적용 판정
    - `captureAiContext(kind)`가 `{epoch, roomVisit, seq, kind}`를 반환하게 하고, 순수 함수 `shouldApplyAiReply(ctx, cur)`로 적용 여부를 판정한다. 적용 시 `appliedSeq = ctx.seq`로 갱신한다.
    - `restartGame`은 `appliedSeq = aiReqSeq`로 이전 요청을 무효화한다. 폐기 시 오류 메시지, 로그, 3D, 게임 상태에 변경을 만들지 않는다.
    - `applyWorldMutation`이 `state`를 쓰지 않고 내레이션과 `scene3D`만 다루는지 확인하고, 쓰고 있으면 최소 수정한다.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.7_

  - [x] 4.4 기본 정보 우선 출력과 타임아웃 정리
    - `GEMINI_TIMEOUT_MS`를 10000으로 낮추고 `geminiGenerate`가 항상 `null`을 반환하며 reject하지 않게 확인한다(`console.warn`만 사용, `console.error` 금지).
    - 내레이션은 `sanitizeNarration`을 거쳐 공백 제외 1자 이상 2,000자 이하일 때만 출력한다. 키가 없으면 네트워크 요청 없이 오프라인 설명을 출력하고, AI 진행 중에도 명령 입력을 차단하지 않는다.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 5. 테스트 확장
  - [x] 5.1 테스트 인프라와 `window.__mud` 훅 확장
    - `tests/package.json`을 만들고 `fast-check`를 개발 전용 정확한 버전으로 고정한다. 게임 런타임 의존성은 추가하지 않는다. 설치가 불가능하면 속성 테스트를 "미실행"으로 기록한다.
    - `tests/lib/browser.mjs`에 헤드리스 브라우저 실행/CDP 공통 로직을 두고, 브라우저를 찾지 못하면 시나리오 실행 전 종료 코드 2로 종료한다.
    - `index.html`의 `window.__mud`에 `BRAND`, `ROOMS`(읽기 전용 사본), `classifyCommand`, `resolveStunTurn`, `shouldApplyAiReply`, `sanitizeNarration`, `applyWorldMutation`을 노출한다.
    - _Requirements: 6.10, 12.8_

  - [x] 5.2 이동, 자원, 승리, 재시작 시나리오
    - `tests/verify-textmud.mjs`에 모든 이동 간선과 복귀 간선, `shoot/shock/flare`별 탄약/충전량/조명탄 변화, 카드 획득, 관제실 승리, 발전소 승리를 별도 케이스로 추가한다. 랩터가 살아 있는 로비 이동은 처치하거나 rng를 고정한다.
    - 게임 오버 후 `restart`의 초기값 일치와 거부된 행동(`restore power` 거부, 카드 중복 획득)의 상태 불변을 확인한다.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.1, 12.2, 12.3, 12.4_

  - [x] 5.3 이름, 콘솔 오류, 실패 출력 검사
    - 제목, 인트로, `describeRoom()` 출력 전체, 카드 문구, 승리 문구에 `BRAND` 값이 1개 이상 있고 옛 용어가 0건인지, 탭 제목과 헤더가 `BRAND`와 일치하는지, 방 이름 5개가 불변인지 확인한다.
    - 브라우저 콘솔 오류 0건을 확인하고, 실패 시 시나리오 이름/기대값/실제값을 출력하며 종료 코드 1로 종료한다.
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.10, 12.5, 12.7, 12.9_

  - [x] 5.4 스턴 케이스
    - 스턴 교대, 회복 턴, 치명 타격, 빈 테이저를 각각 별도 케이스로 추가하고 턴 결과와 자원 변화를 확인한다. 스턴 로그 1줄과 `STUN_SECONDS`가 1.0~1.4인지 확인한다.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 12.6_

  - [x] 5.5 가짜 fetch AI 시나리오
    - 기존 `__pending` 보류/수동 해제 방식으로 방 이동 후 늦은 응답, 재시작/게임 오버/승리 후 응답, 역순 응답, HTTP 오류, 예외, 잘못된 JSON, 10초 무응답(`AbortSignal` reject와 타임아웃 훅 사용), `look` 순서(Base_Room_Text 먼저)를 추가한다.
    - 외부 네트워크 0건, 키 없음에서 fetch 호출 0회, 동일 시나리오 2회 연속 결과 일치를 확인한다.
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 9.1, 9.3, 9.5, 9.6, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 5.6 뷰포트 레이아웃 검사
    - CDP `Emulation.setDeviceMetricsOverride`로 1920x1080, 1280x720을 설정하고 헤더, 인트로 첫 노드, 가장 긴 방 설명 노드, `.chip` 전체, `#mud-input`의 경계 사각형이 뷰포트 안인지와 `#log`/터미널 컨테이너의 `scrollWidth <= clientWidth`를 확인한다.
    - 실패 시 해상도와 요소 이름을 출력하고, 레이아웃 결함이 있으면 `index.html`의 해당 CSS만 수정한다. 해상도별/요소별 결과를 `tests/.results/layout.json`에 기록한다.
    - _Requirements: 15.4, 15.5, 15.6, 15.7_

  - [ ]* 5.7 속성 테스트: 카드 획득 명령 분류
    - **Property 2: 카드 획득 명령 분류**
    - `tests/properties/card-command.test.mjs`에서 대소문자/공백 변형 입력은 `TAKE_CARD`, 이전 회사 이름 포함 입력은 비 `TAKE_CARD`임을 100회 이상 검증한다. 태그: `Feature: dinosaur-survival-mud-rebrand, Property 2`.
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 5.8 속성 테스트: 거부된 행동의 상태 불변
    - **Property 3: 거부된 행동은 게임 상태를 바꾸지 않는다**
    - `tests/properties/rejected-actions.test.mjs`에서 카드 없는 `restore power`, 위치 부적합 `restore power`, 빈 테이저 `shock`, 중복 `take card` 후 `state` 깊은 동등을 검증한다.
    - **Validates: Requirements 6.3, 6.5, 6.6, 7.4**

  - [ ]* 5.9 속성 테스트: 스턴 상태 기계
    - **Property 4: 스턴 상태 기계**
    - `tests/properties/stun-machine.test.mjs`에서 임의의 전투 행동 시퀀스와 피해 굴림에 대해 참조 모델과 `resolveStunTurn` 결과를 비교한다.
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]* 5.10 속성 테스트: AI 응답 적용 판정
    - **Property 5: AI 응답 적용 판정**
    - `tests/properties/ai-apply.test.mjs`에서 임의의 토큰/현재 상태 쌍에 대해 `shouldApplyAiReply`가 조건을 모두 만족할 때만 `true`임을 검증한다.
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 9.7**

  - [ ]* 5.11 속성 테스트: AI 응답은 게임 규칙 상태를 바꾸지 않는다
    - **Property 6: AI 응답은 게임 규칙 상태를 바꾸지 않는다**
    - `tests/properties/ai-no-state.test.mjs`에서 유효한 임의 월드 엔진 JSON 적용 전후로 `hp`, `shells`, `flares`, `taserCharges`, `hasCard`, `room`, `won`, `over`, `raptorHp`가 동일함을 검증한다.
    - **Validates: Requirements 8.6, 9.4**

  - [ ]* 5.12 속성 테스트: 내레이션 정제
    - **Property 7: 내레이션 정제는 평문과 길이 상한을 보장한다**
    - `tests/properties/sanitize-narration.test.mjs`에서 임의 문자열에 대해 마크다운 기호/코드 펜스 0건, 길이 2,000자 이하, 공백 전용/비문자열 입력은 빈 문자열임을 검증한다.
    - **Validates: Requirements 9.2, 9.3**

- [x] 6. 옛 명칭 검사
  - [x] 6.1 검사기와 데이터 파일 구현
    - `tests/legacy-terms.json`(용어와 단어 경계 규칙, 이전 회사 이름은 단어 경계), `tests/legacy-allowlist.json`(파일+이유)을 만든다.
    - `tests/verify-legacy-terms.mjs`에 순수 함수 `scanLegacyTerms(text, terms)`와 `scanFiles(root, terms, allowlist)`를 구현한다. 대상은 `index.html`, `README.md`, `.kiro/**`, `tests/**`이며 이미지/영상은 제외하고 경로를 "미검증 범위"로 나열한다. 미해결 0건이면 종료 코드 0, 아니면 1.
    - 결과를 `tests/.results/legacy-scan.json`에 기록한다(검색 파일 수, 일치 목록, 허용 항목 구분).
    - _Requirements: 5.4, 11.1, 11.2, 11.3, 11.5, 11.7_

  - [ ]* 6.2 속성 테스트: 옛 명칭 검사기
    - **Property 1: 옛 명칭 검사기의 완전성과 정확성**
    - `tests/properties/legacy-scan.test.mjs`에서 용어를 임의 대소문자로 임의 위치에 삽입하면 줄 번호와 용어가 보고되고, 용어 없는 텍스트는 0건임을 검증한다.
    - **Validates: Requirements 3.4, 4.1, 4.7, 4.8, 5.1, 5.2, 11.1, 11.2, 11.3**

  - [x] 6.3 잔존 명칭 제거와 참조 무결성 확인
    - `node tests/verify-legacy-terms.mjs`를 실행해 허용 목록 밖 일치를 `Rebrand_Names`로 수정하고, `tests/` 안 기대값(예: `verify-textmud.mjs` 헤더 주석)도 갱신한 뒤 재검색해 0건을 확인한다. 수정하지 못한 항목은 파일 경로와 줄 번호로 기록한다.
    - 새 문자열의 `BRAND` 철자를 대소문자 구분 검색으로 확인하고, `README.md`와 `.kiro/specs/`의 링크/백틱 경로 로컬 존재를 검사해 깨진 참조 0건을 확인한다.
    - _Requirements: 5.2, 5.7, 11.4, 11.6, 11.8_

- [x] 7. Live_Check
  - [x] 7.1 키 가림 모듈과 실제 호출 스크립트 정리
    - `tests/lib/scrub.mjs`에 `scrub(text, key)`를 구현하고, `tests/verify-live-gemini.mjs`가 이를 거쳐서만 출력하게 한다.
    - 키가 없으면 종료 코드 3과 "미검증(키 없음)", 호출은 최대 3회/30초 타임아웃, 기록은 HTTP 상태/응답 길이/형태/옛 명칭 포함 여부(예/아니오)만 한다. 비 200, 타임아웃, 네트워크 오류도 중단 없이 `tests/.results/live.json`을 남긴다.
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.7, 16.6, 16.7_

  - [ ]* 7.2 속성 테스트: 키 값 가림
    - **Property 8: 키 값 가림**
    - `tests/properties/scrub.test.mjs`에서 임의 출력 문자열과 비어 있지 않은 키에 대해 `scrub` 결과가 키를 부분 문자열로 포함하지 않음을 검증한다.
    - **Validates: Requirements 14.3, 16.6, 16.7**

- [x] 8. 검증 보고서
  - [x] 8.1 보고서 생성기 구현
    - `tests/build-report.mjs`에 `buildReport(results) -> string`을 구현한다. `tests/.results/*.json`을 읽어 `.kiro/specs/dinosaur-survival-mud-rebrand/verification-report.md`를 만든다.
    - 필수 17개 기능 상수 배열, 상태 4종 중 정확히 하나와 500자 이하 근거, 명령/환경/결과 필드, 결과 없는 항목은 "미검증"과 사유를 채운다. 오디오와 실제 디스플레이 렌더링은 사람 확인 입력이 없으면 "미검증"으로 고정한다.
    - Fake_Fetch 절과 Live_Check 절을 분리해 통과/실패 건수를 따로 표시하고, 실제 AI 연동 성공은 Live_Check가 HTTP 200일 때만 인정한다.
    - 사전 조사 결과, 이름 후보 웹 검색 기록(검색 실패 시 "미확인"), 스펙 변경 목록, 헤드리스 확인과 실제 디스플레이 확인 구분, "프로젝트 소유자 확인 필요" 잔여 항목(상표/저작권/설정 유사성/Existing_Demo_Video 교체)을 포함한다.
    - 데모 재녹화 순서(사전 점검, 제목 5초, 인트로 8초, 로비 전투 20초, 연구실 12초, 관제실 승리 15초, 재시작 5초 = 65초)의 합계가 60~90초인지 검사한다.
    - _Requirements: 3.6, 3.7, 3.8, 14.1, 14.6, 15.1, 15.2, 15.3, 15.6, 15.8, 15.9, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

  - [ ]* 8.2 속성 테스트: 보고서 완전성
    - **Property 9: 보고서 완전성**
    - `tests/properties/report.test.mjs`에서 부분적이거나 빈 입력에 대해 17개 기능 모두 포함, 상태 정확히 1개, 근거 500자 이하, 사람 확인 없는 오디오/실제 렌더링은 "검증됨" 아님을 검증한다.
    - **Validates: Requirements 17.1, 17.2, 17.4, 17.6, 17.8**

  - [x] 8.3 전체 검증 실행과 보고서 생성
    - 순서대로 실행한다: `node tests/verify-legacy-terms.mjs`, `node tests/verify-textmud.mjs`, (키가 있을 때만) `node tests/verify-live-gemini.mjs`, `node tests/build-report.mjs`. 속성 테스트가 설치되어 있으면 `node --test tests/properties`도 실행한다.
    - 이름 후보 3개(제목, 섬, 회사)의 웹 검색 결과를 결과 파일에 반영해 보고서를 생성하고, 실행한 항목만 `.kiro/specs/dinosaur-survival-mud-rebrand/tasks.md`의 `[x]`로 갱신한다. 커밋과 푸시는 하지 않는다.
    - _Requirements: 2.5, 10.3, 14.1, 16.1, 16.5, 17.1_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 표시 작업(속성 테스트)은 선택 사항이며 빠른 MVP에서는 건너뛸 수 있다. 건너뛰면 보고서에서 관련 기능을 "부분 검증"으로 표시한다.
- 각 작업은 요구사항 번호로 추적한다.
- 오디오, 실제 디스플레이 렌더링, 실제 Gemini 응답 품질, 이미지/영상 속 옛 명칭, 법적 검토, Existing_Demo_Video 교체는 자동화로 검증되지 않으며 "미검증" 또는 "프로젝트 소유자 확인 필요"로 남는다.
- 이 작업 목록에는 커밋, 푸시, 원격 게시 작업이 없다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1"] },
    { "id": 4, "tasks": ["2.2"] },
    { "id": 5, "tasks": ["2.3"] },
    { "id": 6, "tasks": ["3.1", "6.1"] },
    { "id": 7, "tasks": ["3.2", "6.2"] },
    { "id": 8, "tasks": ["3.3"] },
    { "id": 9, "tasks": ["4.1"] },
    { "id": 10, "tasks": ["4.2"] },
    { "id": 11, "tasks": ["4.3"] },
    { "id": 12, "tasks": ["4.4"] },
    { "id": 13, "tasks": ["5.1", "7.1", "8.1"] },
    { "id": 14, "tasks": ["5.2", "7.2", "8.2"] },
    { "id": 15, "tasks": ["5.3", "5.7", "5.8", "5.9"] },
    { "id": 16, "tasks": ["5.4", "5.10", "5.11", "5.12"] },
    { "id": 17, "tasks": ["5.5"] },
    { "id": 18, "tasks": ["5.6"] },
    { "id": 19, "tasks": ["6.3"] },
    { "id": 20, "tasks": ["8.3"] }
  ]
}
```
