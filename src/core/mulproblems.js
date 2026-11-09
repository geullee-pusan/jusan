// 한 자리 곱셈 수업의 문제 만들기(docs/SPEC.md 5장). 순수 함수, 시드로 정해진다.
// 같은 수업 시드는 언제나 같은 문제를 낸다.
import { featuresOf, multiplySteps } from './multiply.js';
import { createRng, randInt, seedFrom } from './rng.js';

/** 강의에 나온 문제는 내지 않는다(아이가 답을 외웠을 수 있다). */
const LECTURE_PROBLEMS = new Set(['9x58', '56x4', '221x4', '4x938', '9x76', '33x2', '6x504', '487x2']);

/**
 * 조건에 맞는 곱셈 문제 하나를 만든다.
 * @param {number} seed
 * @param {{multiDigits: 2|3, singleFirst: boolean, need?: {carry?: boolean, padded?: boolean, zeroProduct?: boolean}, avoid?: Set<string>}} spec
 *   need의 각 값: true면 꼭 있어야 하고, false면 없어야 한다. 빠지면 상관없다.
 */
export function makeMulProblem(seed, { multiDigits, singleFirst, need = {}, avoid = new Set() }) {
  const rng = createRng(seed);
  const lo = 10 ** (multiDigits - 1);
  const hi = 10 ** multiDigits - 1;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const single = randInt(rng, 2, 9);
    const multi = randInt(rng, lo, hi);
    const [a, b] = singleFirst ? [single, multi] : [multi, single];
    const key = `${a}x${b}`;
    if (LECTURE_PROBLEMS.has(key) || avoid.has(key)) continue;
    const solution = multiplySteps(a, b);
    const f = featuresOf(solution);
    if (Object.entries(need).every(([name, want]) => want === undefined || f[name] === want)) {
      return { kind: 'mul', a, b, key, answer: solution.answer, solution, features: f };
    }
  }
  throw new Error(`조건에 맞는 문제를 찾지 못했어요: ${JSON.stringify({ multiDigits, singleFirst, need })}`);
}

/**
 * 한 강(한 자리 곱셈)의 문제 묶음.
 *  together: 선생님과 같이 푸는 4문제(두 자리 2개, 세 자리 2개)
 *  practice: 혼자 푸는 기초문제 4개
 */
export function lessonProblems(seed) {
  const used = new Set();
  const make = (name, spec) => {
    const p = makeMulProblem(seedFrom('mul-1digit', seed, name), { ...spec, avoid: used });
    used.add(p.key);
    return p;
  };
  const together = [
    make('t1', { multiDigits: 2, singleFirst: true, need: { carry: true, padded: false } }),
    make('t2', { multiDigits: 2, singleFirst: false, need: { carry: false, padded: false } }),
    make('t3', { multiDigits: 3, singleFirst: false, need: { padded: true, carry: false } }),
    make('t4', { multiDigits: 3, singleFirst: true, need: { padded: false, carry: false } }),
  ];
  const practice = [
    make('p1', { multiDigits: 2, singleFirst: true, need: { padded: false } }),
    make('p2', { multiDigits: 2, singleFirst: false, need: { padded: true } }),
    make('p3', { multiDigits: 3, singleFirst: true, need: { zeroProduct: true } }),
    make('p4', { multiDigits: 3, singleFirst: false, need: { padded: true, carry: true } }),
  ];
  return { together, practice };
}
