// 주판 곱셈: 한 자리 × 여러 자리(docs/SPEC.md 4.3절). 순수 함수다.
// 아이가 보는 강의에서 확인한 방법을 그대로 따른다.
//  1. 자릿수: 두 수의 자릿수를 더한 만큼이 답의 자리 수. 그 자리에서 시작한다.
//  2. 순서: 여러 자리 수의 앞자리부터 한 자리 수와 곱한다.
//  3. 곱은 늘 두 칸: 한 자리 곱(0 포함)은 앞에 0을 붙인다(08, 00).
//  4. 다음 곱은 한 칸 오른쪽에서 시작해 더한다. 더할 때 덧셈 기법을 쓴다.
import { addDigit, emptyAbacus, toNumber } from './abacus.js';

/**
 * 곱셈 문제를 풀어 단계로 나눈다.
 * @param {number} a 앞 수
 * @param {number} b 뒤 수. a와 b 중 하나는 한 자리 수(1~9)여야 한다.
 * @returns {{
 *   a: number, b: number, single: number, multi: number, singleFirst: boolean,
 *   digits: number, startPlace: number, columns: number, answer: number,
 *   products: object[], finalState: number[]
 * }}
 *   digits: 답의 자릿수(자릿수 규칙), startPlace: 시작 자리 번호(0 = 일의 자리)
 *   products: 곱 하나마다 { index, digit, product, pair: [십, 일], padded, tensPlace, onesPlace,
 *             endPlace, steps, stateBefore, stateAfter }
 */
export function multiplySteps(a, b) {
  for (const n of [a, b]) if (!Number.isInteger(n) || n < 1) throw new Error(`1 이상의 정수만 곱해요: ${n}`);
  const singleFirst = a <= 9;
  if (!singleFirst && b > 9) throw new Error('한 수는 한 자리 수여야 해요');
  const single = singleFirst ? a : b;
  const multi = singleFirst ? b : a;
  const digits = String(a).length + String(b).length;
  const startPlace = digits - 1;
  const columns = digits + 1;
  let state = emptyAbacus(columns);
  const multiDigits = String(multi).split('').map(Number);
  const products = multiDigits.map((digit, index) => {
    const product = single * digit;
    const pair = [Math.floor(product / 10), product % 10];
    const tensPlace = startPlace - index;
    const onesPlace = tensPlace - 1;
    const stateBefore = state;
    const steps = [];
    for (const [value, place] of [[pair[0], tensPlace], [pair[1], onesPlace]]) {
      const r = addDigit(state, place, value);
      state = r.state;
      steps.push(...r.steps.map((s) => ({ ...s, part: place === tensPlace ? 'tens' : 'ones' })));
    }
    return { index, digit, product, pair, padded: product < 10, tensPlace, onesPlace, endPlace: onesPlace, steps, stateBefore, stateAfter: state };
  });
  const answer = toNumber(state);
  if (answer !== a * b) throw new Error(`계산이 어긋났어요: ${a} × ${b}`);
  return { a, b, single, multi, singleFirst, digits, startPlace, columns, answer, products, finalState: state };
}

/** 이 문제에 나온 특징(문제 고르기와 기술 칸에 쓴다) */
export function featuresOf(solution) {
  const steps = solution.products.flatMap((p) => p.steps);
  return {
    padded: solution.products.some((p) => p.padded),
    zeroProduct: solution.products.some((p) => p.product === 0),
    carry: steps.some((s) => ['A4', 'A5', 'A6'].includes(s.technique)),
    fiveFriend: steps.some((s) => ['A3', 'A5'].includes(s.technique)),
    shortAnswer: String(solution.answer).length < solution.digits,
    techniques: [...new Set(steps.map((s) => s.technique))],
  };
}
