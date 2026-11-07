# 검증 보고서

> 자동 생성 파일(tests/build-report.mjs). API 키와 응답 본문은 포함하지 않는다.

## 기능별 검증 상태

| 기능 | 상태 | 근거 | 명령 | 환경(브라우저, 뷰포트) | 결과 |
| --- | --- | --- | --- | --- | --- |
| 이름 일관성 | 검증됨 | 통과 39건. document.title equals BRAND.title; #brand-header text equals expected; static <title> literal equals BRAND.title | 해당 없음 | msedge.exe, 1280x800 | 통과 39 / 실패 0 / 건너뜀 0 |
| 방 이동 | 검증됨 | 통과 30건. no key: zero fetch calls; pack cleared with two shells; lobby->control: "north" -> control, only that 3D group visible | node tests/repro-bugs.mjs | msedge.exe, 뷰포트 미기록 | 통과 30 / 실패 0 / 건너뜀 0 |
| 샷건 | 검증됨 | 통과 1건. shoot: shells -1 exactly, taser/flares unchanged | 해당 없음 | msedge.exe, 1280x800 | 통과 1 / 실패 0 / 건너뜀 0 |
| 테이저와 스턴 | 검증됨 | 통과 57건. surviving shock stuns: no counter, stunRecovery true; stun log line printed exactly once; next action is normal with counter; shock during recovery does not stun | node tests/repro-bugs.mjs | msedge.exe, 뷰포트 미기록 | 통과 57 / 실패 0 / 건너뜀 0 |
| 조명탄 | 검증됨 | 통과 1건. flare: flares -1 exactly, shells/taser unchanged | 해당 없음 | msedge.exe, 1280x800 | 통과 1 / 실패 0 / 건너뜀 0 |
| 카드 획득 | 검증됨 | 통과 5건. take card: hasCard true (inventory +1) and pickup message; take card: only hasCard changed; inventory lists the card | 해당 없음 | msedge.exe, 1280x800 | 통과 5 / 실패 0 / 건너뜀 0 |
| 관제실 승리 | 검증됨 | 통과 8건. control room win: won true in control; control room win: victory text contains BRAND.island; restore power without card: reject message | 해당 없음 | msedge.exe, 1280x800 | 통과 8 / 실패 0 / 건너뜀 0 |
| 발전소 승리 | 검증됨 | 통과 2건. generator win: won true in generator; generator win: victory text contains BRAND.island | 해당 없음 | msedge.exe, 1280x800 | 통과 2 / 실패 0 / 건너뜀 0 |
| 게임 오버와 재시작 | 검증됨 | 통과 3건. player reached game over; game over reached with mutated state; restart after game over: fields equal initial values | 해당 없음 | msedge.exe, 1280x800 | 통과 3 / 실패 0 / 건너뜀 0 |
| 늦은 AI 응답 차단 | 검증됨 | 통과 30건. 1. lobby reply after moving to lab: no narration in lab; 1. lobby reply after moving to lab: no new log lines; 1. lobby reply after moving to lab: light/fog/intensity/anim unchanged | node tests/repro-bugs.mjs | msedge.exe, 1280x800 | 통과 30 / 실패 0 / 건너뜀 0 |
| 기본 정보 우선 출력 | 검증됨 | 통과 5건. 5. look with key: header, THREAT, Exits logged while reply pending; 5. AI text appended after base text on resolve; GEMINI_TIMEOUT_MS equals 10000 | node tests/repro-bugs.mjs | msedge.exe, 1280x800 | 통과 5 / 실패 0 / 건너뜀 0 |
| 네트워크 실패 처리 | 검증됨 | 통과 39건. 4. HTTP 500 via look: base text unchanged, no extra AI text; 4. HTTP 500 via look: room and exits unchanged; 4. HTTP 500 via look: next command (status) works | 해당 없음 | msedge.exe, 1280x800 | 통과 39 / 실패 0 / 건너뜀 0 |
| 실제 AI API | 검증됨 | 통과 3건. live call 1; live call 2; live call 3 | node tests/verify-live-gemini.mjs | 브라우저 미기록, 뷰포트 미기록 | 통과 3 / 실패 0 / 건너뜀 0 |
| 3D 장면 표시 | 미검증 | 입력 결과 없음: tests/.results 에 이 기능의 결과가 없다. 실제 디스플레이 확인도 없음. | 해당 없음 | 브라우저 미기록, 뷰포트 미기록 | 통과 0 / 실패 0 / 건너뜀 0 |
| 오디오 | 미검증 | 입력 결과 없음: tests/.results 에 이 기능의 결과가 없다. 사람 확인 입력(tests/.results/human.json) 없음: 자동화만으로 소리 출력은 확인할 수 없다. | 해당 없음 | 브라우저 미기록, 뷰포트 미기록 | 통과 0 / 실패 0 / 건너뜀 0 |
| 왼쪽 텍스트 잘림 | 검증됨 | 통과 30건. 1920x1080 header; 1920x1080 #brand-header; 1920x1080 intro first log node | 해당 없음 | C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe, 1920x1080 | 통과 30 / 실패 0 / 건너뜀 0 |
| 명칭 잔존 검색 | 검증됨 | 통과 189건. 명칭 잔존 검색; README.md:41 index.html; README.md:57 .kiro/specs/dinosaur-survival-spec.md | node tests/verify-legacy-terms.mjs | 브라우저 미기록, 뷰포트 미기록 | 통과 189 / 실패 0 / 건너뜀 0 |

요약: 검증됨 15, 부분 검증 0, 미검증 2, 실패 0 (총 17개)

## 실행 명령과 종료 코드

- `node tests/verify-legacy-terms.mjs`: 종료 코드 0
- `node tests/verify-refs.mjs`: 종료 코드 0
- `node tests/verify-textmud.mjs`: 종료 코드 0
- `node tests/verify-ai-fake.mjs`: 종료 코드 0
- `node tests/verify-layout.mjs`: 종료 코드 0
- `node tests/repro-bugs.mjs`: 종료 코드 0
- `node tests/verify-live-gemini.mjs`: 종료 코드 4
- `node tests/build-report.mjs`: 종료 코드 0

## 사전 조사

- 작업: 1.1, 시각: 2026-11-07T14:44:53.4093321+09:00
- 같은 저장소 여부: true
- 조사 경로 2개, 오류 0건
- 커밋되지 않은 파일: 13개
- 비고: Uncommitted changes preserved (Codex-made); never reverted.

## 스펙 변경

- `.kiro/specs/dinosaur-survival-spec.md`: 제목, 1. Setting & Narrative Premise, 방 그래프/아이템, 구현 지시, 미확인 사항(권리)
- `.kiro/specs/final-polish-spec.md`: 제목, AI 내레이터 프롬프트
- `.kiro/specs/hardening-spec.md`: 제목
- `.kiro/specs/visual-polish-spec.md`: 제목
- `.kiro/specs/requirements.md`: LEGACY 배너, 이전 버전 기록, 현재 5개 방 구성 (요약)
- `.kiro/specs/design.md`: 이전 버전 기록, 현재 5개 방 구성 (요약)
- `.kiro/specs/tasks.md`: 제목, 항목 20, 항목 21, 항목 11, 항목 22 (task 2.2 파일 이름 변경 기록), 항목 22-26 / 병합 이력 (Rebrand work)
- `.kiro/specs/dinosaur-survival-mud-rebrand/requirements.md`: 소개, Glossary: Legacy_Terms, 요구사항 4 (로그인/승리/대사/카드 명령), 파일명 목록, 파일 이름 변경 조항
- `.kiro/specs/dinosaur-survival-mud-rebrand/design.md`: 현황 표, 파일 이름 변경, 교체 표, classifyCommand, 옛 명칭 검사 데이터, legacy-terms.json 예시, Property 2
- `.kiro/specs/dinosaur-survival-mud-rebrand/tasks.md`: 3.2, 5.7, 6.1
- 남은 옛 명칭 일치: 미기록

## Fake_Fetch 결과

- 통과 233건, 실패 0건, 건너뜀 0건
- 가짜 응답(Fake_Fetch)으로 얻은 결과이며 실제 AI 연동 성공으로 인정하지 않는다.

## Live_Check 결과

- 통과 3건, 실패 0건, 건너뜀 0건
- 실제 AI 연동: 성공(HTTP 200 확인)

## 이름 후보 검색 기록

- 제목: Dinosaur Survival MUD 3D / 검색: "Dinosaur Survival MUD 3D" / 결과: 동일 이름 없음. 유사 이름 있음: "Dino Survival: 3D Simulator"(CrazyGames), "Dino Survival : Simulator 3D"(Google Play), "Dinosaur Survival 3D" 계열 앱(App Store), "Dinosaur S…
- 섬: Ashfen Island / 검색: "Ashfen Island" / 결과: 동일 이름 없음(상위 결과는 Ash Island 등 다른 섬). 유사 이름: ashfen-dnd.neocities.org(Ashfen 이라는 D&D 설정 페이지)
- 회사: Calderyn Biosciences / 검색: "Calderyn Biosciences" / 결과: 동일 이름 없음. 유사 이름 있음: Calder Biosciences(백신 설계 바이오 회사, 미국)
- 회사: Calderyn / 검색: Calderyn company / 결과: 동일 이름 있음: Calderyn(calderyncompany.com, 온라인 스토어 서비스). 유사 이름: Calderys(내화물 제조 대기업), Calderynx(트레이딩 플랫폼)

## 속성 테스트

- fast-check 설치 보류(사용자 결정): 속성 테스트 미실행

## 헤드리스 확인과 실제 디스플레이 확인

### 헤드리스 확인
- 늦은 AI 응답 차단, 네트워크 실패 처리, 기본 정보 우선 출력, 왼쪽 텍스트 잘림, 명칭 잔존 검색, 실제 AI API, 테이저와 스턴, 방 이동, 게임 오버와 재시작, 샷건, 조명탄, 카드 획득, 관제실 승리, 발전소 승리, 이름 일관성

### 실제 디스플레이 확인
- 3D 장면의 실제 화면 표시: 미확인
- 오디오 출력: 미확인
- 1920x1080, 1280x720 실제 화면 텍스트 잘림: 미확인

## 프로젝트 소유자 확인 필요

- 상표 검토
- 저작권 검토
- 설정 유사성 검토
- Existing_Demo_Video 교체

## 고지

- 기존 데모 영상은 이전 버전을 녹화한 것이며 이번 변경으로 바뀌지 않았다.
- 이름을 바꾸었다고 해서 법적 안전이 보장되지 않는다.

## 데모 재녹화 순서

| 단계 | 내용 | 명령 | 시간(초) |
| --- | --- | --- | --- |
| 1 | 사전 점검: API 키 입력란이 password 로 마스킹되어 있거나 오프라인 모드인지 확인 | `(화면 확인) 키 입력란 type="password" 또는 키 없이 오프라인 실행` | 0 |
| 2 | 제목 화면: 제목 화면 표시 | `(페이지 로드)` | 5 |
| 3 | 인트로: 인트로 문구 표시 | `(자동 재생)` | 8 |
| 4 | 로비 전투: shoot, shock, flare 각 1회 이상, 랩터 무리 처치까지 반복 | `shoot, shock, flare, shoot, shoot ... (무리가 죽을 때까지)` | 20 |
| 5 | 연구실 이동과 카드 획득: 처치 후 동쪽 연구실로 이동해 카드 획득, 로비로 복귀 | `east, take card, west` | 12 |
| 6 | 관제실 이동과 승리: 북쪽 관제실로 이동해 전원 복구 | `north, restore power` | 15 |
| 7 | 재시작: 재시작 | `restart` | 5 |

합계: 65초 (허용 범위 60~90초)

참고: 녹화 전 왼쪽 터미널 텍스트가 1920x1080 과 1280x720 에서 잘리지 않는지 확인한다.
