// 주판 곱셈(docs/SPEC.md 4.3절). 강의에서 확인한 예로 검사한다(assets/lesson-notes/).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toNumber } from '../src/core/abacus.js';
import { featuresOf, multiplySteps } from '../src/core/multiply.js';

/** 곱마다 주판 상태(높은 자리부터 글자로) */
function trail(sol) {
  return sol.products.map((p) => p.stateAfter.slice(0, sol.digits).reverse().join(''));
}

test('9 × 58: 백의 자리에서 시작, 45 → 72를 더해 522(십의 자리에서 친구수)', () => {
  const sol = multiplySteps(9, 58);
  assert.equal(sol.digits, 3);
  assert.equal(sol.startPlace, 2);
  assert.deepEqual(sol.products.map((p) => p.pair.join('')), ['45', '72']);
  assert.deepEqual(trail(sol), ['450', '522']);
  const second = sol.products[1].steps;
  assert.ok(second.some((s) => s.place === 1 && s.friend === 3), '7의 친구수 3을 뺀다');
  assert.ok(featuresOf(sol).carry);
});

test('56 × 4: 20 → 24, 답 224', () => {
  const sol = multiplySteps(56, 4);
  assert.equal(sol.singleFirst, false);
  assert.deepEqual(sol.products.map((p) => p.pair.join('')), ['20', '24']);
  assert.deepEqual(trail(sol), ['200', '224']);
});

test('221 × 4: 곱이 한 자리면 앞에 0을 붙인다(08, 08, 04) → 884', () => {
  const sol = multiplySteps(221, 4);
  assert.equal(sol.startPlace, 3, '천의 자리에서 시작');
  assert.deepEqual(sol.products.map((p) => p.pair.join('')), ['08', '08', '04']);
  assert.ok(sol.products.every((p) => p.padded));
  assert.deepEqual(trail(sol), ['0800', '0880', '0884']);
  assert.equal(sol.answer, 884);
  assert.ok(featuresOf(sol).shortAnswer, '답이 자릿수 규칙보다 한 자리 짧다');
});

test('4 × 938 = 3752, 9 × 76 = 684, 33 × 2 = 66, 487 × 2 = 974', () => {
  assert.deepEqual(trail(multiplySteps(4, 938)), ['3600', '3720', '3752']);
  assert.equal(multiplySteps(9, 76).answer, 684);
  assert.deepEqual(multiplySteps(33, 2).products.map((p) => p.pair.join('')), ['06', '06']);
  assert.deepEqual(multiplySteps(487, 2).products.map((p) => p.pair.join('')), ['08', '16', '14']);
});

test('6 × 504: 곱이 0이어도 두 칸(00)을 차지한다 → 3,024', () => {
  const sol = multiplySteps(6, 504);
  assert.deepEqual(sol.products.map((p) => p.pair.join('')), ['30', '00', '24']);
  assert.deepEqual(sol.products.map((p) => p.tensPlace), [3, 2, 1], '다음 곱은 늘 한 칸 오른쪽');
  assert.equal(sol.products[1].steps.length, 0, '00은 놓을 알이 없다');
  assert.ok(featuresOf(sol).zeroProduct);
  assert.equal(sol.answer, 3024);
});

test('한 자리 × 두·세 자리 모든 조합이 맞는 답을 낸다', () => {
  for (let s = 1; s <= 9; s++) {
    for (let m = 10; m <= 999; m++) {
      const sol = multiplySteps(s, m);
      assert.equal(sol.answer, s * m);
      assert.equal(toNumber(sol.finalState), s * m);
      assert.equal(multiplySteps(m, s).answer, s * m);
    }
  }
});

test('두 수가 모두 두 자리 이상이면 알려 준다', () => {
  assert.throws(() => multiplySteps(12, 34));
});
