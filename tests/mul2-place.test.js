// 두 자리 × 두 자리 섬과 자리점 성(큰 수와 쉼표) 섬. 근거: docs/research-curriculum.md 9절
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { answerScenes, askScenes, demoScenes, islandRound, lectureParts, mergeScript, replayScenes } from '../src/core/islands.js';
import { multiplySteps } from '../src/core/multiply.js';
import { diagnoseLong, LONG_ROUND, longFeatures, longRound, multiplyLong } from '../src/core/mul2.js';
import { commaGroups, diagnosePlace, makePlaceProblem, PLACE_ROUND, placeRound, withComma } from '../src/core/placeval.js';
import { skillsOfResult } from '../src/core/skills.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (id) => JSON.parse(readFileSync(resolve(ROOT, `src/content/lessons/${id}.json`), 'utf8'));
const common = load('common');
const texts = (scenes) => scenes.filter((s) => s.kind === 'say').map((s) => s.text);

// ---------- 두 자리 × 두 자리 ----------

test('연맹 안내서 54 × 37: 곱이 놓이는 자리(12 백·십, 28 십·일, 15 천·백, 35 백·십)와 답 1,998', () => {
  const sol = multiplyLong(54, 37);
  assert.equal(sol.answer, 1998);
  assert.equal(sol.digits, 4);
  assert.equal(sol.startPlace, 3);
  const at = (x, y) => sol.products.find((p) => p.x === x && p.y === y);
  assert.deepEqual([at(4, 3).tensPlace, at(4, 3).onesPlace], [2, 1]);
  assert.deepEqual([at(4, 7).tensPlace, at(4, 7).onesPlace], [1, 0]);
  assert.deepEqual([at(5, 3).tensPlace, at(5, 3).onesPlace], [3, 2]);
  assert.deepEqual([at(5, 7).tensPlace, at(5, 7).onesPlace], [2, 1]);
  // 앞 수의 앞자리부터, 뒤 수의 앞자리부터(1강 "언제나 앞자리부터")
  assert.deepEqual(sol.products.map((p) => `${p.x}x${p.y}`), ['5x3', '5x7', '4x3', '4x7']);
  // 앞 수의 둘째 숫자로 넘어가면 시작 자리가 한 칸 오른쪽
  assert.deepEqual(sol.rows.map((r) => r.startPlace), [3, 2]);
});

test('1강 자리 규칙과 같다: 곱의 자리는 한 자리 곱셈의 같은 곱과 같은 자리 값', () => {
  // 7 × 58의 곱 자리와, 70 × 58을 두 자리 × 두 자리로 풀었을 때 첫 줄의 곱 자리는 한 칸 차이(70은 십의 자리)
  const one = multiplySteps(7, 58);
  const two = multiplyLong(70, 58);
  assert.equal(two.answer, 4060);
  one.products.forEach((p, i) => assert.equal(two.rows[0].products[i].tensPlace, p.tensPlace + 1));
  // 21 × 23(연맹 34쪽): 2×2 = 04, 영 붙이기
  const s = multiplyLong(21, 23);
  assert.equal(s.answer, 483);
  assert.ok(longFeatures(s).padded);
});

test('모든 두 자리 × 두 자리를 바르게 계산한다', () => {
  for (let a = 10; a <= 99; a++) for (let b = 10; b <= 99; b++) assert.equal(multiplyLong(a, b).answer, a * b);
});

test('두 자리 곱셈 판: 여덟 문제가 조건을 지키고, 같은 시드면 같은 문제', () => {
  for (let seed = 0; seed < 30; seed++) {
    const { problems, bonus } = longRound(seed);
    assert.equal(problems.length, 8);
    assert.deepEqual(longRound(seed).problems.map((p) => p.key), problems.map((p) => p.key));
    problems.forEach((p, i) => {
      for (const [k, want] of Object.entries(LONG_ROUND[i])) assert.equal(p.features[k], want, `${seed} ${i} ${p.key} ${k}`);
    });
    assert.equal(new Set([...problems, bonus].map((p) => p.key)).size, 9);
  }
});

test('두 자리 곱셈 오답 짐작: 시작 자리 안 옮김, 영 안 붙임, 올림 놓침, 자리 밀림, 곱 하나 틀림', () => {
  const sol = multiplyLong(54, 37); // 1998
  // 둘째 줄(4 × 37 = 148)을 옮기지 않으면 (5×37 + 4×37) × 10 = 3330
  assert.equal(diagnoseLong(sol, 3330).kind, 'no-shift');
  assert.equal(diagnoseLong(sol, 19980).kind, 'place');
  assert.equal(diagnoseLong(sol, 1998).kind, 'correct');
  const pad = multiplyLong(21, 23); // 04 03 02 03 → 483
  assert.equal(diagnoseLong(pad, 4000 + 600 + 200 + 30).kind, 'no-pad');
  const carry = multiplyLong(68, 79); // 5372
  const d = diagnoseLong(carry, 5372 + 10);
  assert.equal(d.kind, 'product');
  assert.ok(d.candidates.length >= 1);
});

test('두 자리 곱셈 섬: 같이 풀기는 시작 자리 옮기기를 말하고, 맞히면 빠르게 다시 보여 준다', () => {
  const script = mergeScript(load('mul-2x2'), common);
  const { problems } = islandRound(script, 5, []);
  const p = problems[0];
  const demo = demoScenes(script, p, 1);
  assert.ok(texts(demo).some((t) => t.includes('한 칸 오른쪽')));
  assert.equal(demo.filter((s) => s.kind === 'abacus-steps').length, 4);
  assert.ok(replayScenes(script, p).some((s) => s.kind === 'abacus-steps'));
  assert.ok(askScenes(script, p, 1, 1).some((s) => s.kind === 'board-problem'));
  const ok = answerScenes(script, p, p.answer, 1, 1);
  assert.ok(ok.correct && ok.scenes.some((s) => s.kind === 'celebrate'));
  // 틀린 답마다 힌트 대사가 있다
  for (const wrong of [p.answer * 10, p.answer + 10, p.answer + 7, 1]) {
    const r = answerScenes(script, p, wrong, 1, 1);
    assert.ok(r.retry && texts(r.scenes).length === 1, `${p.key} ${wrong}`);
  }
  const two = answerScenes(script, p, 1, 2, 1);
  assert.ok(!two.retry && two.scenes.some((s) => s.kind === 'abacus-steps'));
  assert.ok(lectureParts(script, 2).length >= 3);
});

// ---------- 자리점 성: 큰 수와 쉼표 ----------

test('쉼표는 세 자리마다', () => {
  assert.equal(withComma(30402), '30,402');
  assert.equal(withComma(1020304), '1,020,304');
  assert.deepEqual(commaGroups(1020304), ['1', '020', '304']);
  assert.equal(withComma(987), '987');
});

test('자리점 판: 여덟 문제가 조건(자릿수, 가운데 영, 묻는 자리)을 지키고 같은 시드면 같다', () => {
  for (let seed = 0; seed < 40; seed++) {
    const { problems, bonus } = placeRound(seed);
    assert.deepEqual(placeRound(seed).problems.map((p) => p.key), problems.map((p) => p.key));
    problems.forEach((p, i) => {
      const spec = PLACE_ROUND[i];
      assert.equal(String(p.value).length, spec.digits);
      if (spec.type === 'read') {
        assert.equal(p.answer, p.value);
        assert.equal(p.features.zero, spec.zero, `${p.value}`);
        if (!spec.zero) assert.ok(!String(p.value).includes('0'));
      } else {
        assert.equal(p.answer, Math.floor(p.value / 10 ** spec.place) % 10);
        assert.ok(p.answer > 0);
      }
    });
    assert.equal(String(bonus.value).length, 7);
    assert.ok(bonus.features.zero);
  }
});

test('자리점 오답 짐작: 한 줄 밀림, 빈 줄 빠뜨림, 옆 자리', () => {
  const r = makePlaceProblem(3, { type: 'read', digits: 5, zero: true });
  assert.equal(diagnosePlace(r, r.value).kind, 'correct');
  assert.equal(diagnosePlace(r, r.value * 10).kind, 'shift');
  const p = { type: 'read', value: 30402, answer: 30402 };
  assert.equal(diagnosePlace(p, 342).kind, 'zero-drop');
  assert.equal(diagnosePlace(p, 3042).kind, 'unknown');
  const q = { type: 'digit', value: 58312, place: 3, answer: 8 };
  assert.equal(diagnosePlace(q, 5).kind, 'neighbor');
  assert.equal(diagnosePlace(q, 3).kind, 'neighbor');
  assert.equal(diagnosePlace(q, 9).kind, 'unknown');
});

test('자리점 섬: 수를 화면 주판에 놓고 칠판은 비운다. 같이 읽기는 일·천의 자리를 짚는다', () => {
  const script = mergeScript(load('dec-1'), common);
  const { problems } = islandRound(script, 7, []);
  for (const [i, p] of problems.entries()) {
    const ask = askScenes(script, p, i + 1, 1);
    assert.ok(ask.some((s) => s.kind === 'abacus-set' && s.value === p.value));
    assert.ok(!ask.some((s) => s.kind === 'board-problem' || s.kind === 'board-rows'), '칠판에 답을 쓰지 않는다');
    assert.ok(ask.some((s) => s.kind === 'abacus-labels' && s.on === false), '자리 이름을 숨기고 자리점으로 센다');
    const demo = demoScenes(script, p, 1);
    const marks = demo.filter((s) => s.kind === 'abacus-highlight').map((s) => s.place);
    assert.ok(marks.includes(0) && marks.includes(3));
    assert.ok(demo.some((s) => s.kind === 'board-answer' && s.value === p.answer));
    assert.equal(replayScenes(script, p).length, 0);
    const wrong = answerScenes(script, p, p.answer + 1, 1, 1);
    assert.ok(wrong.retry && texts(wrong.scenes).length === 1);
  }
  const big = makePlaceProblem(1, { type: 'read', digits: 7, zero: true });
  assert.ok(demoScenes(script, big, 1).some((s) => s.kind === 'abacus-highlight' && s.place === 6));
  assert.ok(lectureParts(script, 2).length >= 3);
});

test('기술 지도: 새 섬 결과가 새 기술 칸에 들어간다', () => {
  assert.deepEqual(skillsOfResult('mul-2x2', { features: { carry: true }, firstTry: true }).sort(), ['mul2-carry', 'mul2-shift']);
  assert.deepEqual(skillsOfResult('dec-1', { features: { digits: 5, zero: true }, firstTry: true }).sort(), ['dec-read', 'dec-zero']);
  assert.deepEqual(skillsOfResult('dec-1', { features: { digits: 5, zero: false, place: 3 }, firstTry: true }), ['dec-place']);
});
