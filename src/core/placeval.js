// 자리점 성 "큰 수와 쉼표" 섬. 순수 함수다.
// 근거: docs/research-curriculum.md 9.2절.
//  - 가름대의 점(자리점)은 일의 자리를 알려 준다. 점 있는 줄에서 왼쪽으로 일·십·백·천….
//  - 아이 주판은 세 줄마다 점이 있다. 그래서 점 있는 줄은 일·천·백만의 자리이고, 쉼표 찍는 자리와 같다.
// 문제 종류
//  read   화면 주판에 놓인 수를 읽어 말한다(답: 그 수)
//  digit  화면 주판에 놓인 수에서 한 자리의 숫자를 말한다(답: 0~9)
import { createRng, randInt, seedFrom } from './rng.js';

const digitAt = (n, place) => Math.floor(n / 10 ** place) % 10;

/** 3자리마다 쉼표: 30402 → "30,402" */
export function withComma(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 쉼표로 나눈 묶음(높은 자리부터): 1020304 → ["1", "020", "304"] */
export function commaGroups(n) {
  return withComma(n).split(',');
}

/** 가운데 0이 있는가(맨 끝 0은 셈하지 않는다) */
const innerZero = (n) => /0/.test(String(n).replace(/0+$/, '').slice(1));

/**
 * 조건에 맞는 수 하나.
 * @param {{digits: number, zero: boolean}} spec zero: true면 가운데 0이 꼭 있고, false면 0이 하나도 없다.
 */
function makeValue(rng, { digits, zero }) {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const ds = [randInt(rng, 1, 9)];
    for (let i = 1; i < digits; i++) ds.push(zero ? (randInt(rng, 0, 2) === 0 ? 0 : randInt(rng, 1, 9)) : randInt(rng, 1, 9));
    const n = Number(ds.join(''));
    if (zero ? innerZero(n) : !String(n).includes('0')) return n;
  }
  throw new Error(`수를 만들지 못했어요: ${digits}`);
}

/**
 * 문제 하나.
 * @param {number} seed
 * @param {{type: 'read'|'digit', digits: number, zero?: boolean, place?: number, avoid?: Set<string>}} spec
 *   place: digit 문제에서 묻는 자리(0 = 일의 자리)
 */
export function makePlaceProblem(seed, { type, digits, zero = false, place = 0, avoid = new Set() }) {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const value = makeValue(rng, { digits, zero });
    const key = `${type}:${value}`;
    if (avoid.has(key)) continue;
    if (type === 'read') {
      return { kind: 'place', type, value, key, answer: value, features: { digits, zero: innerZero(value) } };
    }
    // 묻는 자리의 숫자가 옆 자리와 같으면 옆 자리를 센 실수를 가릴 수 없으니 다시 만든다
    const answer = digitAt(value, place);
    if (answer === 0) continue;
    if ([place - 1, place + 1].some((q) => q >= 0 && q < digits && digitAt(value, q) === answer)) continue;
    return { kind: 'place', type, value, place, key, answer, features: { digits, zero: innerZero(value), place } };
  }
  throw new Error(`문제를 만들지 못했어요: ${type} ${digits}`);
}

/** 한 판의 문제 차례: 네 자리 → 다섯 자리 → 여섯 자리, 가운데 0은 뒤에 */
export const PLACE_ROUND = [
  { type: 'read', digits: 4, zero: false },
  { type: 'digit', digits: 4, place: 2 },
  { type: 'read', digits: 5, zero: false },
  { type: 'read', digits: 4, zero: true },
  { type: 'digit', digits: 5, place: 3 },
  { type: 'read', digits: 5, zero: true },
  { type: 'read', digits: 6, zero: false },
  { type: 'read', digits: 6, zero: true },
];
export const PLACE_BONUS = { type: 'read', digits: 7, zero: true };

export function placeRound(seed) {
  const used = new Set();
  const problems = PLACE_ROUND.map((spec, i) => {
    const p = makePlaceProblem(seedFrom('dec-1', seed, i), { ...spec, avoid: used });
    used.add(p.key);
    return p;
  });
  const bonus = makePlaceProblem(seedFrom('dec-1', 'bonus', seed), { ...PLACE_BONUS, avoid: used });
  return { problems, bonus };
}

/**
 * 오답 짐작(선생님은 "~한 것 같아요"로 말한다).
 * @returns {{kind: 'correct'|'shift'|'zero-drop'|'neighbor'|'unknown'}}
 *   shift: 일의 자리를 한 줄 옆으로 봄(10배, 10분의 1)
 *   zero-drop: 가운데 빈 줄(0)을 빠뜨림
 *   neighbor: 자리 숫자 문제에서 옆 자리를 셈
 */
export function diagnosePlace(problem, given) {
  if (given === problem.answer) return { kind: 'correct' };
  if (problem.type === 'digit') {
    const { value, place } = problem;
    if ([place - 1, place + 1].some((q) => q >= 0 && digitAt(value, q) === given)) return { kind: 'neighbor' };
    return { kind: 'unknown' };
  }
  const v = problem.value;
  if (given === v * 10 || given * 10 === v) return { kind: 'shift' };
  const s = String(v);
  const dropped = s.replace(/0+$/, '').replace(/0/g, '') + (s.match(/0+$/)?.[0] ?? '');
  if (dropped !== s && given === Number(dropped)) return { kind: 'zero-drop' };
  if (given === Number(s.replace(/0/g, ''))) return { kind: 'zero-drop' };
  return { kind: 'unknown' };
}
