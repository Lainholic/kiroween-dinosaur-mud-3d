# Requirements Document

## Introduction

Kiroween에 제출한 이전 영화 기반 게임 제목으로 독자적인 공룡 생존 게임 "Dinosaur Survival MUD 3D"(가칭)로 수정한다. 레트로 텍스트 MUD, 3D 뷰, 공룡 전투, 연구실 카드 획득, 발전소 복구, 선택형 AI 내레이션이라는 기본 구조와 현재 진행 경로(로비, 연구실, 관제실, 랩터 우리, 발전소)는 유지한다. 기존 유명 작품에서 온 고유 명칭, 대사, 설정은 이름, 대사, 배경 설정에서 제거하고 독자적인 섬과 회사로 교체한다.

이 문서는 다음 사항도 함께 다룬다.

- 구현 전 사전 조사(작업 폴더 관계 확인, 기존 스펙과 README 검토)
- 알려진 버그 4건의 수정 또는 재검증
- 이름 일관성, 기능, 실제 AI API에 대한 검증과 보고

### 조사로 확인된 현재 상태 (작성 시점)

- Kiro 작업 폴더 `c:\AI\projects\kiroween-textmud-3d`와 독립 저장소 `C:\AI\projects\kiroween-textmud-3d`는 대소문자만 다른 같은 경로이다. 링크나 정션이 아니며 `git rev-parse --show-toplevel` 결과도 동일하다. 즉 저장소는 하나이다.
- 이 저장소에는 커밋되지 않은 변경이 있다. 수정된 파일은 `index.html`, `README.md`, `.kiro/specs/*.md` 8개이다. 새로 추적되지 않는 항목은 `tests/`와 본 스펙 폴더이다. 사용자는 이 변경이 Codex가 만든 것이라고 밝혔고, 이 요구사항은 이를 덮어쓰거나 되돌리지 않는 것을 전제로 한다.
- 커밋되지 않은 `index.html`과 이전 스펙 파일(현재 `.kiro/specs/dinosaur-survival-spec.md`) 7~8절, `tasks.md` 15~18번은 이미 테이저 스턴, 오래된 AI 응답 폐기, 기본 정보 우선 출력이 구현되고 가짜 응답으로 검증되었다고 기록한다. 따라서 알려진 버그 1~4는 "새로 구현"이 아니라 "현재 코드에서 재현 여부를 먼저 확인한 뒤 필요한 부분만 수정"한다.
- 옛 고유 명칭은 `index.html` 18곳, `README.md` 7곳, `.kiro/specs/*.md` 여러 곳, `tests/verify-textmud.mjs` 1곳에서 확인되었다. 원작 영화 대사도 원작 대사이므로 제거 대상이다.
- `tasks.md`는 이미 "5개 방" 기준으로 갱신되었고, `requirements.md`와 `design.md`는 v1 던전 프로토타입을 설명하는 LEGACY 문서이다. 실제 AI API 검증(task 19)은 HTTP 402로 통과하지 못했다.

## Glossary

- **Game**: 브라우저에서 실행되는 단일 파일 `index.html` 기반 "Dinosaur Survival MUD 3D"
- **Rebrand_Names**: 이 스펙에서 정하는 독자적 명칭 집합. 아래 4개 항목을 포함한다.
  - 게임 제목: "Dinosaur Survival MUD 3D"(가칭)
  - 섬 이름: "Ashfen Island"(애쉬펜 섬)(가칭)
  - 회사 이름: "Calderyn Biosciences"(칼데린 바이오사이언스)(가칭)
  - 카드 이름: "Calderyn Security Passcard"
- **Legacy_Terms**: 제거 대상 옛 고유 명칭 집합. 이전 영화 기반 게임 제목, 이전 섬 이름, 이전 회사 이름, 이전 관리자 로그인 이름, 원작 영화 대사(정확한 목록은 `tests/legacy-terms.json`, task 6.1에서 생성), 그리고 조사에서 추가로 발견되는 원작 유래 인물명, 대사, 설정을 포함한다.
- **Generic_Terms**: 특정 작품의 고유 명칭이 아닌 일반 용어. Velociraptor, T-Rex, raptor, Visitor Center, Genetics Laboratory, shotgun, taser, flare 등이다. 유지 가능하다.
- **Room_Graph**: 5개 방 `lobby`, `lab`, `control`, `pen`, `generator`와 그 연결 구조
- **Stun**: 살아남은 랩터 무리가 한 턴 동안 반격하지 못하는 상태. 규칙은 이전 스펙 파일(현재 `dinosaur-survival-spec.md`) 7절
- **AI_Narrator**: 선택형 Gemini 기반 내레이션 및 월드 엔진 요청 처리부
- **Base_Room_Text**: 코드가 생성하는 방 설명, 위협 정보, 출구 정보
- **Stale_Response**: 요청 시점과 다른 방, 재시작, 게임 오버, 승리 이후, 또는 더 새로운 요청이 이미 적용된 뒤에 도착한 AI 응답
- **Fake_Fetch**: 네트워크 없이 AI 응답, 지연, 실패를 흉내 내는 테스트용 `fetch` 대체 구현
- **Live_Check**: 실제 Gemini 엔드포인트를 호출하는 검증. 가짜 응답 테스트와 분리한다.
- **Verification_Report**: 기능별 검증됨, 미검증, 실패 범위를 구분해 기록한 최종 보고서
- **Working_Tree_Snapshot**: 작업 시작 전 커밋되지 않은 변경 상태를 저장소 밖에 보존한 백업(패치 파일과 파일 사본)
- **Demo_Recording_View**: 데모 영상을 녹화하는 화면 크기와 배치
- **Existing_Demo_Video**: 이전 게임을 녹화해 이미 공개된 데모 영상

## Requirements
### Requirement 1: 사전 조사 - 저장소 관계와 미커밋 변경 보호

**User Story:** 개발자로서, 두 저장소 경로의 관계를 먼저 확인하고 Codex가 만든 미커밋 변경을 보호하고 싶다. 그래야 기존 작업이 사라지지 않는다.

#### Acceptance Criteria

1. WHEN 구현 작업을 시작하기 전, THE Game 작업 절차 SHALL Kiro 작업 폴더와 독립 저장소 각각에 대해 실제 경로(심볼릭 링크와 junction을 해석한 절대 경로), `git rev-parse --show-toplevel`로 얻은 git 최상위 경로, 링크 여부(링크 / 비링크)를 확인해 Verification_Report에 기록한다.
2. IF 두 경로 중 하나라도 존재하지 않거나 git 저장소가 아니거나 경로 확인 명령이 실패하면, THEN THE Game 작업 절차 SHALL 실패한 경로와 실패 사유를 Verification_Report에 기록하고, 파일을 수정하지 않은 채 작업을 중단한다.
3. WHEN 두 경로의 실제 경로 또는 git 최상위 경로가 서로 다르면, THE Game 작업 절차 SHALL 두 저장소의 `git status --porcelain` 출력과 `git diff` 출력을 비교해, 파일별 차이(한쪽에만 있는 변경 파일, 양쪽에 있으나 내용이 다른 파일)를 Verification_Report에 기록한다.
4. WHEN 두 경로의 실제 경로와 git 최상위 경로가 모두 같으면, THE Game 작업 절차 SHALL 동일 저장소라는 사실과 판단 근거(비교한 실제 경로 및 git 최상위 경로 값)를 Verification_Report에 기록한다.
5. WHEN 첫 번째 파일을 수정하기 전, THE Game 작업 절차 SHALL 각 저장소의 `git status --porcelain` 출력, 추적 파일의 `git diff` 출력, 미추적 파일의 사본을 포함한 Working_Tree_Snapshot을 두 저장소 작업 트리 바깥 경로에 생성하고, 생성한 경로와 포함된 파일 수를 Verification_Report에 기록한다.
6. IF Working_Tree_Snapshot 생성이 실패하거나 스냅샷의 파일 수가 `git status --porcelain`에 나열된 변경 파일 수와 일치하지 않으면, THEN THE Game 작업 절차 SHALL 파일 수정을 시작하지 않고 실패 사유를 Verification_Report에 기록한다.
7. THE Game 작업 절차 SHALL Codex가 만든 미커밋 변경 중 이번 요구사항과 무관한 줄을 덮어쓰거나 되돌리지 않고, 변경이 필요한 함수나 문단만 수정한다.
8. THE Game 작업 절차 SHALL `git reset --hard`, `git checkout -- <file>`, `git restore`, `git stash`, `git clean`, `git push --force`, `git push --force-with-lease`를 실행하지 않는다.
9. IF 수정 대상 파일의 미커밋 변경이 요구사항과 충돌하면, THEN THE Game 작업 절차 SHALL 충돌 파일명, 충돌 줄 범위, 선택한 처리 방법을 Verification_Report에 기록하고, 충돌하지 않는 미커밋 변경은 수정 전후 `git diff` 비교로 동일하게 유지됨을 확인한다.

### Requirement 2: 사전 조사 - 기존 스펙과 README 검토 후 스펙 우선 반영

**User Story:** 개발자로서, 구현 전에 기존 스펙과 README를 읽고 새 방향을 스펙에 먼저 반영하고 싶다. 그래야 문서와 코드가 어긋나지 않는다.

#### Acceptance Criteria

1. WHEN 구현 작업을 시작하기 전, THE Game 작업 절차 SHALL `README.md`와 `.kiro/specs/` 아래 8개 문서(`design.md`, `final-polish-spec.md`, `gemini-world-engine.md`, `hardening-spec.md`, `dinosaur-survival-spec.md`(변경 전 이름은 이전 영화 기반 이름), `requirements.md`, `tasks.md`, `visual-polish-spec.md`)를 모두 읽고, 읽은 문서 9개의 파일명을 Verification_Report에 기록한다.
2. WHEN 9개 문서 읽기가 완료되면, THE Game 작업 절차 SHALL 새 방향(Rebrand_Names, Legacy_Terms 제거 규칙, 버그 수정 범위) 3개 항목을 `.kiro/specs/` 아래 문서에 반영한 뒤에 `index.html` 구현을 시작한다.
3. WHEN 기존 스펙 문서를 수정하면, THE Game 작업 절차 SHALL 수정 전 유효한 내용을 삭제하지 않고 보존하며, 수정한 문서명과 변경한 절 제목을 Verification_Report에 기록한다.
4. THE Game 작업 절차 SHALL `.kiro/steering/project.md`의 지침(기존 코드 보존, 작은 단위 작업, 외부 의존성 추가 금지, `tasks.md` 체크 갱신)을 따른다.
5. WHEN `tasks.md`의 작업 하나를 완료하면, THE Game 작업 절차 SHALL 해당 항목의 `[ ]`를 `[x]`로 즉시 갱신한다.
6. IF 문서가 인코딩 문제로 깨져 보이면(예: `gemini-world-engine.md`), THEN THE Game 작업 절차 SHALL 파일의 바이트를 직접 읽어 UTF-8 디코딩 가능 여부를 확인하여 원인이 파일 자체인지 터미널 표시인지 판별하고, 파일 자체가 깨진 경우에만 해당 문서를 정리하며 판별 결과를 Verification_Report에 기록한다.
7. IF `.kiro/steering/project.md` 또는 8개 스펙 문서 중 하나라도 존재하지 않거나 읽을 수 없으면, THEN THE Game 작업 절차 SHALL 구현을 시작하지 않고 누락된 파일명을 Verification_Report에 기록한다.

### Requirement 3: 제목과 독자적 명칭 도입

**User Story:** 플레이어로서, 게임이 기존 유명 작품과 구별되는 이름과 배경을 가지길 원한다. 그래야 독자적인 작품으로 즐길 수 있다.

#### Acceptance Criteria

1. WHEN 게임 페이지가 로드되면, THE Game SHALL 브라우저 탭 제목과 화면 상단 제목 두 곳 모두에 정확히 "Dinosaur Survival MUD 3D"를 대소문자와 띄어쓰기까지 동일하게 표시한다.
2. WHEN 게임이 섬 이름이나 회사 이름을 화면 텍스트, 게임 내 문서, 안내 메시지 중 어디에든 표시하면, THE Game SHALL 섬 이름은 "Ashfen Island", 회사 이름은 "Calderyn Biosciences"로 표시한다.
3. WHEN 플레이어가 인벤토리, 아이템 설명, 또는 잠금 장치 메시지에서 연구실 카드를 확인하면, THE Game SHALL 해당 카드의 표시 이름을 "Calderyn Security Passcard"로 표시한다.
4. THE Game SHALL 제목, 섬 이름, 회사 이름, 연구실 카드 이름의 모든 표시 문자열에서 Legacy_Terms 목록의 각 용어를 대소문자 구분 없이 검색했을 때 0건이 되도록 한다.
5. WHERE 사용자가 제목, 섬 이름, 회사 이름 중 하나 이상을 다른 값으로 확정하면, THE Game 작업 절차 SHALL Rebrand_Names를 단일 정의 위치 1곳에서 선언하고, 코드와 문서(README 포함)의 모든 해당 표시 문자열이 그 정의 값과 일치하도록 일괄 적용한다.
6. WHEN Rebrand_Names가 확정되면, THE Game 작업 절차 SHALL 확정된 각 이름(제목, 섬 이름, 회사 이름)마다 웹 검색을 1회 이상 수행하여 동일 이름의 기존 상표나 작품 존재 여부를 확인하고, 검색어, 확인 일자, 발견된 동일 이름 항목 목록(없으면 "없음")을 Verification_Report에 기록한다.
7. IF 웹 검색이 실패하거나 결과를 확인할 수 없으면, THEN THE Game 작업 절차 SHALL 해당 이름을 "미확인"으로 Verification_Report에 기록하고 검증 완료로 보고하지 않는다.
8. THE Game 작업 절차 SHALL 이름 변경이 법적 문제를 모두 해소한다고 보고하지 않으며, 상표, 저작권, 설정 유사성에 대한 확인을 프로젝트 소유자의 별도 판단이 필요한 미검증 항목으로 Verification_Report에 명시한다.

### Requirement 4: 코드 내 옛 명칭, 대사, 설정 제거

**User Story:** 플레이어로서, 화면에 나오는 모든 텍스트가 새 세계관과 맞길 원한다. 그래야 몰입이 깨지지 않는다.

#### Acceptance Criteria

1. THE Game SHALL 화면 제목, 인트로 텍스트, 방 설명, 카드 획득 문구, 카드 사용 문구, 도움말, 상태 문구, 인벤토리 문구, 승리 문구, 게임 오버 문구에서 Legacy_Terms를 0건 포함한다.
2. THE Game SHALL 터미널 로그인 이름 이전 관리자 로그인 이름을 새 회사 이름에서 파생한 이름으로 교체하고, 교체된 이름에 Legacy_Terms를 0건 포함한다.
3. THE Game SHALL 승리 문구에서 이전 섬 이름이 들어간 원작식 승리 문구를 새 섬 이름을 포함하고 원문과 일치하는 연속 단어가 4개 미만인 문장으로 교체한다.
4. THE Game SHALL 원작 영화 대사를 원문과 일치하는 연속 단어가 4개 미만인 시스템 메시지로 교체한다.
5. WHEN 플레이어가 `take card`, `take passcard`, `take security passcard` 중 하나를 입력하면, THE Game SHALL 현재 방에 카드가 있을 때 해당 입력을 카드 획득 명령으로 처리한다.
6. WHEN 플레이어가 이전 회사 이름이 들어간 카드 획득 명령을 입력하면, THE Game SHALL 이 입력을 카드 획득 명령으로 처리하지 않고 알 수 없는 명령에 대한 응답을 표시한다.
7. THE Game SHALL `SYSTEM_PROMPT`와 `NARRATOR_PROMPT`에서 Legacy_Terms를 0건 포함하고, 두 프롬프트가 새 섬 이름, 새 회사 이름, 새 게임 제목을 각각 1회 이상 포함하도록 한다.
8. THE Game SHALL 코드 주석, 변수명, 함수명, 로컬 저장소 키에서 Legacy_Terms를 0건 포함한다. 단, 기존 사용자의 저장된 API 키를 유지하기 위해 필요한 로컬 저장소 키 이름은 예외로 둔다.
9. WHEN 예외로 둔 로컬 저장소 키가 1개 이상 존재하면, THE Game SHALL 각 키의 이름, 유지 사유, 사용 위치(파일명과 줄 번호)를 Verification_Report에 기록한다.
10. THE Game SHALL Generic_Terms를 유지하고, 방 이름 Visitor Center Lobby, Genetics Laboratory, Main Control Room, Raptor Pen, Geothermal Generator를 대소문자와 철자까지 동일하게 유지한다.

### Requirement 5: 문서 전반의 명칭 일관성

**User Story:** 심사자로서, README와 스펙 문서가 새 게임과 일치하길 원한다. 그래야 제출물을 혼동 없이 평가할 수 있다.

#### Acceptance Criteria

1. WHEN 명칭 교체 작업이 완료되면, THE Game 작업 절차 SHALL `README.md`의 제목, 소개, 설명, 명령어 안내, 이미지 대체 텍스트 5개 영역 모두에서 Legacy_Terms 일치 건수를 0건으로 만든다. 단, 기준 4에 따라 허용 목록에 기록된 위치는 제외한다.
2. WHEN 명칭 교체 작업이 완료되면, THE Game 작업 절차 SHALL `.kiro/specs/` 아래 모든 문서의 제목과 본문에서 Legacy_Terms 일치 건수를 0건으로 만든다. 단, 기준 4에 따라 허용 목록에 기록된 위치는 제외한다.
3. WHEN 스펙 파일의 이름이 옛 작품 이름을 포함하면, THE Game 작업 절차 SHALL 이전 스펙 파일을 새 이름의 파일로 변경하고, 저장소 내 모든 문서에서 옛 파일 경로를 참조하는 건수를 0건으로 만든다.
4. IF 변경 이력 문서나 보고서에서 과거 이름을 언급해야 하면, THEN THE Game 작업 절차 SHALL 해당 언급 위치(파일 경로와 줄 번호)를 허용 목록에 기록하고, 해당 문장에 "이전 이름"임을 밝히는 문구를 포함한다.
5. THE Game 작업 절차 SHALL `README.md`의 데모 영상 링크 바로 앞뒤 1문장 이내에 "Existing_Demo_Video는 이전 게임을 녹화한 영상이며 이번 코드 변경으로 바뀌지 않았다"는 취지의 문구를 포함한다.
6. THE Game 작업 절차 SHALL GitHub 원격 저장소 URL, 유튜브 영상 URL, Devpost 항목의 문자열 값을 변경 전과 동일하게 유지하고, 이들이 이번 코드 변경으로 갱신되었다는 표현을 문서에 포함하지 않는다.
7. IF 명칭 교체 후 `README.md` 또는 `.kiro/specs/` 문서 안에 존재하지 않는 파일 경로를 가리키는 상호 참조가 1건 이상 발견되면, THEN THE Game 작업 절차 SHALL 해당 참조를 올바른 경로로 수정하거나 작업 완료로 보고하지 않고 깨진 참조 목록을 출력한다.

### Requirement 6: 기존 기능과 진행 경로 보존

**User Story:** 플레이어로서, 이름이 바뀌어도 기존 게임 흐름이 그대로 동작하길 원한다. 그래야 기존 기능이 사라지지 않는다.

#### Acceptance Criteria

1. THE Game SHALL Room_Graph(로비 N 관제실, 로비 E 연구실, 로비 W 랩터 우리, 관제실 E 발전소 및 각 방의 복귀 경로)를 변경 전과 동일하게 유지하고, 정의된 모든 방 연결에서 이동 명령 입력 후 1회 입력 처리 내에 목적지 방으로 전환한다.
2. WHEN 플레이어가 연구실에서 `take card`를 입력하고 카드가 인벤토리에 없으면, THE Game SHALL 카드를 인벤토리에 1개 추가하고 획득을 알리는 메시지를 출력한다.
3. IF 플레이어가 이미 카드를 가진 상태에서 연구실에서 `take card`를 입력하면, THEN THE Game SHALL 카드 개수를 1개로 유지하고 이미 보유 중임을 알리는 메시지를 출력한다.
4. WHEN 카드를 가진 플레이어가 관제실이나 발전소에서 `restore power`를 입력하면, THE Game SHALL 승리 상태로 전환하고 승리 메시지를 출력한다.
5. IF 카드가 없는 플레이어가 `restore power`를 입력하면, THEN THE Game SHALL 카드가 필요함을 알리는 거부 메시지를 출력하고 플레이어 HP, 인벤토리, 현재 방, 게임 상태를 변경하지 않는다.
6. IF 카드를 가진 플레이어가 관제실과 발전소 이외의 방에서 `restore power`를 입력하면, THEN THE Game SHALL 해당 위치에서는 사용할 수 없음을 알리는 거부 메시지를 출력하고 게임 상태를 변경하지 않는다.
7. WHEN 플레이어가 `shoot`, `blast`, `shock`, `taser`, `flare`, `status`, `inventory`, `look`, `restart` 또는 이동 명령을 입력하면, THE Game SHALL 이름 변경 이전 버전과 동일한 상태 변화와 출력 의미로 해당 명령을 처리한다.
8. THE Game SHALL 샷건, 테이저 충전량 3, 조명탄, 플레이어 HP, 랩터 무리 HP, 반격 피해 범위의 수치를 이름 변경 이전 버전의 값과 동일하게 유지한다.
9. THE Game SHALL 랩터 우리와 발전소에 대해 기존 스펙에 명시되지 않은 새로운 아이템, 퍼즐, 적을 0개 추가한다.
10. THE Game SHALL 화면 단일 파일 구조를 유지하고 새로운 npm 의존성이나 외부 라이브러리를 0개 추가한다.

### Requirement 7: 버그 수정 - 테이저 스턴

**User Story:** 플레이어로서, 테이저로 맞은 랩터가 한 턴 동안 반격하지 못하길 원한다. 그래야 문서에 적힌 대로 테이저를 전술적으로 쓸 수 있다.

#### Acceptance Criteria

1. WHEN 플레이어가 `shock`을 입력하고 테이저 충전량이 1 이상이며, `shock`이 랩터 무리의 체력을 0 초과로 남기고, 무리가 스턴 회복 상태가 아니면, THE Game SHALL 충전량을 1 감소시키고, 무리에 피해를 적용하고, 무리를 스턴 상태로 만들고, 해당 턴의 반격(플레이어 피해)을 0으로 처리한다.
2. WHILE 랩터 무리가 스턴 회복 상태이면, THE Game SHALL 다음 전투 행동(`shoot`, `shock`, `flare`) 1회를 일반 규칙으로 처리하고, 그 행동 처리 직후 스턴 회복 상태를 해제한다. 이때 `shock`은 피해를 주되 무리를 스턴시키지 않으며 무리가 정상적으로 반격한다.
3. WHEN `shock`이 랩터 무리의 체력을 0 이하로 만들면, THE Game SHALL 스턴 상태를 부여하지 않고 반격(플레이어 피해)을 0으로 한 채 처치 처리를 수행한다.
4. IF 테이저 충전량이 0일 때 `shock`을 입력하면, THEN THE Game SHALL 랩터 무리의 체력, 스턴 상태, 플레이어 체력, 충전량을 변경하지 않고 충전량 부족을 알리는 실패 메시지를 로그에 1회 출력한다.
5. WHEN `restart` 명령이 실행되거나 플레이어 체력이 0 이하가 되어 게임 오버가 발생하면, THE Game SHALL 스턴 회복 상태를 해제(false)로 초기화한다.
6. WHEN 랩터 무리가 스턴되면, THE Game SHALL 스턴 사실을 알리는 로그 줄을 1회 출력하고 3D 랩터 스턴 효과를 1.0초 이상 1.4초 이하 동안 표시한다.
7. IF 현재 코드에서 기준 1~6의 동작이 재현되지 않으면, THEN THE Game 작업 절차 SHALL 코드를 수정하지 않고, 시도한 입력 순서, 기대 결과, 실제 결과를 Verification_Report에 기록한다.

### Requirement 8: 버그 수정 - 이전 방의 늦은 AI 응답 차단

**User Story:** 플레이어로서, 방을 옮긴 뒤 이전 방에 대한 AI 응답이 나타나지 않길 원한다. 그래야 현재 방과 맞지 않는 설명이나 연출이 보이지 않는다.

#### Acceptance Criteria

1. WHEN THE AI_Narrator가 AI 요청을 보낼 때, THE AI_Narrator SHALL 재시작 횟수, 방 방문 카운터, 요청 순번(요청마다 1씩 증가하는 정수)을 해당 요청의 문맥 토큰으로 저장한다.
2. IF AI 응답이 도착했을 때 응답의 문맥 토큰 중 하나라도 현재 상태 값과 다르면, THEN THE AI_Narrator SHALL 해당 응답을 폐기하고 내레이션 로그, 3D 조명, 안개, 애니메이션, 게임 상태(HP, 탄약, 아이템, 현재 방, 승리/게임 오버 여부)를 변경하지 않는다.
3. WHEN 플레이어가 AI 응답 도착 전에 다른 방으로 이동하면, THE AI_Narrator SHALL 이전 방 요청의 응답을 폐기하여 새 방의 로그 출력과 3D 연출에 0건의 변경도 일으키지 않는다.
4. IF `restart` 명령, 게임 오버, 또는 승리가 AI 요청 전송 이후에 발생하고 그 요청의 응답이 도착하면, THEN THE AI_Narrator SHALL 해당 응답을 폐기한다.
5. IF 요청 순번이 더 큰 요청의 응답이 이미 적용된 뒤 요청 순번이 더 작은 요청의 응답이 도착하면, THEN THE AI_Narrator SHALL 이전 응답을 폐기한다.
6. THE AI_Narrator SHALL HP, 탄약, 아이템, 출구, 승리 여부를 AI 응답 내용에 의해 변경하지 않는다.
7. WHILE 플레이어가 요청 전송 시점과 같은 방에 머물러 있고 재시작이 발생하지 않은 상태에서, WHEN 가장 최신 요청 순번의 응답이 도착하면, THE AI_Narrator SHALL 응답의 내레이션과 3D 연출(조명, 안개, 애니메이션)을 정상 적용한다.
8. IF AI 응답이 폐기되면, THEN THE AI_Narrator SHALL 플레이어에게 오류 메시지를 표시하지 않고 기존 로그와 게임 상태를 그대로 유지한다.

### Requirement 9: 버그 수정 - AI 사용 시에도 기본 정보 우선 출력

**User Story:** 플레이어로서, AI가 켜져 있어도 방 설명과 출구, 위험 정보를 즉시 보고 싶다. 그래야 AI 지연이나 실패와 상관없이 게임을 진행할 수 있다.

#### Acceptance Criteria

1. WHEN API 키가 설정된 상태에서 플레이어가 방에 들어오거나 `look`을 입력하면, THE Game SHALL AI 응답 수신 여부와 관계없이 100ms 이내에 Base_Room_Text, 출구 정보, 위험 정보를 출력한다.
2. WHEN AI 응답이 요청 후 10초 이내에 유효한 텍스트(공백 제외 1자 이상 2,000자 이하)로 도착하면, THE Game SHALL Base_Room_Text 뒤에 AI 내레이션을 별도의 추가 문단으로 출력한다.
3. IF AI 요청이 오류로 끝나거나, 10초 이내에 응답이 없거나, 응답이 빈 문자열 또는 2,000자를 초과하면, THEN THE Game SHALL AI 내레이션을 출력하지 않고, 이미 출력된 Base_Room_Text와 출구 정보를 변경하지 않으며, 플레이어의 명령 입력을 계속 받을 수 있는 상태를 유지한다.
4. THE Game SHALL 출구와 위험 정보를 항상 코드가 생성한 문장으로 출력하고 AI 응답으로 대체하거나 수정하지 않는다.
5. IF API 키가 설정되어 있지 않으면, THEN THE Game SHALL 네트워크 요청 없이 100ms 이내에 오프라인 설명을 출력한다.
6. WHILE AI 요청이 진행 중인 동안, THE Game SHALL 플레이어의 명령 입력을 차단하지 않고 즉시 처리한다.
7. IF AI 응답이 도착했을 때 플레이어가 이미 다른 방으로 이동했다면, THEN THE Game SHALL 해당 응답을 출력하지 않고 폐기한다.

### Requirement 10: 스펙 문서와 구현 상태의 정합성

**User Story:** 개발자로서, 옛 스펙의 3개 방 설명과 중복된 작업 목록을 실제 구현과 검증 결과에 맞추고 싶다. 그래야 문서를 신뢰할 수 있다.

#### Acceptance Criteria

1. WHEN 스펙 문서 정리 작업이 수행되면, THE Game 작업 절차 SHALL `requirements.md`, `design.md`, `tasks.md`에서 방 구조를 설명하는 모든 위치를 현재 Room_Graph의 5개 방 기준으로 갱신하고, v1의 3개 방 설명은 "이전 버전 기록"이라는 제목 또는 표시를 가진 구획 안에 삭제 없이 보존한다.
2. WHEN `tasks.md`에 동일한 목표를 가진 작업 항목이 2개 이상 존재하거나 서로 모순되는 항목이 존재하면, THE Game 작업 절차 SHALL 해당 항목들을 1개 항목으로 병합하고, 병합 전 항목 번호, 병합 후 항목 번호, 병합 사유를 `tasks.md` 내 "병합 이력" 구획에 항목당 1줄 이상 기록한다.
3. WHEN `tasks.md`의 항목을 `[x]`로 표시하려 하면, THE Game 작업 절차 SHALL 해당 항목의 검증 명령을 실제로 실행하여 종료 코드 0 또는 명시된 기대 결과를 확인한 경우에만 `[x]`로 표시하고, 실행하지 않았거나 실패한 항목은 `[ ]`로 유지한다.
4. WHEN 리브랜딩 작업이 시작되면, THE Game 작업 절차 SHALL 리브랜딩 작업을 `tasks.md`에 기존 번호 체계를 잇는 번호 있는 작업 목록으로 추가하고, 각 작업 완료 직후 다음 작업을 시작하기 전에 해당 항목의 체크박스를 갱신한다.
5. IF 항목이 코드에 구현되어 있지 않으면(예: 명령 이력 `HistoryBuffer`), THEN THE Game 작업 절차 SHALL 해당 항목을 `[ ]`로 두고 항목 옆에 "미구현"이라는 문구를 명시하며, 구현 완료를 의미하는 표현(완료, 구현됨, `[x]`)을 사용하지 않는다.
6. WHERE v1 프로토타입을 설명하는 `requirements.md`와 `design.md`를 유지하는 경우, THE Game 작업 절차 SHALL 각 문서 최상단에 "LEGACY" 표시를 유지한다.
7. IF `requirements.md` 또는 `design.md`를 새 게임 기준으로 다시 작성하면, THEN THE Game 작업 절차 SHALL 변경된 파일명, 변경된 섹션 제목 목록, 삭제 또는 이전 버전 기록으로 이동한 섹션 목록을 Verification_Report에 기록한다.

### Requirement 11: 명칭 잔존 검사

**User Story:** 개발자로서, 옛 명칭이 어디에 남았는지 자동으로 확인하고 싶다. 그래야 누락 없이 제거할 수 있다.

#### Acceptance Criteria

1. WHEN 리브랜딩 작업이 끝나면, THE Game 작업 절차 SHALL `index.html`, `README.md`, `.kiro/` 아래 모든 파일(하위 디렉터리 포함), `tests/` 아래 모든 파일(하위 디렉터리 포함)에서 Legacy_Terms 목록의 각 항목을 대소문자 구분 없이 검색한다.
2. WHEN 검색이 끝나면, THE Game 작업 절차 SHALL 일치 항목마다 파일 경로, 줄 번호, 일치한 Legacy_Term을 Verification_Report에 기록한다.
3. IF 검색 결과가 0건이면, THEN THE Game 작업 절차 SHALL Verification_Report에 검색한 파일 수와 "일치 0건"을 기록한다.
4. IF 허용 목록에 없는 Legacy_Terms 일치 항목이 1건 이상 남아 있으면, THEN THE Game 작업 절차 SHALL 해당 항목을 Rebrand_Names로 수정하고 재검색하여 0건임을 확인하거나, 수정하지 못한 항목을 파일 경로와 줄 번호와 함께 Verification_Report의 미해결 항목으로 기록한다.
5. IF 허용 목록에 있는 Legacy_Terms 일치 항목이 발견되면, THEN THE Game 작업 절차 SHALL 해당 항목을 수정하지 않고 Verification_Report에 허용 항목으로 구분하여 기록한다.
6. WHEN `tests/` 아래 파일에서 Legacy_Terms를 기대값으로 사용하는 위치가 발견되면, THE Game 작업 절차 SHALL 해당 위치를 대응하는 Rebrand_Names 문자열로 갱신한다.
7. THE Game 작업 절차 SHALL 이미지, 영상 파일, 스크린샷에 포함된 옛 명칭을 텍스트 검색으로 확인할 수 없는 미검증 범위로 Verification_Report에 기록하고, 해당 파일의 경로를 함께 나열한다.
8. WHEN 새 문서나 코드 문자열을 작성하면, THE Game 작업 절차 SHALL 제목, 섬 이름, 회사 이름, 카드 이름 각각이 Rebrand_Names에 정의된 철자와 대소문자와 글자 단위로 일치하는지 대소문자 구분 검색으로 검사하고, 불일치 항목은 파일 경로와 줄 번호와 함께 Verification_Report에 기록한다.

### Requirement 12: 기능 검증 시나리오

**User Story:** 개발자로서, 핵심 기능을 자동화된 테스트로 확인하고 싶다. 그래야 리브랜딩으로 인한 회귀를 막을 수 있다.

#### Acceptance Criteria

1. WHEN 검증을 실행하면, THE 테스트 스위트 SHALL 정의된 모든 방 간 이동 명령과 각 이동의 복귀 경로를 실행하고, 이동 후 현재 방이 기대한 방과 일치하는지 확인한다.
2. WHEN 검증을 실행하면, THE 테스트 스위트 SHALL `shoot`, `shock`, `flare` 각각을 실행하여 동작 결과와 탄약, 충전량, 조명탄 수량이 명령당 기대한 값만큼 정확히 변하는지 확인한다.
3. WHEN 검증을 실행하면, THE 테스트 스위트 SHALL 카드 획득, 관제실 승리, 발전소 승리 시나리오를 각각 별도 케이스로 실행하고, 각 케이스에서 기대한 상태와 승리 문구가 표시되는지 확인한다.
4. WHEN 검증을 실행하면, THE 테스트 스위트 SHALL 게임 오버를 발생시킨 뒤 `restart`를 실행하고, 방 위치, 탄약, 충전량, 조명탄 수량, 카드 보유 여부, 게임 상태가 초기값과 일치하는지 확인한다.
5. WHEN 검증을 실행하면, THE 테스트 스위트 SHALL 화면 제목, 인트로, 모든 방 설명, 카드 문구, 승리 문구에 Rebrand_Names가 하나 이상 표시되고 Legacy_Terms가 0건인지 확인한다.
6. WHEN 검증을 실행하면, THE 테스트 스위트 SHALL 스턴 교대, 회복 턴, 치명 타격, 빈 테이저 케이스를 각각 별도로 실행하고, 각 케이스의 턴 결과와 자원 변화가 기대값과 일치하는지 확인한다.
7. WHEN 검증이 끝나면, THE 테스트 스위트 SHALL 실행 중 수집한 브라우저 콘솔 오류가 0건인지 확인하고, 1건 이상이면 해당 오류 내용을 출력하며 실패로 보고한다.
8. IF 헤드리스 브라우저를 찾을 수 없으면, THEN THE 테스트 스위트 SHALL 시나리오를 하나도 실행하지 않고, 브라우저를 찾지 못했다는 사유를 출력하며, 0이 아닌 종료 코드로 종료한다.
9. IF 하나 이상의 시나리오가 실패하면, THEN THE 테스트 스위트 SHALL 실패한 시나리오 이름과 기대값, 실제값을 출력하고 0이 아닌 종료 코드로 종료한다.

### Requirement 13: AI 응답 지연 및 네트워크 실패 검증 (가짜 응답)

**User Story:** 개발자로서, 네트워크 없이 AI 지연과 실패를 결정적으로 재현하고 싶다. 그래야 늦은 응답 버그를 안정적으로 검증할 수 있다.

#### Acceptance Criteria

1. THE 테스트 스위트 SHALL Fake_Fetch를 사용해 외부 네트워크 접속 0건, 실제 API 키 사용 0건으로 모든 AI 시나리오를 실행한다.
2. WHEN Fake_Fetch가 로비에서 보낸 요청의 응답을 연구실 이동 완료 후에 반환하면, THE 테스트 스위트 SHALL 연구실 로그에 해당 내레이션이 0건이고 조명, 안개, 강도, 애니메이션 값이 응답 반환 전후로 동일함을 확인한다.
3. WHEN Fake_Fetch가 재시작, 게임 오버, 승리 중 하나가 발생한 이후에 이전 요청의 응답을 반환하면, THE 테스트 스위트 SHALL 해당 응답이 로그, 방 상태, 연출 값 어디에도 적용되지 않고 폐기되었음을 확인한다.
4. WHEN Fake_Fetch가 두 요청의 응답을 요청 순서의 역순으로 반환하면, THE 테스트 스위트 SHALL 더 나중에 보낸 요청의 응답만 적용되고 먼저 보낸 요청의 응답은 폐기되었음을 확인한다.
5. IF Fake_Fetch가 HTTP 오류 응답, 네트워크 예외, 잘못된 JSON, 또는 10초 이상 무응답 중 하나를 반환하면, THEN THE 테스트 스위트 SHALL 기본 방 설명과 출구 목록이 변경 없이 유지되고, 처리되지 않은 예외가 0건이며, 이후 입력한 명령이 정상 실행됨을 확인한다.
6. WHEN API 키가 설정된 상태에서 `look`을 실행하고 Fake_Fetch 응답이 지연되면, THE 테스트 스위트 SHALL Base_Room_Text가 AI 응답보다 먼저 로그에 나타나고 AI 응답 도착 시 Base_Room_Text 뒤에 추가됨을 확인한다.
7. WHEN 동일한 AI 시나리오를 2회 연속 실행하면, THE 테스트 스위트 SHALL 실제 시간 대기 없이 가짜 타이머 또는 수동 해제 방식으로 지연을 제어하여 두 번 모두 동일한 결과를 얻음을 확인한다.

### Requirement 14: 실제 AI API 검증 분리 보고

**User Story:** 심사자로서, 가짜 응답 테스트와 실제 API 검증의 차이를 알고 싶다. 그래야 AI 기능의 검증 수준을 정확히 판단할 수 있다.

#### Acceptance Criteria

1. THE Verification_Report SHALL Fake_Fetch 기반 결과와 Live_Check 결과를 서로 다른 제목을 가진 별도 절 2개로 기록하고, 각 절에 통과 건수와 실패 건수를 따로 표시한다.
2. WHEN 환경 변수 `GEMINI_API_KEY`가 비어 있지 않은 문자열로 설정되어 있으면, THE Live_Check SHALL 실제 엔드포인트를 1회 이상 최대 3회까지 호출하고, 호출마다 HTTP 상태, 응답 길이(문자 수), 응답 형태(JSON 여부 및 텍스트 존재 여부)만 Verification_Report에 기록한다.
3. THE Live_Check SHALL API 키 값과 응답 본문 전체 또는 일부를 로그, Verification_Report, 스크린샷, 터미널 출력에 기록하지 않는다.
4. IF `GEMINI_API_KEY`가 설정되지 않았거나 비어 있으면, THEN THE Verification_Report SHALL 실제 AI 동작을 "미검증"으로 기록하고 미검증 사유로 키 없음을 명시한다.
5. IF Live_Check 호출이 30초 안에 응답을 받지 못하거나 HTTP 200이 아닌 상태 코드(예: 402)를 받거나 네트워크 오류가 발생하면, THEN THE Verification_Report SHALL 실제 AI 동작을 "미검증"으로 기록하고 해당 HTTP 상태 코드 또는 오류 종류를 명시하며, 테스트 프로세스는 중단 없이 종료되어 보고서를 생성한다.
6. THE Verification_Report SHALL Fake_Fetch 테스트 통과 여부를 실제 AI 연동 성공의 근거로 사용하지 않으며, 실제 AI 연동 성공 판정은 Live_Check가 HTTP 200을 받은 경우로만 한정한다.
7. IF 새 AI 프롬프트로 변경한 뒤 Live_Check로 응답에 옛 명칭이 포함되지 않았는지 확인하지 못했다면, THEN THE Game 작업 절차 SHALL 해당 응답 품질 항목을 "미검증"으로 보고하고 확인하지 못한 사유(키 없음, 호출 실패 등)를 함께 기록한다.

### Requirement 15: 데모 재녹화 순서와 화면 잘림 확인

**User Story:** 제작자로서, 짧은 데모 재녹화 순서와 녹화 화면 확인 결과가 필요하다. 그래야 새 제목이 반영된 영상을 직접 다시 녹화할 수 있다.

#### Acceptance Criteria

1. THE Verification_Report SHALL 총 60초 이상 90초 이하 분량의 데모 재녹화 순서를 단계 번호, 입력할 명령어, 단계별 예상 소요 시간(초) 형식으로 제공하며, 단계별 소요 시간의 합계가 60~90초 범위 안에 있도록 한다.
2. THE Verification_Report SHALL 재녹화 순서에 다음 항목을 이 순서대로 포함한다: 제목 화면, 인트로, 로비 전투(샷건, 테이저 스턴, 조명탄 각각 1회 이상 사용), 연구실 카드 획득, 관제실 또는 발전소 복구와 승리, 재시작.
3. THE Verification_Report SHALL 재녹화 순서의 첫 단계 이전에 API 키 입력란이 `type="password"` 마스킹 상태이거나 오프라인 모드로 전환된 상태임을 확인하는 사전 점검 단계를 포함하며, 녹화 구간 전체에서 API 키 평문이 화면에 노출되지 않도록 안내한다.
4. WHEN Demo_Recording_View 해상도 1920x1080과 1280x720 각각에서 게임을 열면, THE 테스트 스위트 SHALL 왼쪽 터미널 영역의 제목, 인트로, 가장 긴 방 설명, 명령 칩, 입력창 각각에 대해 요소 경계 사각형이 뷰포트 안에 있는지(0px 이상, 뷰포트 너비·높이 이하)와 스크롤 가능한 컨테이너의 scrollWidth가 clientWidth를 초과하지 않는지(가로 넘침 0px)를 검사한다.
5. IF 4번 검사에서 요소가 뷰포트 밖으로 벗어나거나 가로 넘침이 1px 이상 발견되면, THEN THE 테스트 스위트 SHALL 해당 검사를 실패로 처리하고 실패한 해상도와 요소 이름을 출력한다.
6. THE Verification_Report SHALL 검사한 각 해상도마다 제목, 인트로, 긴 방 설명, 명령 칩, 입력창 항목별 통과 또는 실패 결과를 기록한다.
7. IF 왼쪽 텍스트 잘림이 발견되면, THEN THE Game SHALL 레이아웃을 수정해 4번 검사를 두 해상도 모두에서 통과시키거나, 수정하지 못한 항목을 해상도와 요소 이름과 함께 Verification_Report의 미해결 항목으로 보고한다.
8. THE Verification_Report SHALL 소프트웨어 렌더링 헤드리스 화면에서만 확인한 항목과 실제 디스플레이에서 확인한 항목을 별도 목록으로 구분해 기록하며, 실제 디스플레이에서 확인하지 않은 항목은 "미확인"으로 표시한다.
9. THE Verification_Report SHALL Existing_Demo_Video가 이전 게임을 녹화한 것이며 이번 코드 변경으로 바뀌지 않았다고 명시한다.

### Requirement 16: 작업 범위 제한

**User Story:** 프로젝트 소유자로서, 로컬 작업과 보고까지만 수행되길 원한다. 그래야 외부에 공개된 제출물이 의도치 않게 바뀌지 않는다.

#### Acceptance Criteria

1. THE Game 작업 절차 SHALL 작업 저장소(워크스페이스 루트) 내부의 로컬 파일 수정과 로컬 검증 명령 실행만 수행한다.
2. IF 작업 중 `git push`, 원격 브랜치 생성, 풀 리퀘스트 생성이 필요해 보이면, THEN THE Game 작업 절차 SHALL 해당 명령을 실행하지 않고 사용자에게 보고만 한다.
3. IF 작업 중 유튜브 영상의 업로드, 수정, 삭제가 필요해 보이면, THEN THE Game 작업 절차 SHALL 해당 요청을 보내지 않고 사용자에게 보고만 한다.
4. IF 작업 중 Devpost 제출 정보의 수정이 필요해 보이면, THEN THE Game 작업 절차 SHALL 해당 수정을 수행하지 않고 사용자에게 보고만 한다.
5. IF 사용자가 커밋을 명시적으로 요청하지 않았다면, THEN THE Game 작업 절차 SHALL `git commit`을 실행하지 않고 변경 사항을 작업 트리에 남긴다.
6. THE Game 작업 절차 SHALL API 키, `.env` 파일 내용, 인증 정보 값을 저장소 파일, 테스트 출력, 로그, 보고서에 기록하지 않는다.
7. IF 검증 과정에서 API 키 등 인증 정보가 출력에 포함될 가능성이 있으면, THEN THE Game 작업 절차 SHALL 해당 값을 키 이름으로만 참조하고 값은 출력하지 않는다.

### Requirement 17: 기능별 검증 범위 보고

**User Story:** 프로젝트 소유자로서, 무엇이 검증되었고 무엇이 아닌지 한눈에 보고 싶다. 그래야 제출 전에 남은 위험을 판단할 수 있다.

#### Acceptance Criteria

1. WHEN tasks.md의 모든 작업이 `[x]`로 표시되면, THE Verification_Report SHALL 항목 목록의 각 기능마다 "검증됨", "부분 검증", "미검증", "실패" 중 정확히 하나의 상태와 1문장 이상 500자 이하의 근거를 기록한다.
2. THE Verification_Report SHALL 최소한 다음 17개 기능을 각각 별도 항목으로 포함한다: 이름 일관성, 방 이동, 샷건, 테이저와 스턴, 조명탄, 카드 획득, 관제실 승리, 발전소 승리, 게임 오버와 재시작, 늦은 AI 응답 차단, 기본 정보 우선 출력, 네트워크 실패 처리, 실제 AI API, 3D 장면 표시, 오디오, 왼쪽 텍스트 잘림, 명칭 잔존 검색.
3. THE Verification_Report SHALL 각 항목마다 사용한 명령(실행하지 않았으면 "해당 없음"), 실행 환경(브라우저 이름과 버전, 해상도 가로x세로 픽셀), 결과(통과/실패 건수 또는 관찰 내용)를 기록한다.
4. THE Verification_Report SHALL 사람이 직접 확인하지 않은 오디오와 실제 디스플레이 렌더링 항목을 "미검증"으로 표시하고, 자동화 테스트만 수행된 경우 "검증됨"으로 표시하지 않는다.
5. THE Verification_Report SHALL 상표 검토, 저작권 검토, 설정 유사성에 대한 법적 검토와 Existing_Demo_Video 교체를 각각 "프로젝트 소유자 확인 필요" 잔여 항목으로 기록한다.
6. IF 항목의 테스트를 실행하지 못했으면, THEN THE Verification_Report SHALL 실행하지 못한 사유를 해당 항목에 기록하고 그 항목의 상태를 "미검증" 또는 "실패"로 표시하며 "검증됨"으로 표시하지 않는다.
7. IF 항목의 일부 시나리오만 검증되었으면, THEN THE Verification_Report SHALL 해당 항목을 "부분 검증"으로 표시하고 검증되지 않은 시나리오를 근거에 명시한다.
8. IF 필수 17개 항목 중 하나라도 Verification_Report에 없거나 상태가 비어 있으면, THEN THE Verification_Report SHALL 해당 항목을 "미검증"으로 추가하고 누락 사유를 기록한다.