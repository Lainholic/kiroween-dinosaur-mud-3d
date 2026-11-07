// 검증 보고서 생성기 (spec: dinosaur-survival-mud-rebrand, C9 / task 8.1)
// 사용: node tests/build-report.mjs
// tests/.results/*.json 을 읽어 .kiro/specs/dinosaur-survival-mud-rebrand/verification-report.md 를 쓴다.
// buildReport(results) 는 부작용 없는 순수 함수다. results = { <파일명(확장자 제외)>: <JSON> }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATUSES = ['검증됨', '부분 검증', '미검증', '실패'];
export const MAX_EVIDENCE = 500;

// 필수 17개 기능. match 는 feature 필드나 시나리오 이름을 기능에 연결하는 보조 정규식이다.
export const REQUIRED_FEATURES = [
  { name: '이름 일관성', match: /name.?consisten|이름 일관|naming/i },
  { name: '방 이동', match: /move|room|이동|north|south|east|west/i },
  { name: '샷건', match: /shotgun|shoot|샷건/i },
  { name: '테이저와 스턴', match: /taser|shock|stun|테이저|스턴/i },
  { name: '조명탄', match: /flare|조명탄/i },
  { name: '카드 획득', match: /\bcard\b|카드/i },
  { name: '관제실 승리', match: /control.*(win|won|victory)|restore power|관제실 승리/i },
  { name: '발전소 승리', match: /generator.*(win|won|victory)|발전소 승리/i },
  { name: '게임 오버와 재시작', match: /game.?over|restart|게임 오버|재시작|dead|death/i },
  { name: '늦은 AI 응답 차단', match: /\blate\b|stale|epoch|discard|늦은/i },
  { name: '기본 정보 우선 출력', match: /basic.?first|base.?info|describeRoom|기본 정보|timeout/i },
  { name: '네트워크 실패 처리', match: /network|offline|fetch.?fail|네트워크/i },
  { name: '실제 AI API', match: /live|real.?ai|gemini|실제 AI/i },
  { name: '3D 장면 표시', match: /3d|scene|webgl|canvas|장면/i },
  { name: '오디오', match: /audio|sound|오디오/i },
  { name: '왼쪽 텍스트 잘림', match: /clip|overflow|layout|잘림|viewport/i },
  { name: '명칭 잔존 검색', match: /legacy|잔존|residual/i },
];

const F = Object.fromEntries(REQUIRED_FEATURES.map((f) => [f.name, f.name]));
const HUMAN_ONLY = new Set([F['오디오']]); // 사람 확인 없으면 미검증 고정
const DISPLAY_CAPPED = new Set([F['3D 장면 표시']]); // 사람 확인 없으면 최대 부분 검증

export const DEMO_STEPS = [
  { step: 1, title: '사전 점검', detail: 'API 키 입력란이 password 로 마스킹되어 있거나 오프라인 모드인지 확인', command: '(화면 확인) 키 입력란 type="password" 또는 키 없이 오프라인 실행', seconds: 0 },
  { step: 2, title: '제목 화면', detail: '제목 화면 표시', command: '(페이지 로드)', seconds: 5 },
  { step: 3, title: '인트로', detail: '인트로 문구 표시', command: '(자동 재생)', seconds: 8 },
  { step: 4, title: '로비 전투', detail: 'shoot, shock, flare 각 1회 이상, 랩터 무리 처치까지 반복', command: 'shoot, shock, flare, shoot, shoot ... (무리가 죽을 때까지)', seconds: 20 },
  { step: 5, title: '연구실 이동과 카드 획득', detail: '처치 후 동쪽 연구실로 이동해 카드 획득, 로비로 복귀', command: 'east, take card, west', seconds: 12 },
  { step: 6, title: '관제실 이동과 승리', detail: '북쪽 관제실로 이동해 전원 복구', command: 'north, restore power', seconds: 15 },
  { step: 7, title: '재시작', detail: '재시작', command: 'restart', seconds: 5 },
];
export const DEMO_NOTE = '녹화 전 왼쪽 터미널 텍스트가 1920x1080 과 1280x720 에서 잘리지 않는지 확인한다.';

const SECRET_RES = [/AIza[0-9A-Za-z_\-]{20,}/g, /(key|token|secret)=([^&\s"']+)/gi, /Bearer\s+[A-Za-z0-9._\-]+/g];
function redact(s) {
  let t = String(s ?? '');
  for (const re of SECRET_RES) t = t.replace(re, (m, a) => (a && /key|token|secret/i.test(a) ? `${a}=[삭제됨]` : '[삭제됨]'));
  return t;
}
function clip(s, n = MAX_EVIDENCE) {
  const t = redact(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// ---------- 케이스 수집 ----------
function featureFor(c) {
  const f = c.feature;
  if (typeof f === 'string') {
    const hit = REQUIRED_FEATURES.find((x) => x.name === f.trim());
    if (hit) return hit.name;
    const loose = REQUIRED_FEATURES.find((x) => x.match.test(f));
    if (loose) return loose.name;
  }
  return null;
}
function guessFeature(text) {
  // 구체적인 기능부터 매칭하기 위해 일반 이동/승리 정규식을 뒤로 둔다.
  // 늦은 응답 시나리오는 이동·승리·재시작 단어를 포함하므로 먼저 매칭한다.
  if (/\breply\b|응답|\blate\b|stale|epoch|discard/i.test(text)) return '늦은 AI 응답 차단';
  const order = ['테이저와 스턴', '샷건', '조명탄', '카드 획득', '발전소 승리', '관제실 승리', '게임 오버와 재시작', '늦은 AI 응답 차단', '기본 정보 우선 출력', '네트워크 실패 처리', '왼쪽 텍스트 잘림', '방 이동'];
  for (const n of order) {
    const f = REQUIRED_FEATURES.find((x) => x.name === n);
    if (f.match.test(text)) return n;
  }
  return null;
}
const normStatus = (s) => {
  const v = String(s ?? '').toLowerCase();
  if (['pass', 'passed', 'ok', 'true'].includes(v)) return 'pass';
  if (['fail', 'failed', 'error', 'false'].includes(v)) return 'fail';
  return 'skipped';
};

/** 모든 결과 파일에서 정규화된 케이스 배열을 만든다: {file, suite, kind, feature, name, status, detail, env, command} */
export function collectCases(results) {
  const out = [];
  const add = (file, suite, base, c, extra = {}) => {
    const feature = featureFor(c) || extra.feature || guessFeature(`${c.name || ''} ${c.input || ''}`);
    out.push({
      file, suite, feature,
      kind: c.kind || base.kind || (/live/i.test(suite) ? 'live' : (/fake|textmud|repro/i.test(suite) ? 'fake' : 'other')),
      name: String(c.name ?? ''), status: extra.status ?? normStatus(c.status),
      detail: String(c.detail ?? extra.detail ?? ''), env: c.env || base.env || null,
      command: c.command || base.command || null,
    });
  };
  for (const [file, data] of Object.entries(results || {})) {
    if (!isObj(data)) continue;
    const suite = String(data.suite || file);
    if (Array.isArray(data.cases)) data.cases.forEach((c) => isObj(c) && add(file, suite, data, c));
    if (file === 'repro' && Array.isArray(data.scenarios)) {
      const env = data.browser ? { browser: data.browser } : null;
      data.scenarios.forEach((s) => isObj(s) && add(file, 'repro', { env, command: 'node tests/repro-bugs.mjs', kind: 'fake' }, s, {
        status: s.reproduced === false ? 'pass' : 'fail',
        detail: `expected: ${s.expected ?? ''}; actual: ${JSON.stringify(s.actual ?? '')}`,
      }));
    }
    if (file === 'live' && !Array.isArray(data.cases)) {
      const calls = data.calls || data.results || [];
      (Array.isArray(calls) ? calls : []).forEach((c, i) => {
        const code = c.httpStatus ?? c.status;
        add('live', 'live', { kind: 'live', command: 'node tests/verify-live-gemini.mjs' }, { name: c.name || `live call ${i + 1}`, feature: '실제 AI API' }, {
          status: code === 200 ? 'pass' : 'skipped', detail: `HTTP ${code ?? '?'} (200 아님: 미검증)` });
      });
    }
    if (file === 'layout' && !Array.isArray(data.cases) && Array.isArray(data.viewports)) {
      data.viewports.forEach((v) => add('layout', 'layout', { kind: 'fake' }, { name: `${v.width ?? v.w}x${v.height ?? v.h}`, feature: '왼쪽 텍스트 잘림', env: { viewport: `${v.width ?? v.w}x${v.height ?? v.h}` } }, {
        status: v.clipped === false || v.ok === true ? 'pass' : 'fail', detail: `clipped=${v.clipped}` }));
    }
    if (file === 'legacy-scan') {
      const hits = Array.isArray(data.hits) ? data.hits.length : 0;
      const unresolved = Array.isArray(data.unresolved) ? data.unresolved.length : 0;
      add('legacy-scan', 'legacy-scan', { kind: 'other', command: 'node tests/verify-legacy-terms.mjs' }, { name: '명칭 잔존 검색', feature: '명칭 잔존 검색' }, {
        status: hits + unresolved === 0 ? 'pass' : 'fail',
        detail: `검사 파일 ${data.scannedCount ?? '?'}개, 잔존 ${hits}건, 미확정 ${unresolved}건, 허용 ${Array.isArray(data.allowed) ? data.allowed.length : 0}건` });
    }
  }
  return out;
}

// ---------- 기능 행 ----------
function envText(cases) {
  const e = cases.map((c) => c.env).find(Boolean);
  if (!e) return '브라우저 미기록, 뷰포트 미기록';
  if (typeof e === 'string') return clip(e, 120);
  return clip(`${e.browser ?? '브라우저 미기록'}, ${e.viewport ?? '뷰포트 미기록'}`, 120);
}
function commandText(cases) {
  const c = cases.map((x) => x.command).find(Boolean);
  return c ? clip(c, 120) : '해당 없음';
}

export function featureRow(feature, cases, human) {
  const own = cases.filter((c) => c.feature === feature);
  const pass = own.filter((c) => c.status === 'pass').length;
  const fail = own.filter((c) => c.status === 'fail').length;
  // 문서에 "계획된 파일(planned file, noted)"로 기록된 미존재 참조는 건너뜀이 아니라 참고 사항으로 본다.
  const planned = own.filter((c) => c.status === 'skipped' && /planned file/i.test(c.detail)).length;
  const skip = own.filter((c) => c.status === 'skipped').length - planned;
  const humanOk = (key) => isObj(human) && isObj(human[key]) && human[key].confirmed === true;
  let status; let evidence;
  if (own.length === 0) { status = '미검증'; evidence = '입력 결과 없음: tests/.results 에 이 기능의 결과가 없다.'; }
  else if (fail > 0) { status = '실패'; evidence = `통과 ${pass}, 실패 ${fail}, 건너뜀 ${skip}. 실패: ${own.filter((c) => c.status === 'fail').map((c) => `${c.name}${c.detail ? ` (${c.detail})` : ''}`).join('; ')}`; }
  else if (pass > 0 && skip === 0) { status = '검증됨'; evidence = `통과 ${pass}건. ${own.filter((c) => c.status === 'pass').slice(0, 3).map((c) => c.name).join('; ')}`; }
  else if (pass > 0) { status = '부분 검증'; evidence = `통과 ${pass}, 건너뜀 ${skip}.`; }
  else { status = '미검증'; evidence = `전부 건너뜀(${skip}건): ${own[0].detail || '사유 미기록'}`; }

  let humanNote = '';
  if (HUMAN_ONLY.has(feature)) {
    if (humanOk('audio')) { humanNote = ` 사람 확인: ${clip(human.audio.note || '확인됨', 120)}`; if (status === '미검증' && pass === 0) { status = '검증됨'; } }
    else if (status !== '실패') { status = '미검증'; humanNote = ' 사람 확인 입력(tests/.results/human.json) 없음: 자동화만으로 소리 출력은 확인할 수 없다.'; }
  }
  if (DISPLAY_CAPPED.has(feature)) {
    if (humanOk('display')) humanNote = ` 사람 확인: ${clip(human.display.note || '실제 디스플레이 확인됨', 120)}`;
    else if (status === '검증됨') { status = '부분 검증'; humanNote = ' 실제 디스플레이 확인 없음(헤드리스만): 사람 확인 입력 없이는 검증됨이 될 수 없다.'; }
    else if (status === '미검증' && own.length === 0) humanNote = ' 실제 디스플레이 확인도 없음.';
  }
  if (feature === F['실제 AI API'] && status === '검증됨' && !own.some((c) => c.status === 'pass' && /200/.test(c.detail + c.name))) {
    status = '부분 검증'; humanNote += ' HTTP 200 근거가 기록되지 않았다.';
  }
  return {
    feature, status, evidence: clip(evidence + humanNote),
    command: commandText(own), env: envText(own),
    result: `통과 ${pass} / 실패 ${fail} / 건너뜀 ${skip}`,
  };
}

// ---------- 절 ----------
function sectionPreflight(p) {
  if (!isObj(p)) return ['사전 조사 결과 파일(preflight.json) 없음: 미검증.'];
  const lines = [];
  lines.push(`- 작업: ${p.task ?? '미기록'}, 시각: ${p.timestamp ?? '미기록'}`);
  lines.push(`- 같은 저장소 여부: ${p.sameRepo === undefined ? '미기록' : JSON.stringify(p.sameRepo)}`);
  lines.push(`- 조사 경로 ${Array.isArray(p.paths) ? p.paths.length : 0}개, 오류 ${Array.isArray(p.errors) ? p.errors.length : (p.errors ? 1 : 0)}건`);
  const unc = Array.isArray(p.uncommittedFiles) ? p.uncommittedFiles.length : null;
  lines.push(`- 커밋되지 않은 파일: ${unc === null ? '미기록' : `${unc}개`}`);
  if (p.note) lines.push(`- 비고: ${clip(p.note, 200)}`);
  return lines;
}
function sectionSpecChanges(s) {
  if (!isObj(s) || !Array.isArray(s.changedFiles)) return ['스펙 변경 기록(spec-changes.json) 없음: 미검증.'];
  const lines = s.changedFiles.map((f) => `- \`${f.path}\`: ${(f.sections || []).map((x) => clip(x, 60)).join(', ')}`);
  const rem = Array.isArray(s.remainingLegacyHits) ? s.remainingLegacyHits.length : null;
  lines.push(`- 남은 옛 명칭 일치: ${rem === null ? '미기록' : `${rem}건`}`);
  return lines;
}
const count = (cs) => ({ pass: cs.filter((c) => c.status === 'pass').length, fail: cs.filter((c) => c.status === 'fail').length, skipped: cs.filter((c) => c.status === 'skipped').length });

function sectionNames(n) {
  const roles = ['제목', '섬', '회사'];
  const entries = Array.isArray(n) ? n : (isObj(n) ? (Array.isArray(n.candidates) ? n.candidates : (Array.isArray(n.names) ? n.names : Object.entries(n).filter(([, v]) => isObj(v) || typeof v === 'string').map(([k, v]) => (isObj(v) ? { role: k, ...v } : { role: k, name: v })))) : []);
  if (!entries.length) return roles.map((r) => `- ${r} 이름 후보: 미확인 (검색 기록 없음)`);
  const lines = entries.map((e) => `- ${clip(e.role || e.kind || '후보', 20)}: ${clip(e.name ?? '이름 미기록', 60)} / 검색: ${clip(e.query ?? '미기록', 80)} / 결과: ${clip(e.result ?? e.status ?? '미확인', 160)}`);
  for (const r of roles) if (!entries.some((e) => (e.role || e.kind) === r)) lines.push(`- ${r} 이름 후보: 미확인 (검색 기록 없음)`);
  return lines;
}

/** 순수 함수: 결과 객체 -> 한국어 마크다운 */
export function buildReport(results = {}) {
  const r = isObj(results) ? results : {};
  const human = r.human;
  const cases = collectCases(r);
  const rows = REQUIRED_FEATURES.map((f) => featureRow(f.name, cases, human));
  const total = DEMO_STEPS.reduce((a, s) => a + s.seconds, 0);
  if (total < 60 || total > 90) throw new Error(`데모 재녹화 합계 ${total}초가 60~90초 범위를 벗어났다.`);

  const fake = count(cases.filter((c) => c.kind === 'fake'));
  const live = count(cases.filter((c) => c.kind === 'live'));
  const liveCases = cases.filter((c) => c.kind === 'live');
  const liveOk = liveCases.some((c) => c.status === 'pass' && /200/.test(`${c.detail} ${c.name}`));
  const L = [];
  L.push('# 검증 보고서');
  L.push('', '> 자동 생성 파일(tests/build-report.mjs). API 키와 응답 본문은 포함하지 않는다.', '');
  L.push('## 기능별 검증 상태', '');
  L.push('| 기능 | 상태 | 근거 | 명령 | 환경(브라우저, 뷰포트) | 결과 |', '| --- | --- | --- | --- | --- | --- |');
  for (const x of rows) L.push(`| ${cell(x.feature)} | ${x.status} | ${cell(x.evidence)} | ${cell(x.command)} | ${cell(x.env)} | ${cell(x.result)} |`);
  const tally = Object.fromEntries(STATUSES.map((s) => [s, rows.filter((x) => x.status === s).length]));
  L.push('', `요약: ${STATUSES.map((s) => `${s} ${tally[s]}`).join(', ')} (총 ${rows.length}개)`, '');

  L.push('## 실행 명령과 종료 코드', '');
  const runCmds = isObj(r['run-log']) && Array.isArray(r['run-log'].commands) ? r['run-log'].commands : [];
  if (!runCmds.length) L.push('- 실행 기록(run-log.json) 없음: 미기록');
  else for (const c of runCmds) L.push(`- \`${cell(c.cmd)}\`: 종료 코드 ${c.exitCode}`);
  L.push('');
  L.push('## 사전 조사', '', ...sectionPreflight(r.preflight), '');
  L.push('## 스펙 변경', '', ...sectionSpecChanges(r['spec-changes']), '');
  L.push('## Fake_Fetch 결과', '', `- 통과 ${fake.pass}건, 실패 ${fake.fail}건, 건너뜀 ${fake.skipped}건`, '- 가짜 응답(Fake_Fetch)으로 얻은 결과이며 실제 AI 연동 성공으로 인정하지 않는다.', '');
  L.push('## Live_Check 결과', '');
  if (!liveCases.length) L.push('- 실행 기록 없음(키 없음 또는 미실행): 통과 0건, 실패 0건. 실제 AI 연동: 미검증');
  else L.push(`- 통과 ${live.pass}건, 실패 ${live.fail}건, 건너뜀 ${live.skipped}건`, `- 실제 AI 연동: ${liveOk ? '성공(HTTP 200 확인)' : '미검증(HTTP 200 근거 없음)'}`);
  L.push('');
  L.push('## 이름 후보 검색 기록', '', ...sectionNames(r['names-check']), '');
  L.push('## 속성 테스트', '');
  const d = r.deps;
  const deferred = !isObj(d) || /defer|보류|hold/i.test(JSON.stringify(d.fastCheck ?? 'deferred'));
  L.push(deferred ? '- fast-check 설치 보류(사용자 결정): 속성 테스트 미실행' : '- fast-check 설치됨: 속성 테스트 실행 결과는 위 기능 표의 케이스에 포함된다.', '');
  const dispOk = isObj(human) && isObj(human.display) && human.display.confirmed === true;
  const audOk = isObj(human) && isObj(human.audio) && human.audio.confirmed === true;
  L.push('## 헤드리스 확인과 실제 디스플레이 확인', '', '### 헤드리스 확인');
  const heads = cases.filter((c) => c.status === 'pass');
  const headFeatures = [...new Set(heads.map((c) => c.feature).filter(Boolean))];
  L.push(headFeatures.length ? `- ${headFeatures.join(', ')}` : '- 통과한 헤드리스 결과 없음');
  L.push('', '### 실제 디스플레이 확인');
  L.push(`- 3D 장면의 실제 화면 표시: ${dispOk ? '확인됨' : '미확인'}`, `- 오디오 출력: ${audOk ? '확인됨' : '미확인'}`, `- 1920x1080, 1280x720 실제 화면 텍스트 잘림: ${dispOk ? '확인됨' : '미확인'}`, '');
  L.push('## 프로젝트 소유자 확인 필요', '', '- 상표 검토', '- 저작권 검토', '- 설정 유사성 검토', '- Existing_Demo_Video 교체', '');
  L.push('## 고지', '', '- 기존 데모 영상은 이전 버전을 녹화한 것이며 이번 변경으로 바뀌지 않았다.', '- 이름을 바꾸었다고 해서 법적 안전이 보장되지 않는다.', '');
  L.push('## 데모 재녹화 순서', '', '| 단계 | 내용 | 명령 | 시간(초) |', '| --- | --- | --- | --- |');
  for (const s of DEMO_STEPS) L.push(`| ${s.step} | ${cell(`${s.title}: ${s.detail}`)} | \`${cell(s.command)}\` | ${s.seconds} |`);
  L.push('', `합계: ${total}초 (허용 범위 60~90초)`, '', `참고: ${DEMO_NOTE}`, '');
  return L.join('\n');
}

// ---------- main ----------
export function readResults(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '');
      out[f.replace(/\.json$/, '')] = JSON.parse(raw);
    } catch (e) { out[f.replace(/\.json$/, '')] = { suite: f, cases: [{ feature: null, name: `${f} 읽기 실패`, status: 'skipped', detail: clip(e.message, 100) }] }; }
  }
  return out;
}

const here = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const results = readResults(path.join(here, '.results'));
    const md = buildReport(results);
    const outFile = path.join(here, '..', '.kiro', 'specs', 'dinosaur-survival-mud-rebrand', 'verification-report.md');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, md, 'utf8');
    console.log(`보고서 생성: ${outFile}`);
  } catch (e) {
    console.error('보고서 생성 실패:', e.message);
    process.exitCode = 1;
  }
}
