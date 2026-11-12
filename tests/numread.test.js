// 숫자 읽기(docs/SPEC.md 7.3절)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { numberPieces, readNumber } from '../src/core/numread.js';

test('경계 숫자를 맞게 읽는다', () => {
  const cases = [
    [0, '영'],
    [1, '일'],
    [7, '칠'],
    [10, '십'],
    [11, '십일'],
    [20, '이십'],
    [101, '백일'],
    [110, '백십'],
    [325, '삼백이십오'],
    [1000, '천'],
    [1005, '천오'],
    [2019, '이천십구'],
    [10000, '만'],
    [10001, '만 일'],
    [15000, '만 오천'],
    [32325, '삼만 이천삼백이십오'],
    [100000, '십만'],
    [120305, '십이만 삼백오'],
    [1000000, '백만'],
    [100000000, '일억'],
    [100010000, '일억 만'],
    [123456789, '일억 이천삼백사십오만 육천칠백팔십구'],
    [-7, '마이너스 칠'],
  ];
  for (const [n, want] of cases) assert.equal(readNumber(n), want, `${n}`);
});

test('소수는 점 뒤를 하나씩 읽고(2026-11-12 소수 섬), 수가 아니면 알려 준다', () => {
  assert.equal(readNumber(1.5), '일 점 오');
  assert.equal(readNumber(0.06), '영 점 영육');
  assert.equal(readNumber(12.47), '십이 점 사칠');
  assert.equal(readNumber(0.1 + 0.2), '영 점 삼');
  assert.throws(() => readNumber(NaN));
  assert.throws(() => readNumber(Infinity));
});

test('숫자 조각을 이어 붙이면 읽은 말과 같다(띄어쓰기 빼고)', () => {
  for (let n = 0; n <= 120000; n += 37) {
    assert.equal(numberPieces(n).join(''), readNumber(n).replace(/ /g, ''), `${n}`);
  }
  for (const n of [100000000, 100010000, 123456789, 99999999]) {
    assert.equal(numberPieces(n).join(''), readNumber(n).replace(/ /g, ''), `${n}`);
  }
});

test('숫자 조각은 정해진 목록(천 자리 9개, 1~999, 큰 단위, 영, 마이너스)에서만 나온다', () => {
  const allowed = new Set(['영', '마이너스', '만', '억', '조']);
  for (let d = 1; d <= 9; d++) allowed.add(readNumber(d * 1000));
  for (let n = 1; n <= 999; n++) allowed.add(readNumber(n));
  for (const n of [0, 5, 999, 1000, 9999, 10000, 32325, 99999999, 123456789, -42]) {
    for (const piece of numberPieces(n)) assert.ok(allowed.has(piece), `${n}: ${piece}`);
  }
  assert.equal(allowed.size, 1 + 1 + 3 + 9 + 999);
});

test('조각 예시', () => {
  assert.deepEqual(numberPieces(32325), ['삼', '만', '이천', '삼백이십오']);
  assert.deepEqual(numberPieces(10000), ['만']);
  assert.deepEqual(numberPieces(100000000), ['일', '억']);
});
