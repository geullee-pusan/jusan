// 기술 지도(실시간 레벨 체크, docs/SPEC.md 6장). 순수 함수다.
// 처음 부탁: 아이의 레벨을 숫자 하나로 나타내기 어려우니 실시간으로 체크하고 싶다.
// 그래서 급수 대신 기술마다 "됨 / 거의 / 아직"을 보여 준다. 문제를 풀 때마다 바로 다시 계산한다.
// 기록(판들의 결과)이 원본이고, 기술 지도는 언제든 기록에서 다시 계산할 수 있다.

/** 기술 목록. island: 이 기술을 연습하는 섬. 차례는 지도(curriculum.json)의 섬 차례를 따른다 */
export const SKILLS = [
  { id: 'direct', group: '덧셈·뺄셈', name: '바로 넣기·빼기', island: 'add-1' },
  { id: 'friend-add', group: '덧셈·뺄셈', name: '친구수 덧셈', island: 'add-2' },
  { id: 'friend-sub', group: '덧셈·뺄셈', name: '친구수 뺄셈', island: 'add-3' },
  { id: 'five-add', group: '덧셈·뺄셈', name: '5의 짝 덧셈', island: 'add-4' },
  { id: 'five-sub', group: '덧셈·뺄셈', name: '5의 짝 뺄셈', island: 'add-4' },
  { id: 'both', group: '덧셈·뺄셈', name: '친구수와 5의 짝 함께', island: 'add-5' },
  { id: 'chain', group: '덧셈·뺄셈', name: '이어서 올리기·빌리기', island: 'add-5' },
  { id: 'many-rows', group: '덧셈·뺄셈', name: '두 자리 다섯 줄', island: 'add-6' },
  ...[2, 3, 4, 5, 6, 7, 8, 9].map((a) => ({ id: `tt-${a}`, group: '곱셈구구', name: `${a}단`, island: 'mul-0' })),
  { id: 'mul-place', group: '곱셈', name: '자릿수 찾고 앞자리부터', island: 'mul-1digit' },
  { id: 'zero-pad', group: '곱셈', name: '한 자리 곱에 영 붙이기', island: 'mul-1digit' },
  { id: 'zero-zero', group: '곱셈', name: '곱이 영일 때 영영', island: 'mul-1digit' },
  { id: 'mul-carry', group: '곱셈', name: '곱을 더할 때 앞자리로 올리기', island: 'mul-1digit' },
  { id: 'mul2-shift', group: '곱셈', name: '두 자리 × 두 자리: 시작 자리 옮기기', island: 'mul-2x2' },
  { id: 'mul2-carry', group: '곱셈', name: '두 자리 × 두 자리: 더할 때 올리기', island: 'mul-2x2' },
  { id: 'big-mul', group: '곱셈', name: '세 자리 × 두 자리 끝까지', island: 'mul-big' },
  { id: 'big-zero', group: '곱셈', name: '가운데 영이 있는 곱셈(영영)', island: 'mul-big' },
  { id: 'div-rule1', group: '나눗셈', name: '나눌 수 있으면 두 줄 왼쪽에 몫', island: 'div-1' },
  { id: 'div-rule2', group: '나눗셈', name: '나눌 수 없으면 두 자리 보고 한 줄 왼쪽에 몫', island: 'div-1' },
  { id: 'div-long', group: '나눗셈', name: '세·네 자리 몫 끝까지 세우기', island: 'div-2' },
  { id: 'div-zero', group: '나눗셈', name: '몫 가운데 영 비워 두기', island: 'div-2' },
  { id: 'div-est', group: '나눗셈', name: '두 자리로 나눌 때 임시 몫 세우기', island: 'div-3' },
  { id: 'div-revise', group: '나눗셈', name: '임시 몫 고치기', island: 'div-3' },
  { id: 'mind-picture', group: '암산', name: '머릿속 주판', island: 'mental-1' },
  { id: 'mind-listen', group: '암산', name: '듣고 하는 암산', island: 'mental-2' },
  { id: 'mind-flash', group: '암산', name: '번쩍 암산', island: 'mental-3' },
  { id: 'dec-read', group: '자리점', name: '자리점부터 세어 큰 수 읽기', island: 'dec-1' },
  { id: 'dec-zero', group: '자리점', name: '가운데 영이 있는 수 읽기', island: 'dec-1' },
  { id: 'dec-place', group: '자리점', name: '자리 이름으로 숫자 찾기', island: 'dec-1' },
  { id: 'dec-point', group: '자리점', name: '소수 놓고 읽기', island: 'dec-2' },
  { id: 'dec-align', group: '자리점', name: '소수점 맞춰 더하고 빼기', island: 'dec-2' },
];

/** 상태를 정하는 값(SPEC 6.2절 초안). 최근 몇 번을 보고, 몇 번 맞혀야 "됨"인가 */
export const RULE = { recent: 8, minForDone: 6, doneHits: 7, minForAlmost: 3, almostRate: 0.5 };

const TECH_TO_SKILL = {
  A1: 'direct', A2: 'direct', B1: 'direct', B2: 'direct',
  A4: 'friend-add', B4: 'friend-sub', A3: 'five-add', B3: 'five-sub',
  A5: 'both', B5: 'both', A6: 'chain', B6: 'chain',
};

/** 틀린 이유(짐작)가 어느 기술 탓인지. 없으면 그 문제의 모든 기술 탓으로 본다 */
const MISS_TO_SKILLS = {
  'no-carry': ['mul-carry', 'mul2-carry'],
  place: ['mul-place', 'mul2-shift', 'big-mul', 'div-rule1', 'div-rule2', 'div-long', 'div-est'],
  over: ['div-rule1', 'div-rule2', 'div-long', 'div-est', 'div-revise'],
  under: ['div-rule1', 'div-rule2', 'div-long', 'div-est'],
  'no-shift': ['mul2-shift', 'big-mul'],
  'no-pad': ['zero-pad', 'big-zero'],
  carry: ['friend-add', 'friend-sub', 'chain'],
  five: ['five-add', 'five-sub', 'both'],
  shift: ['dec-read', 'dec-point', 'dec-align'],
  'zero-drop': ['dec-zero', 'dec-point'],
  align: ['dec-align'],
  neighbor: ['dec-place'],
};

/**
 * 문제 하나의 결과가 어느 기술들에 들어가는지.
 * @param {string} lesson 섬 id
 * @param {{features?: object, a?: number, firstTry: boolean, miss?: string}} result
 * @returns {string[]} 기술 id
 */
export function skillsOfResult(lesson, result) {
  const f = result.features ?? {};
  const out = new Set();
  if (lesson === 'mul-0') {
    if (result.a) out.add(`tt-${result.a}`);
  } else if (lesson === 'mul-1digit') {
    out.add('mul-place');
    if (f.padded) out.add('zero-pad');
    if (f.zeroProduct) out.add('zero-zero');
    if (f.carry) out.add('mul-carry');
  } else if (lesson === 'mul-2x2') {
    out.add('mul2-shift');
    if (f.carry) out.add('mul2-carry');
  } else if (lesson === 'mul-big') {
    out.add('big-mul');
    if (f.zeroInA || f.zeroInB || f.zeroProduct) out.add('big-zero');
  } else if (lesson === 'div-2') {
    out.add('div-long');
    if (f.zeroQuotient) out.add('div-zero');
  } else if (lesson === 'div-3') {
    out.add('div-est');
    if (f.revise) out.add('div-revise');
  } else if (lesson === 'div-1') {
    if (f.rule1) out.add('div-rule1');
    if (f.rule2) out.add('div-rule2');
  } else if (lesson === 'dec-2') {
    out.add(f.type === 'read' ? 'dec-point' : 'dec-align');
  } else if (lesson === 'dec-1') {
    // 자리 숫자 문제는 features.place가 있다. 읽기 문제는 없다
    if (f.place !== undefined) out.add('dec-place');
    else {
      out.add('dec-read');
      if (f.zero) out.add('dec-zero');
    }
  } else if (Array.isArray(f.techniques)) {
    for (const t of f.techniques) if (TECH_TO_SKILL[t]) out.add(TECH_TO_SKILL[t]);
    if (lesson === 'add-6') out.add('many-rows');
    if (lesson === 'mental-1') out.add('mind-picture');
    if (lesson === 'mental-2') out.add('mind-listen');
    if (lesson === 'mental-3') out.add('mind-flash');
    // 암산 섬의 덧셈 기법은 주판 기법 칸에 넣지 않는다(머리로 한 것과 주판으로 한 것은 다르다)
    if (lesson.startsWith('mental-')) for (const id of [...out]) if (!id.startsWith('mind-')) out.delete(id);
  }
  return [...out];
}

/** 한 결과에서 기술마다 맞음(true)·틀림(false). 틀렸을 때 이유를 짐작했으면 그 기술만 틀림으로 넣는다 */
function outcomes(lesson, result) {
  const skills = skillsOfResult(lesson, result);
  const ok = result.firstTry === true;
  if (ok) return skills.map((id) => [id, true]);
  const blamed = (MISS_TO_SKILLS[result.miss] ?? []).filter((id) => skills.includes(id));
  if (blamed.length === 0) return skills.map((id) => [id, false]);
  // 탓이 분명한 기술만 틀림, 나머지는 셈하지 않는다(맞았다고도 틀렸다고도 하지 않는다)
  return blamed.map((id) => [id, false]);
}

/** 상태 정하기 */
export function stateOf(hits, tries) {
  if (tries >= RULE.minForDone && hits >= Math.min(RULE.doneHits, tries) && hits / tries >= RULE.doneHits / RULE.recent) return 'done';
  if (tries >= RULE.minForAlmost && hits / tries >= RULE.almostRate) return 'almost';
  return 'notyet';
}

/**
 * 기술 지도. 기술마다 최근 8번의 결과로 됨·거의·아직을 정한다.
 * @param {object[]} rounds 판 기록(오래된 것부터)
 * @returns {{id, group, name, island, state: 'done'|'almost'|'notyet', hits: number, tries: number}[]}
 */
export function skillMap(rounds) {
  const history = Object.fromEntries(SKILLS.map((s) => [s.id, []]));
  for (const r of rounds) {
    const lesson = r.lesson ?? 'mul-1digit';
    for (const result of r.results ?? []) {
      for (const [id, ok] of outcomes(result.lesson ?? lesson, result)) history[id]?.push(ok);
    }
  }
  return SKILLS.map((s) => {
    const recent = history[s.id].slice(-RULE.recent);
    const hits = recent.filter(Boolean).length;
    return { ...s, hits, tries: recent.length, state: stateOf(hits, recent.length) };
  });
}

/** 이번 판으로 "됨"이 된 기술 */
export function newlyDone(before, after) {
  const was = new Map(skillMap(before).map((s) => [s.id, s.state]));
  return skillMap(after).filter((s) => s.state === 'done' && was.get(s.id) !== 'done');
}

/**
 * 선생님 추천: 다음에 할 섬.
 *  1. "거의"인 기술이 있으면 그중 지도 차례로 가장 앞의 것(조금만 더 하면 "됨")
 *  2. 없으면 한 번이라도 해 본 "아직" 기술
 *  3. 그것도 없으면, 열린 섬 가운데 아직 안 해 본 첫 섬
 * @param {string[]} openIslands 열린 섬 id(지도 차례)
 */
export function recommend(rounds, openIslands) {
  const map = skillMap(rounds).filter((s) => openIslands.includes(s.island));
  const order = (s) => openIslands.indexOf(s.island);
  const byOrder = (a, b) => order(a) - order(b);
  const almost = map.filter((s) => s.state === 'almost').sort(byOrder)[0];
  if (almost) return { island: almost.island, skill: almost, why: 'almost' };
  const tried = map.filter((s) => s.state === 'notyet' && s.tries > 0).sort(byOrder)[0];
  if (tried) return { island: tried.island, skill: tried, why: 'notyet' };
  const played = new Set(rounds.map((r) => r.lesson));
  const fresh = openIslands.find((id) => !played.has(id));
  if (fresh) return { island: fresh, skill: null, why: 'new' };
  return null;
}

/** 전체 레벨의 칭호(블록 세상 느낌). 레벨이 오를수록 다음 칭호 */
export const TITLES = ['주판 새싹', '알 굴리기 견습생', '친구수 탐험가', '5의 짝 기사', '곱셈 광부', '구구 대장장이', '머릿속 주판 마법사', '주판 장인', '주산 전설'];

/**
 * 전체 레벨(등급). 기술 지도에서 나온다(2026-11-10 부모 결정: 등급을 매겨도 된다).
 *  - 기술 하나가 "됨"이면 3점, "거의"면 1점. 3점마다 레벨이 하나 오른다(레벨 1부터).
 *  - 칭호는 레벨 3마다 바뀐다.
 * @returns {{level: number, points: number, toNext: number, title: string, nextTitle: string|null}}
 */
export function overallLevel(map) {
  const points = map.reduce((sum, s) => sum + (s.state === 'done' ? 3 : s.state === 'almost' ? 1 : 0), 0);
  const level = 1 + Math.floor(points / 3);
  const titleIndex = Math.min(TITLES.length - 1, Math.floor((level - 1) / 3));
  return {
    level,
    points,
    toNext: 3 - (points % 3),
    title: TITLES[titleIndex],
    nextTitle: titleIndex + 1 < TITLES.length ? TITLES[titleIndex + 1] : null,
  };
}
