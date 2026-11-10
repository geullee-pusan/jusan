// 곱셈 수업 문제 만들기, 오답 짐작, 말로 들은 숫자 바꾸기
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diagnoseMul } from '../src/core/muldiagnose.js';
import { multiplySteps } from '../src/core/multiply.js';
import { lessonProblems, makeMulProblem } from '../src/core/mulproblems.js';
import { parseSpokenCommand, parseSpokenNumber, pickSpokenNumber } from '../src/core/numhear.js';
import { readNumber } from '../src/core/numread.js';

test('수업 문제 묶음은 같은 시드면 같고, 조건을 지킨다', () => {
  for (let seed = 0; seed < 30; seed++) {
    const a = lessonProblems(seed);
    assert.deepEqual(lessonProblems(seed).practice.map((p) => p.key), a.practice.map((p) => p.key));
    const [t1, t2, t3, t4] = a.together;
    assert.ok(t1.features.carry && t1.a <= 9 && t1.b >= 10 && t1.b <= 99);
    assert.ok(!t2.features.carry && t2.a >= 10 && t2.b <= 9);
    assert.ok(t3.features.padded && t3.a >= 100);
    assert.ok(!t4.features.padded && t4.b >= 100);
    const [p1, p2, p3, p4] = a.practice;
    assert.ok(p2.features.padded && p3.features.zeroProduct && p4.features.padded && p4.features.carry);
    assert.ok(p1.b <= 99);
    const keys = [...a.together, ...a.practice].map((p) => p.key);
    assert.equal(new Set(keys).size, keys.length, '같은 문제가 두 번 나오지 않는다');
  }
});

test('강의에 나온 문제는 내지 않는다', () => {
  const lecture = ['9x58', '56x4', '221x4', '4x938', '9x76', '33x2', '6x504', '487x2'];
  for (let seed = 0; seed < 200; seed++) {
    const p = makeMulProblem(seed, { multiDigits: 2, singleFirst: true });
    assert.ok(!lecture.includes(p.key));
  }
});

test('오답 짐작: 0 붙이기를 놓치면', () => {
  // 221 × 4를 0 없이 놓으면 8, 8, 4를 천, 백, 십 자리에 놓아 8,840이 된다
  const sol = multiplySteps(221, 4);
  assert.deepEqual(diagnoseMul(sol, 8840), { kind: 'no-pad' });
  assert.deepEqual(diagnoseMul(sol, 884), { kind: 'correct' });
});

test('오답 짐작: 받아올림을 놓치면, 자리를 잘못 읽으면, 곱 하나가 틀리면', () => {
  const sol = multiplySteps(9, 58); // 45 + 72 → 522. 받아올림 없이: 4 / 5+7=12→2 / 2 → 422
  assert.deepEqual(diagnoseMul(sol, 422), { kind: 'no-carry' });
  assert.deepEqual(diagnoseMul(sol, 5220), { kind: 'place' });
  assert.deepEqual(diagnoseMul(sol, 513), { kind: 'product', productIndex: 1 }); // 9 × 8을 71로
  assert.equal(diagnoseMul(sol, 17).kind, 'unknown');
});

test('말로 들은 숫자를 바꾼다', () => {
  const cases = [
    ['삼백이십오', 325], ['325', 325], ['삼백 이십 오', 325], ['3,024', 3024], ['삼천 이십사', 3024],
    ['삼천이십사', 3024], ['팔백팔십사', 884], ['답은 팔백팔십사요', 884], ['오백이십이예요', 522],
    ['육십육', 66], ['만', 10000], ['만 오천', 15000], ['삼만 이천삼백이십오', 32325], ['영', 0],
    ['스물다섯', 25], ['열', 10], ['3천24', 3024], ['칠', 7],
  ];
  for (const [text, want] of cases) assert.equal(parseSpokenNumber(text), want, text);
  for (const text of ['', '안녕', '사과']) assert.equal(parseSpokenNumber(text), null, text);
});

test('읽은 숫자를 다시 알아듣는다(0~10,000)', () => {
  for (let n = 0; n <= 10000; n += 7) assert.equal(parseSpokenNumber(readNumber(n)), n, readNumber(n));
});

test('후보 중 숫자로 바뀌는 첫 후보를 쓴다', () => {
  assert.equal(pickSpokenNumber(['안녕', '팔백 팔십사', '884']), 884);
  assert.equal(pickSpokenNumber(['안녕']), null);
});

test('짧은 대답과 명령', () => {
  assert.equal(parseSpokenCommand('네'), 'yes');
  assert.equal(parseSpokenCommand('아니요'), 'no');
  // 네·아니요를 여러 말로(안드로이드는 "네"를 "내"로 듣기도 한다)
  for (const t of ['내', '넵', '예', '응', '좋아요', '풀래요', '할래', '해볼래요', '네 풀래요', '오케이']) assert.equal(parseSpokenCommand(t), 'yes', t);
  for (const t of ['아니', '아뇨', '싫어요', '안 할래요', '안 풀래', '괜찮아요', '됐어요']) assert.equal(parseSpokenCommand(t), 'no', t);
  assert.equal(parseSpokenCommand('다 했어요'), 'done');
  assert.equal(parseSpokenCommand('다시 말해 주세요'), 'again');
  assert.equal(parseSpokenCommand('그만할래요'), 'stop');
});
