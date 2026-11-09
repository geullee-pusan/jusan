// 문제 풀기 판(2026-11-09 부모 결정: 강의보다 문제를 풀고 맞히는 것이 중심). 순수 함수다.
// 한 판은 여덟 문제다. 쉬운 것부터 0 붙이기·친구수·영영이 섞인 문제로 이어진다.
//  - 한 번에 맞히면 반짝이며 칭찬한다.
//  - 처음 틀리면 무엇을 놓쳤는지 짐작해 짚어 주고 한 번 더 풀게 한다.
//  - 두 번 틀리면 선생님이 화면 주판으로 같이 놓아 보이고 다음 문제로 간다.
//  - 여덟 문제를 마치면 보너스 문제를 풀지 아이가 고른다.
// 강의(lesson.js의 강의 부분)는 아이가 "강의 보기"를 누를 때만 본다.
import { formatDuration } from './badges.js';
import { nativeCount } from './korean.js';
import { line, solveScenes } from './lesson.js';
import { diagnoseMul } from './muldiagnose.js';
import { makeMulProblem } from './mulproblems.js';
import { readNumber } from './numread.js';
import { seedFrom } from './rng.js';

const NTH = ['', '첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째', '일곱 번째', '여덟 번째'];
const read = (n) => readNumber(n);

/** 한 판의 문제 차례: 쉬운 것 → 어려운 것 */
export const ROUND_SPECS = [
  { multiDigits: 2, singleFirst: true, need: { carry: false, padded: false } },
  { multiDigits: 2, singleFirst: false, need: { carry: false } },
  { multiDigits: 2, singleFirst: true, need: { carry: true } },
  { multiDigits: 2, singleFirst: false, need: { padded: true } },
  { multiDigits: 3, singleFirst: true, need: { padded: false } },
  { multiDigits: 3, singleFirst: false, need: { padded: true } },
  { multiDigits: 3, singleFirst: true, need: { zeroProduct: true } },
  { multiDigits: 3, singleFirst: false, need: { padded: true, carry: true } },
];

/** 한 판의 문제 여덟 개와 보너스 문제 */
export function practiceRound(seed) {
  const used = new Set();
  const problems = ROUND_SPECS.map((spec, i) => {
    const p = makeMulProblem(seedFrom('round', seed, i), { ...spec, avoid: used });
    used.add(p.key);
    return p;
  });
  const bonus = makeMulProblem(seedFrom('bonus', seed), { multiDigits: 3, singleFirst: true, need: { carry: true, padded: true }, avoid: used });
  return { problems, bonus };
}

/** 판 시작 */
export function roundStartScenes(script, seed) {
  return [line(script, 'round-start', seed)];
}

/** 문제 하나를 낸다. 칠판에 쓰고 불러 준 뒤 답을 듣는다 */
export function askProblemScenes(script, problem, no, seed) {
  return [
    { kind: 'board-problem', a: problem.a, b: problem.b },
    { kind: 'abacus-clear' },
    line(script, 'q', seed + no, { no: no === 'bonus' ? '보너스' : NTH[no], a: read(problem.a), b: read(problem.b) }),
  ];
}

/**
 * 답을 들은 뒤.
 * @param {number} tries 이번이 몇 번째 답인지(1 또는 2)
 * @returns {{correct: boolean, retry: boolean, scenes: object[], diagnosis: object}}
 */
export function answerScenes(script, problem, given, tries, seed) {
  const d = diagnoseMul(problem.solution, given);
  if (d.kind === 'correct') {
    return {
      correct: true,
      retry: false,
      diagnosis: d,
      scenes: [{ kind: 'board-answer', value: given }, { kind: 'celebrate' }, { kind: 'nod' }, line(script, tries === 1 ? 'correct-first' : 'correct-second', seed)],
    };
  }
  if (tries === 1) {
    const sol = problem.solution;
    const vars = d.kind === 'product' ? { single: read(sol.single), digit: read(sol.products[d.productIndex].digit) } : {};
    return { correct: false, retry: true, diagnosis: d, scenes: [line(script, `hint-${d.kind}`, seed, vars)] };
  }
  return {
    correct: false,
    retry: false,
    diagnosis: d,
    scenes: [line(script, 'together-now', seed), ...solveScenes(script, problem, seed)],
  };
}

/** 여덟 문제 뒤 보너스 문제를 물어본다 */
export function bonusAskScenes(script, seed) {
  return [line(script, 'bonus-ask', seed)];
}

export function bonusIntroScenes(script, seed) {
  return [line(script, 'bonus-intro', seed)];
}

/**
 * 판을 마친다: 맞힌 수, 나와의 기록, 새 배지, 인사, 쓰러지기.
 * @param {{correct: number, total: number, seconds: number|null, best: number|null, badges: {name: string, item: {name: string}}[]}} summary
 *   best: 이번 판 전까지 가장 빠른 기록(초). seconds: 이번 판(끝까지 풀었을 때만).
 */
export function roundEndScenes(script, summary, seed) {
  const L = (key, vars) => line(script, key, seed, vars);
  const scenes = [summary.correct > 0 ? L('round-result', { correct: nativeCount(summary.correct), total: nativeCount(summary.total) }) : L('round-result-zero')];
  if (Number.isFinite(summary.seconds)) {
    if (summary.best === null) scenes.push(L('time-first', { time: formatDuration(summary.seconds) }));
    else if (summary.seconds < summary.best) scenes.push(L('time-faster', { diff: formatDuration(summary.best - summary.seconds) }));
    else scenes.push(L('time-same', { time: formatDuration(summary.seconds) }));
  }
  for (const badge of summary.badges) {
    scenes.push({ kind: 'badge', badge });
    scenes.push(L('badge-new', { badge: badge.name }));
    scenes.push(L('item-new', { item: badge.item.name }));
  }
  scenes.push(L('round-bye'), { kind: 'fall' });
  return scenes;
}
