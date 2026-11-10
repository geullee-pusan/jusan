// 두 자리 × 두 자리 곱셈(곱셈 산 "두 자리 × 두 자리" 섬). 순수 함수다.
// 근거: docs/research-curriculum.md 9.1절. 1강(한 자리 곱셈, multiply.js) 규칙을 그대로 넓힌다.
//  1. 자릿수: 두 수의 자릿수를 더한 만큼이 답의 자리 수. 그 자리에서 시작한다.
//  2. 순서: 앞 수의 앞자리부터, 그 숫자에 뒤 수의 앞자리부터 곱한다.
//  3. 곱은 늘 두 칸(한 자리 곱은 앞에 0: 08, 00).
//  4. 뒤 수의 다음 숫자와 곱한 것은 한 칸 오른쪽에 더한다.
//  5. 앞 수의 다음 숫자로 넘어가면 시작 자리가 한 칸 오른쪽으로 옮겨 간다(줄 옮기기).
// 곱이 놓이는 자리: 앞 수의 i째 숫자(앞에서 0부터) × 뒤 수의 j째 숫자 → 십의 칸 = 시작 자리 − i − j.
import { addDigit, emptyAbacus, toNumber } from './abacus.js';
import { createRng, randInt, seedFrom } from './rng.js';

const digitsOf = (n) => String(n).split('').map(Number);

/**
 * @param {number} a 앞 수(두 자리 이상)
 * @param {number} b 뒤 수(두 자리 이상)
 * @returns {{a, b, digits, startPlace, columns, answer, rows: object[], products: object[], finalState}}
 *   rows: 앞 수의 숫자마다 { index, digit, startPlace, products }
 *   products: 곱 하나마다 { index, row, col, x, y, product, pair, padded, tensPlace, onesPlace, steps }
 *     x: 앞 수의 숫자, y: 뒤 수의 숫자. index는 전체 차례(0부터)
 */
export function multiplyLong(a, b) {
  for (const n of [a, b]) if (!Number.isInteger(n) || n < 10) throw new Error(`두 자리 이상만 곱해요: ${n}`);
  const da = digitsOf(a);
  const db = digitsOf(b);
  const digits = da.length + db.length;
  const startPlace = digits - 1;
  const columns = digits + 1;
  let state = emptyAbacus(columns);
  const products = [];
  const rows = da.map((x, i) => {
    const rowProducts = db.map((y, j) => {
      const product = x * y;
      const pair = [Math.floor(product / 10), product % 10];
      const tensPlace = startPlace - i - j;
      const onesPlace = tensPlace - 1;
      const steps = [];
      for (const [value, place] of [[pair[0], tensPlace], [pair[1], onesPlace]]) {
        const r = addDigit(state, place, value);
        state = r.state;
        steps.push(...r.steps.map((s) => ({ ...s, part: place === tensPlace ? 'tens' : 'ones' })));
      }
      const p = { index: products.length, row: i, col: j, x, y, product, pair, padded: product < 10, tensPlace, onesPlace, steps };
      products.push(p);
      return p;
    });
    return { index: i, digit: x, startPlace: startPlace - i, products: rowProducts };
  });
  const answer = toNumber(state);
  if (answer !== a * b) throw new Error(`계산이 어긋났어요: ${a} × ${b}`);
  return { a, b, digits, startPlace, columns, answer, rows, products, finalState: state };
}

/** 이 문제에 나온 특징(문제 고르기와 기술 칸에 쓴다) */
export function longFeatures(solution) {
  const steps = solution.products.flatMap((p) => p.steps);
  return {
    padded: solution.products.some((p) => p.padded && p.product > 0),
    zeroProduct: solution.products.some((p) => p.product === 0),
    carry: steps.some((s) => ['A4', 'A5', 'A6'].includes(s.technique)),
    shortAnswer: String(solution.answer).length < solution.digits,
    techniques: [...new Set(steps.map((s) => s.technique))],
  };
}

/**
 * 조건에 맞는 두 자리 × 두 자리 문제 하나.
 * @param {number} seed
 * @param {{need?: {carry?: boolean, padded?: boolean, zeroProduct?: boolean}, avoid?: Set<string>}} spec
 *   need의 값: true면 꼭 있고, false면 없다. 빠지면 상관없다.
 */
export function makeLongProblem(seed, { need = {}, avoid = new Set() } = {}) {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const a = randInt(rng, 11, 99);
    const b = randInt(rng, 11, 99);
    if (a % 10 === 0 && b % 10 === 0) continue; // 둘 다 영으로 끝나면 너무 쉽다
    if (a % 11 === 0 && b % 11 === 0) continue;
    const key = `${a}x${b}`;
    if (avoid.has(key)) continue;
    const solution = multiplyLong(a, b);
    const f = longFeatures(solution);
    if (Object.entries(need).every(([name, want]) => want === undefined || f[name] === want)) {
      return { kind: 'mul2', a, b, key, answer: solution.answer, solution, features: f };
    }
  }
  throw new Error(`조건에 맞는 문제를 찾지 못했어요: ${JSON.stringify(need)}`);
}

/** 한 판의 문제 차례: 쉬운 것 → 어려운 것 */
export const LONG_ROUND = [
  { carry: false, padded: false },
  { carry: false },
  { carry: false, padded: true },
  { carry: true, padded: false },
  { carry: true },
  { carry: true, padded: true },
  { zeroProduct: true },
  { carry: true, padded: true },
];

/** 한 판(여덟 문제)과 보너스 문제 */
export function longRound(seed) {
  const used = new Set();
  const problems = LONG_ROUND.map((need, i) => {
    const p = makeLongProblem(seedFrom('mul-2x2', seed, i), { need, avoid: used });
    used.add(p.key);
    return p;
  });
  const bonus = makeLongProblem(seedFrom('mul-2x2', 'bonus', seed), { need: { carry: true, padded: true, zeroProduct: false }, avoid: used });
  return { problems, bonus };
}

/**
 * 오답 짐작. 선생님은 "~한 것 같아요"라고 짐작임을 밝혀 말한다.
 * @returns {{kind: string, productIndex?: number}}
 *   correct | no-shift(앞 수의 둘째 숫자로 곱한 것을 한 칸 옮기지 않음) | no-pad(0 붙이기를 놓침)
 *   | no-carry(받아올림을 놓침) | place(자리를 잘못 읽음) | product(곱 하나가 틀림, candidates: 같은 자리에 놓는 곱들) | unknown
 */
export function diagnoseLong(solution, given) {
  const { answer, products } = solution;
  if (given === answer) return { kind: 'correct' };

  // 줄을 옮기지 않았다면: 앞 수의 모든 숫자를 첫 숫자 자리에서 곱한 셈
  const noShift = products.reduce((sum, p) => sum + p.product * 10 ** (p.onesPlace + p.row), 0);
  if (noShift !== answer && given === noShift) return { kind: 'no-shift' };

  // 한 자리 곱에 0을 붙이지 않고 십의 칸에 놓았다면
  if (products.some((p) => p.padded && p.product > 0)) {
    const noPad = products.reduce((sum, p) => sum + p.product * 10 ** (p.padded ? p.tensPlace : p.onesPlace), 0);
    if (given === noPad) return { kind: 'no-pad' };
  }

  // 받아올림을 하지 않았다면: 자리마다 더한 값의 끝자리만 남는다
  const cols = new Array(solution.columns + 1).fill(0);
  for (const p of products) {
    cols[p.tensPlace] += p.pair[0];
    cols[p.onesPlace] += p.pair[1];
  }
  const noCarry = cols.reduce((sum, v, place) => sum + (v % 10) * 10 ** place, 0);
  if (noCarry !== answer && given === noCarry) return { kind: 'no-carry' };

  if (given === answer * 10 || given * 10 === answer) return { kind: 'place' };

  // 곱 하나가 틀렸다면: 차이가 그 곱의 자리에서 작은 값만큼
  //  같은 자리에 놓는 곱이 여럿이면 어느 것인지 모르므로 모두 후보로 둔다
  const diff = given - answer;
  for (const p of products) {
    const unit = 10 ** p.onesPlace;
    if (diff % unit === 0 && Math.abs(diff / unit) <= 20 && (diff / unit) % 10 !== 0) {
      const candidates = products.filter((q) => q.onesPlace === p.onesPlace).map((q) => q.index);
      return { kind: 'product', productIndex: p.index, candidates };
    }
  }
  return { kind: 'unknown' };
}
