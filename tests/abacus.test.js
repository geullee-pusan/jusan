// 주판 모델과 덧셈 기법 판별(docs/SPEC.md 4.1~4.2절)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDigit, addNumber, beads, fromNumber, toNumber } from '../src/core/abacus.js';

test('숫자와 주판 상태는 서로 되돌릴 수 있다', () => {
  for (const n of [0, 1, 5, 9, 10, 99, 522, 3752, 123456789]) {
    assert.equal(toNumber(fromNumber(n, 10)), n);
  }
  assert.throws(() => fromNumber(1000, 3));
});

test('한 자리 값은 윗알과 아래알로 나타난다', () => {
  assert.deepEqual(beads(0), { upper: 0, lower: 0 });
  assert.deepEqual(beads(4), { upper: 0, lower: 4 });
  assert.deepEqual(beads(5), { upper: 1, lower: 0 });
  assert.deepEqual(beads(8), { upper: 1, lower: 3 });
});

/** 일의 자리 v에 d를 더할 때 일의 자리 단계의 기법 */
function techniqueAt(v, d, columns = 3) {
  const { steps } = addDigit(fromNumber(v, columns), 0, d);
  return steps.find((s) => s.place === 0).technique;
}

test('SPEC 4.2절 표의 예가 맞게 판별된다', () => {
  assert.equal(techniqueAt(1, 3), 'A1');
  assert.equal(techniqueAt(2, 6), 'A2');
  assert.equal(techniqueAt(0, 5), 'A2');
  assert.equal(techniqueAt(3, 4), 'A3');
  assert.equal(techniqueAt(7, 5), 'A4');
  assert.equal(techniqueAt(4, 8), 'A4');
  assert.equal(techniqueAt(5, 6), 'A5');
  assert.equal(techniqueAt(6, 7), 'A5');
});

test('이어서 받아올리기: 95 + 7', () => {
  const { state, steps } = addDigit(fromNumber(95, 4), 0, 7);
  assert.equal(toNumber(state), 102);
  assert.ok(steps.some((s) => s.place === 1 && s.technique === 'A6'));
});

test('한 자리 덧셈 100가지 조합이 모두 맞는 답을 낸다', () => {
  for (let v = 0; v <= 9; v++) {
    for (let d = 0; d <= 9; d++) {
      const { state } = addDigit(fromNumber(v, 3), 0, d);
      assert.equal(toNumber(state), v + d, `${v}+${d}`);
    }
  }
});

test('한 자리 덧셈 100가지의 기법 표(사람이 확인한 것)', () => {
  // 행: 주판의 값 v(0~9), 열: 더하는 수 d(1~9). 1=A1 … 5=A5
  // 몇 줄을 손으로 따져 확인했다: v=5에 6을 더하면 친구수 4를 빼야 하는데 아래알이 없어 5의 짝을 쓴다(A5).
  const table = [
    '111122222', // v=0: 1~4 바로, 5~9 윗알 함께
    '111322224', // v=1: 1+4는 5의 짝, 1+9는 친구수
    '113322244', // v=2
    '133322444', // v=3
    '333324444', // v=4: 1~4는 5의 짝, 5는 윗알, 6~9는 친구수
    '111145555', // v=5: 5는 친구수(윗알을 빼고 올림), 6~9는 친구수 빼기에 5의 짝이 필요
    '111445554', // v=6
    '114445544', // v=7
    '144445444', // v=8
    '444444444', // v=9: 무엇을 더해도 넘친다
  ];
  for (let v = 0; v <= 9; v++) {
    for (let d = 1; d <= 9; d++) {
      const want = `A${table[v][d - 1]}`;
      assert.equal(techniqueAt(v, d), want, `${v}+${d}`);
    }
  }
});

test('여러 자리 수를 앞자리부터 더한다', () => {
  const { state, steps } = addNumber(fromNumber(450, 4), 72, 0);
  assert.equal(toNumber(state), 522);
  assert.equal(steps[0].place, 2, '받아올림(백의 자리 +1)을 먼저 한다');
  assert.equal(steps[1].technique, 'A5', '십의 자리 5에서 친구수 3을 빼려면 5의 짝이 필요하다');
  assert.equal(steps[1].friend, 3, '7의 친구수 3을 뺀다');
});

import { subDigit, subNumber } from '../src/core/abacus.js';

/** 일의 자리 v에서 d를 뺄 때(앞자리에 빌려 올 1이 있음) 일의 자리 단계의 기법 */
function subTechniqueAt(v, d) {
  const { steps } = subDigit(fromNumber(10 + v, 3), 0, d);
  return steps.find((s) => s.place === 0).technique;
}

test('뺄셈 기법 표: 덧셈의 거울(손으로 따져 확인한 줄 포함)', () => {
  // v=5에서 3을 빼려면 아래알이 없어 아래알 2를 넣고 윗알을 올린다(B3).
  // v=4에서 6을 빼려면 앞자리에서 1 빌리고 친구수 4를 더해야 하는데 아래알이 꽉 차 5의 짝으로 더한다(B5).
  const table = [
    '444444444', // v=0: 무엇을 빼도 모자란다
    '144445444',
    '114445544',
    '111445554',
    '111145555', // v=4
    '333324444', // v=5: 1~4는 5의 짝, 5는 윗알 빼기, 6~9는 친구수
    '133322444',
    '113322244',
    '111322224',
    '111122222', // v=9
  ];
  for (let v = 0; v <= 9; v++) {
    for (let d = 1; d <= 9; d++) assert.equal(subTechniqueAt(v, d), `B${table[v][d - 1]}`, `${v}-${d}`);
  }
});

test('뺄셈 100가지 조합과 여러 자리 뺄셈이 맞는 답을 낸다', () => {
  for (let v = 0; v <= 99; v++) {
    for (let d = 0; d <= 9; d++) {
      if (v - d < 0) continue;
      assert.equal(toNumber(subDigit(fromNumber(v, 3), 0, d).state), v - d, `${v}-${d}`);
    }
  }
  assert.equal(toNumber(subNumber(fromNumber(522, 4), 72).state), 450);
});

test('이어서 받아내리기: 102 - 5', () => {
  const { state, steps } = subDigit(fromNumber(102, 4), 0, 5);
  assert.equal(toNumber(state), 97);
  assert.ok(steps.some((s) => s.technique === 'B6'));
});

test('주판에 없는 만큼 빼면 알려 준다', () => {
  assert.throws(() => subDigit(fromNumber(3, 2), 0, 5));
});
