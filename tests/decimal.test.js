// 자리점 성 "소수" 섬. 근거: docs/research-curriculum.md 9.4절(연맹 4쪽, Totton Unit Rod·Addition·Subtraction)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { addSubDecimalOf, decimalRound, decimalsOf, diagnoseDecimal, fromScaled, makeReadProblem, readDecimalOf, toScaled } from '../src/core/decimal.js';
import { answerScenes, askScenes, demoScenes, islandRound, lectureParts, mergeScript, replayScenes } from '../src/core/islands.js';
import { parseSpokenNumber } from '../src/core/numhear.js';
import { readNumber } from '../src/core/numread.js';
import { skillsOfResult } from '../src/core/skills.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (id) => JSON.parse(readFileSync(resolve(ROOT, `src/content/lessons/${id}.json`), 'utf8'));
const script = mergeScript(load('dec-2'), load('common'));
const texts = (scenes) => scenes.filter((s) => s.kind === 'say').map((s) => s.text);

test('줄 값과 소수: 정수로 계산하고 소수로 돌린다', () => {
  assert.equal(toScaled(3.25, 2), 325);
  assert.equal(fromScaled(325, 2), 3.25);
  assert.equal(decimalsOf(3.25), 2);
  assert.equal(decimalsOf(0.1 + 0.2), 1);
  assert.equal(decimalsOf(56), 0);
});

test('Totton의 예: 8.9 + 56 = 64.9, 45.7 + 4.5 = 50.2, 22.3 − 2.8 = 19.5. 소수점 맞추기', () => {
  assert.equal(addSubDecimalOf([8.9, 56]).answer, 64.9);
  assert.equal(addSubDecimalOf([45.7, 4.5]).answer, 50.2);
  assert.equal(addSubDecimalOf([22.3, -2.8]).answer, 19.5);
  // 8.9 + 56: 56은 일의 자리를 맞춰 줄 값 560으로 놓는다(소수점이 저절로 맞는다)
  assert.deepEqual(addSubDecimalOf([8.9, 56]).scaledRows, [89, 560]);
  assert.equal(addSubDecimalOf([3.5, 1.25]).answer, 4.75);
});

test('숫자 읽기·듣기: 소수는 "삼 점 오"처럼 읽고, 들은 말도 소수로 바꾼다', () => {
  for (const [n, word] of [[3.5, '삼 점 오'], [12.47, '십이 점 사칠'], [0.6, '영 점 육'], [4.05, '사 점 영오'], [64.9, '육십사 점 구']]) {
    assert.equal(readNumber(n), word);
    assert.equal(parseSpokenNumber(word), n);
  }
  assert.equal(parseSpokenNumber('3.5'), 3.5);
  assert.equal(parseSpokenNumber('답은 19.5요'), 19.5);
  assert.equal(parseSpokenNumber('사 쩜 영오'), 4.05);
  assert.equal(parseSpokenNumber('884.'), 884);
  assert.equal(parseSpokenNumber('삼 점 오 점'), null);
});

test('소수 판: 읽기 세 문제 → 덧셈·뺄셈 다섯 문제, 조건을 지키고 같은 시드면 같다', () => {
  for (let seed = 0; seed < 30; seed++) {
    const { problems, bonus } = islandRound(script, seed, []);
    assert.deepEqual(islandRound(script, seed, []).problems.map((p) => p.key), problems.map((p) => p.key));
    problems.forEach((p, i) => {
      const spec = script.problems[i];
      assert.equal(p.type, spec.type);
      if (p.type === 'read') {
        assert.equal(decimalsOf(p.value), spec.dp);
        assert.equal(p.scaled, toScaled(p.value, spec.dp));
      } else {
        assert.equal(p.rows.length, spec.rows.length);
        p.rows.forEach((r, k) => assert.equal(decimalsOf(r), spec.rows[k].dp, `${p.key}`));
        if (spec.carry !== undefined) assert.equal(p.features.carry, spec.carry, p.key);
        assert.ok(p.answer > 0);
        const exact = p.rows.reduce((a, r) => a + toScaled(r, p.D), 0);
        assert.equal(toScaled(p.answer, p.D), exact);
      }
    });
    assert.equal(bonus.rows.length, 4);
  }
  assert.ok(decimalRound('x', [{ type: 'read', intDigits: 0, dp: 1 }], null, 1).problems[0].value < 1);
});

test('오답 짐작: 한 줄 밀림, 빈 줄(영) 빠뜨림, 소수점 안 맞춤, 올림 놓침', () => {
  const read = readDecimalOf(4.05);
  assert.equal(diagnoseDecimal(read, 4.05).kind, 'correct');
  assert.equal(diagnoseDecimal(read, 40.5).kind, 'shift');
  assert.equal(diagnoseDecimal(read, 4.5).kind, 'zero-drop');
  const p = addSubDecimalOf([3.5, 1.25]);
  assert.equal(diagnoseDecimal(p, 4.75).kind, 'correct');
  assert.equal(diagnoseDecimal(p, 1.6).kind, 'align'); // 35 + 125처럼 끝자리끼리
  assert.equal(diagnoseDecimal(p, 47.5).kind, 'shift');
  assert.equal(diagnoseDecimal(p, 5.75).kind, 'carry');
  assert.equal(diagnoseDecimal(p, 9).kind, 'unknown');
});

test('소수 섬 문제 내기: 읽기는 수를 자리점 오른쪽까지 놓고 자리 이름을 숨긴다. 덧셈은 칠판에 소수점을 맞춰 쓴다', () => {
  const r = makeReadProblem(5, { intDigits: 1, dp: 2 });
  const ask = askScenes(script, r, 1, 1);
  assert.ok(ask.some((s) => s.kind === 'abacus-set' && s.value === r.scaled && s.at === -2));
  assert.ok(ask.some((s) => s.kind === 'abacus-labels' && s.on === false));
  const a = addSubDecimalOf([8.9, 56]);
  const ask2 = askScenes(script, a, 4, 1);
  assert.ok(ask2.some((s) => s.kind === 'board-rows' && s.decimals === 1));
  assert.ok(texts(ask2).includes('팔 점 구.'));
});

test('소수 같이 풀기: 일의 자리와 소수 첫째·둘째 자리를 짚고, 덧셈은 일의 자리를 맞춰 놓는다', () => {
  const read = demoScenes(script, readDecimalOf(12.47), 1);
  const marks = read.filter((s) => s.kind === 'abacus-highlight').map((s) => s.place);
  assert.ok([0, -1, -2].every((p) => marks.includes(p)));
  assert.ok(read.some((s) => s.kind === 'board-answer' && s.value === 12.47));
  const add = demoScenes(script, addSubDecimalOf([22.3, -2.8]), 1);
  const said = texts(add);
  assert.ok(said.some((t) => t.includes('자리점 줄에 맞춰')));
  assert.ok(said.some((t) => t.includes('소수 첫째 자리에서')));
  // 알 움직임은 화면 자리(소수 첫째 자리 = −1)로 옮겨져 있다
  const steps = add.filter((s) => s.kind === 'abacus-steps').flatMap((s) => s.steps);
  assert.ok(steps.some((s) => s.place === -1));
  assert.ok(replayScenes(script, addSubDecimalOf([22.3, -2.8])).some((s) => s.kind === 'abacus-steps'));
  assert.equal(replayScenes(script, readDecimalOf(3.5)).length, 0);
  const hint = answerScenes(script, addSubDecimalOf([3.5, 1.25]), 1.6, 1, 1);
  assert.ok(hint.retry && texts(hint.scenes)[0].includes('소수점'));
});

test('소수 강의: 읽기 두 번, 덧셈·뺄셈 세 번(Totton의 예)을 같이 푼다', () => {
  const parts = lectureParts(script, 1).filter((p) => p.some((s) => s.kind === 'wait'));
  assert.equal(parts.length, 5);
  assert.ok(parts[2].some((s) => s.kind === 'board-rows' && s.rows.join() === '8.9,56'));
});

test('기술 지도: 소수 읽기와 소수점 맞추기 칸', () => {
  assert.deepEqual(skillsOfResult('dec-2', { features: readDecimalOf(3.5).features, firstTry: true }), ['dec-point']);
  assert.deepEqual(skillsOfResult('dec-2', { features: addSubDecimalOf([3.5, 1.25]).features, firstTry: true }), ['dec-align']);
});
