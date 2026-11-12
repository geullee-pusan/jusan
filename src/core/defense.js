// 게임 모드 "주판 성 지키기"(2026-11-10 부모 결정). 순수 함수다.
// 오른쪽에서 블록 몬스터가 성으로 다가온다. 몬스터마다 계산 문제가 있고, 답을 말하거나 넣으면 무찌른다.
// 몬스터가 성에 닿으면 성벽이 한 칸 깎이고, 세 칸이 다 깎이면 끝난다.
// 이 모드에서만 다가오는 시간과 성벽을 쓴다(CLAUDE.md 예외).
// 시작 레벨은 아이가 고른다. 몬스터를 10마리 무찌를 때마다 레벨이 하나 오르고,
// 레벨이 오를수록 몬스터가 조금씩 세지고 빨라진다(부모 결정, 2026-11-10). 레벨은 내려가지 않는다.
// 시간은 UI가 재서 넘긴다(여기서는 현재 시각을 읽지 않는다).
import { makeAddSubProblem } from './addsub.js';
import { makeDivProblem } from './divide.js';
import { makeLongProblem } from './mul2.js';
import { makeMulProblem } from './mulproblems.js';
import { createRng, randInt, seedFrom } from './rng.js';

/**
 * 몬스터 17종. 뒤로 갈수록 세고 점수가 크다. 몬스터는 어려움 단계만 나타내고,
 * 문제는 아이가 고른 문제 종류(TOPICS)와 레벨로 따로 정한다(2026-11-12 부모 결정: 덧뺄셈에 치우치지 않게).
 */
export const ENEMIES = {
  slime: { name: '슬라임', points: 10 },
  bat: { name: '박쥐', points: 12 },
  mushroom: { name: '버섯', points: 15 },
  spider: { name: '거미', points: 20 },
  raven: { name: '큰까마귀', points: 22 },
  zombie: { name: '좀비', points: 25 },
  skeleton: { name: '해골', points: 30 },
  ghost: { name: '유령', points: 35 },
  goblin: { name: '고블린', points: 40 },
  golem: { name: '바위 골렘', points: 45 },
  knight: { name: '검은 기사', points: 50 },
  witch: { name: '마녀', points: 55 },
  dragon: { name: '드래곤', points: 60 },
  giant: { name: '거인', points: 70 },
  gargoyle: { name: '가고일', points: 75 },
  lava: { name: '용암 골렘', points: 80 },
  boss: { name: '마왕', points: 100 },
};

/**
 * 문제 단계. 종류마다 지도의 섬 차례대로 쉬운 것부터 어려운 것까지 늘어놓았다.
 * island: 무찌른 문제를 기술 지도에 넣을 섬. make(seed): 문제 하나.
 */
const D1 = ['A1', 'A2', 'B1', 'B2'];
const as = (island, rows, digits, minus, need, allowed) => ({ island, make: (s) => makeAddSubProblem(s, { rows, digits, minus, need, allowed }) });
const tt = (lo, hi) => ({
  island: 'mul-0',
  make: (s) => {
    const r = createRng(s);
    const a = randInt(r, lo, hi);
    const b = randInt(r, 2, 9);
    return { kind: 'tt', key: `${a}x${b}`, a, b, answer: a * b, features: { a } };
  },
});
const m1 = (multiDigits, need) => ({ island: 'mul-1digit', make: (s) => makeMulProblem(s, { multiDigits, singleFirst: createRng(s)() < 0.5, need }) });
const m2 = (da, db, need) => ({ island: da + db > 4 ? 'mul-big' : 'mul-2x2', make: (s) => makeLongProblem(s, { da, db, need }) });
const dv = (island, spec) => ({ island, make: (s) => makeDivProblem(s, spec) });

export const BANDS = {
  addsub: [
    as('add-1', 3, [1, 1], 1, [], D1),
    as('add-1', 4, [1, 1], 1, [], D1),
    as('add-2', 3, [1, 1], 0, ['A4'], [...D1, 'A4']),
    as('add-3', 3, [1, 1], 1, ['B4'], [...D1, 'A4', 'B4']),
    as('add-3', 4, [1, 1], 1, ['B4'], [...D1, 'A4', 'B4']),
    as('add-4', 3, [1, 1], 1, ['A3', 'B3'], [...D1, 'A3', 'A4', 'B3', 'B4']),
    as('add-4', 4, [1, 1], 1, ['A3', 'B3'], [...D1, 'A3', 'A4', 'B3', 'B4']),
    as('add-5', 4, [1, 1], 1, ['A5', 'B5'], [...D1, 'A3', 'A4', 'A5', 'B3', 'B4', 'B5']),
    as('add-5', 4, [1, 2], 1, ['A6', 'B6'], null),
    as('add-1', 3, [2, 2], 1, [], null),
    as('add-6', 5, [2, 2], 2, [], null),
    as('add-6', 5, [2, 3], 2, [], null),
    as('add-6', 5, [2, 3], 2, ['A5', 'A6', 'B5', 'B6'], null),
  ],
  mul: [
    tt(2, 5),
    tt(2, 9),
    tt(6, 9),
    m1(2, { carry: false }),
    m1(2, {}),
    m1(2, { carry: true }),
    m1(3, {}),
    m2(2, 2, { carry: false }),
    m2(2, 2, {}),
    m2(3, 2, {}),
  ],
  div: [
    dv('div-1', { type: 'rule1' }),
    dv('div-1', { type: 'rule2' }),
    dv('div-1', { type: 'mix' }),
    dv('div-1', { type: 'zero' }),
    dv('div-2', { digits: 3, zero: false }),
    dv('div-2', { digits: 3 }),
    dv('div-2', { digits: 4 }),
    dv('div-3', { digits: 2, divisorDigits: 2, revise: false }),
    dv('div-3', { digits: 3, divisorDigits: 2, qDigits: 1 }),
  ],
};

/** 아이가 고르는 문제 종류. mix는 레벨에 따라 섞는다 */
export const TOPICS = {
  mix: '섞어서',
  addsub: '덧셈·뺄셈',
  mul: '곱셈',
  div: '나눗셈',
};

/** 섞어서: 나눗셈이 들어오는 레벨. 그 전에는 덧뺄셈과 곱셈(구구부터)만 반씩 나온다 */
export const MIX_DIV_FROM = 5;

/** 문제 종류의 단계 수를 레벨 from~마지막 레벨에 고르게 펼친다. 마지막 레벨을 넘으면 마지막 단계 */
function bandIndex(count, level, from = 1) {
  const span = LEVELS.length - from;
  const x = Math.min(1, Math.max(0, (level - from) / (span || 1)));
  return Math.round(x * (count - 1));
}

/**
 * 레벨에 나오는 문제 단계와 무게. 지금 단계 2, 바로 앞 단계 1(서서히 바뀐다).
 * @returns {{topic: string, band: number, weight: number}[]}
 */
export function problemMix(topic, level) {
  const lv = Math.max(1, Math.floor(level));
  const topics = topic === 'mix' ? (lv >= MIX_DIV_FROM ? ['addsub', 'mul', 'div'] : ['addsub', 'mul']) : [topic in BANDS ? topic : 'addsub'];
  const out = [];
  for (const t of topics) {
    const i = bandIndex(BANDS[t].length, lv, t === 'div' && topic === 'mix' ? MIX_DIV_FROM : 1);
    out.push({ topic: t, band: i, weight: 2 });
    if (i > 0) out.push({ topic: t, band: i - 1, weight: 1 });
  }
  return out;
}

/**
 * 레벨표. mix: 나오는 몬스터와 비율(무게), travel: 성까지 오는 시간(초).
 * 레벨마다 가장 약한 몬스터가 하나 빠지고 새 몬스터가 하나 들어온다(서서히 바뀐다).
 * 실물 주판으로 풀 시간을 남기려고 빠르기는 한 레벨에 조금씩만 바꾼다.
 */
export const LEVELS = [
  { mix: { slime: 3, bat: 1 }, travel: 45 },
  { mix: { slime: 1, bat: 2, mushroom: 1 }, travel: 43 },
  { mix: { bat: 1, mushroom: 2, spider: 1 }, travel: 41 },
  { mix: { mushroom: 1, spider: 2, raven: 1 }, travel: 39 },
  { mix: { spider: 1, raven: 2, zombie: 1 }, travel: 37 },
  { mix: { raven: 1, zombie: 2, skeleton: 1 }, travel: 35 },
  { mix: { zombie: 1, skeleton: 2, ghost: 1 }, travel: 33 },
  { mix: { skeleton: 1, ghost: 2, goblin: 1 }, travel: 31 },
  { mix: { ghost: 1, goblin: 2, golem: 1 }, travel: 30 },
  { mix: { goblin: 1, golem: 2, knight: 1 }, travel: 29 },
  { mix: { golem: 1, knight: 2, witch: 1 }, travel: 28 },
  { mix: { knight: 1, witch: 2, dragon: 1 }, travel: 27 },
  { mix: { witch: 1, dragon: 2, giant: 1 }, travel: 26 },
  { mix: { dragon: 1, giant: 2, gargoyle: 1 }, travel: 25 },
  { mix: { giant: 1, gargoyle: 2, lava: 1 }, travel: 24 },
  { mix: { gargoyle: 1, lava: 2, boss: 1 }, travel: 23 },
  { mix: { lava: 1, boss: 2 }, travel: 22 },
];
/** 레벨 하나에 무찌를 몬스터 수 */
export const PER_LEVEL = 10;
/** 마지막 레벨표를 넘으면 한 레벨에 1초씩 더 빨라지되 이보다 빠르지는 않다 */
export const MIN_TRAVEL = 16;
/** 시작 레벨로 고를 수 있는 가장 높은 레벨 */
export const START_LEVELS = LEVELS.length;

export const WALLS = 3;

/** 레벨의 몬스터와 빠르기 */
export function levelInfo(level) {
  const n = Math.max(1, Math.floor(level));
  if (n <= LEVELS.length) return LEVELS[n - 1];
  const last = LEVELS.at(-1);
  return { mix: last.mix, travel: Math.max(MIN_TRAVEL, last.travel - (n - LEVELS.length)) };
}

/** 지금 레벨: 시작 레벨 + 무찌른 몬스터 10마리마다 하나 */
export function levelAfter(startLevel, defeated) {
  return startLevel + Math.floor(defeated / PER_LEVEL);
}

/** 몬스터가 나오는 가장 짧은 간격(초) */
export const MIN_GAP = 3;

/**
 * 기본 빠르기: 아이가 고른다(2026-11-12 부모 요청). 성까지 오는 시간에 곱한다.
 * 레벨이 오르며 빨라지는 것은 그대로이고, 출발점만 바뀐다.
 */
export const PACES = {
  slow: { label: '느리게', k: 1.4 },
  normal: { label: '보통', k: 1 },
  fast: { label: '빠르게', k: 0.75 },
};
const paceK = (pace) => PACES[pace]?.k ?? 1;

/** 성까지 오는 시간(초): 레벨의 시간 × 기본 빠르기 */
export function travelFor(level, pace = 'normal') {
  return Math.round(levelInfo(level).travel * paceK(pace));
}

/** 다음 몬스터가 나오기까지(초): 성까지 오는 시간의 6분의 1, 3초보다 짧지 않게(2026-11-10: 4분의 1에서 줄임) */
export function spawnGap(level, pace = 'normal') {
  return Math.max(MIN_GAP, travelFor(level, pace) / 6);
}

/** 레벨에 나오는 몬스터 종류(약한 것부터) */
export function typesAt(level) {
  return Object.keys(ENEMIES).filter((t) => t in levelInfo(level).mix);
}

/**
 * 몬스터 하나를 만든다. 화면에 있는 몬스터와 답이 겹치지 않게 한다(답 하나로 몬스터 하나를 무찌른다).
 * @param {number} seed 판의 시드
 * @param {number} index 몇 번째 몬스터인지(0부터)
 * @param {number} level 지금 레벨
 * @param {number} spawnAt 나오는 때(판이 시작하고 흐른 초)
 * @param {Iterable<number>} taken 화면에 있는 몬스터들의 답
 * @param {{topic?: keyof TOPICS, pace?: keyof PACES}} options 문제 종류와 기본 빠르기(아이가 고른 것)
 * @returns {{id: number, type: string, problem: object, answer: number, spawnAt: number, travel: number, lane: number, level: number}}
 *   problem.island: 기술 지도에 넣을 섬
 */
export function makeEnemy(seed, index, level, spawnAt, taken = [], { topic = 'mix', pace = 'normal' } = {}) {
  const { mix } = levelInfo(level);
  const travel = travelFor(level, pace);
  const rng = createRng(seedFrom('enemy-type', seed, index));
  const entries = Object.entries(mix);
  let pick = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  let type = entries[0][0];
  for (const [k, w] of entries) {
    if ((pick -= w) < 0) {
      type = k;
      break;
    }
  }
  // 문제 단계: 레벨의 무게대로 고른다
  const bands = problemMix(topic, level);
  let pb = rng() * bands.reduce((sum, b) => sum + b.weight, 0);
  let band = bands[0];
  for (const b of bands) {
    if ((pb -= b.weight) < 0) {
      band = b;
      break;
    }
  }
  const maker = BANDS[band.topic][band.band];
  const used = new Set(taken);
  let problem;
  for (let t = 0; t < 50; t++) {
    problem = { ...maker.make(seedFrom('enemy', seed, index, t)), island: maker.island };
    if (!used.has(problem.answer)) break;
  }
  return { id: index, type, problem, answer: problem.answer, spawnAt, travel, lane: index % 3, level };
}

/** 몬스터의 위치: 0이면 오른쪽 끝, 1이면 성에 닿음. t는 판이 시작하고 흐른 초 */
export function positionAt(enemy, t) {
  return Math.max(0, Math.min(1, (t - enemy.spawnAt) / enemy.travel));
}

/** 답에 맞는 몬스터(화면에 나와 있고 아직 살아 있는 것 가운데 성에 가장 가까운 것) */
export function matchAnswer(alive, value, t) {
  const hits = alive.filter((e) => e.answer === value && t >= e.spawnAt);
  hits.sort((a, b) => positionAt(b, t) - positionAt(a, t));
  return hits[0] ?? null;
}

/** 무찌른 점수: 몬스터 점수 + 성에서 멀리서 무찌를수록 보너스(최대 절반) */
export function scoreFor(enemy, position) {
  const base = ENEMIES[enemy.type].points;
  return base + Math.round(base * 0.5 * (1 - position));
}

/** 다가오는 중인 몬스터 가운데 성에 닿은 것 */
export function reached(alive, t) {
  return alive.filter((e) => positionAt(e, t) >= 1);
}

/** 배경 단계: 레벨이 오를수록 어려움을 암시하는 땅으로 바뀐다(세 레벨마다 하나, 다섯 단계) */
export const STAGES = ['풀밭', '해 질 녘 들판', '메마른 땅', '어둠 동굴', '용암 땅'];
export function stageOf(level) {
  return Math.min(STAGES.length, Math.max(1, Math.ceil(level / 3)));
}
