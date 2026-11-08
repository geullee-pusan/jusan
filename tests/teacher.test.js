// 선생님 대사와 장면(docs/SPEC.md 7.3절)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { answerScenes, endScenes, greetScenes, pickLine, problemScenes, sumRows } from '../src/core/teacher.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = JSON.parse(readFileSync(resolve(ROOT, 'src/content/teacher.json'), 'utf8'));
const allLines = Object.values(script.lines).flat();

test('대사 id는 겹치지 않는다', () => {
  const ids = allLines.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('대사 규칙: 한 문장은 짧게, 바뀌는 숫자를 넣지 않고, 요란한 칭찬을 하지 않는다', () => {
  for (const { id, text } of allLines) {
    for (const sentence of text.split(/(?<=[.?!])\s+/)) assert.ok([...sentence].length <= 30, `${id}: ${sentence}`);
    assert.ok(!/\d/.test(text) || /10의 짝|5의 짝/.test(text), `${id}에 숫자가 있어요: ${text}`);
    assert.ok(!/최고|천재|대박/.test(text), `${id}: ${text}`);
  }
});

test('목소리는 하나이고 높낮이·빠르기가 브라우저 범위 안이다', () => {
  const v = script.voice;
  assert.ok(v.pitch >= 0 && v.pitch <= 2);
  assert.ok(v.rate >= 0.1 && v.rate <= 10);
});

test('같은 시드는 같은 대사를 고른다', () => {
  for (let seed = 0; seed < 20; seed++) {
    assert.deepEqual(pickLine(script, 'correct', seed), pickLine(script, 'correct', seed));
  }
  const seen = new Set();
  for (let seed = 0; seed < 50; seed++) seen.add(pickLine(script, 'correct', seed).id);
  assert.equal(seen.size, script.lines.correct.length, '여러 시드로 고르면 모든 대사가 한 번은 나온다');
});

test('문제 부르기: 줄마다 칠판에 쓰고, 더하기·빼기를 붙여 부르고, 묻고, 기다리고, 듣는다', () => {
  const scenes = problemScenes(script, [32, 15, -7], 3);
  const numbers = scenes.filter((s) => s.kind === 'number');
  assert.deepEqual(numbers.map((s) => s.text), ['삼십이', '더하기 십오', '빼기 칠', '은?']);
  assert.deepEqual(numbers.map((s) => s.sign), ['', '+', '-', '']);
  assert.deepEqual(numbers[1].pieces, ['더하기', '십오']);
  assert.equal(scenes[0].kind, 'clear');
  assert.deepEqual(scenes.slice(-3).map((s) => s.kind), ['wait', 'say', 'listen']);
  assert.equal(sumRows([32, 15, -7]), 40);
});

test('듣고만 푸는 문제는 칠판에 쓰지 않는다', () => {
  const scenes = problemScenes(script, [3, 4], 1, { show: false });
  assert.ok(scenes.filter((s) => s.kind === 'number').every((s) => s.show === false));
});

test('첫 줄이 빼기거나 줄이 없으면 알려 준다', () => {
  assert.throws(() => problemScenes(script, [-3, 4], 1));
  assert.throws(() => problemScenes(script, [], 1));
});

test('맞으면 끄덕이고 칭찬, 틀리면 다시 보자고 한다', () => {
  assert.deepEqual(answerScenes(script, true, 1).map((s) => s.kind), ['nod', 'say']);
  assert.ok(answerScenes(script, false, 1)[0].id.startsWith('wrong'));
});

test('수업 끝: 맞힌 수를 말하고 인사한 뒤 쓰러진다', () => {
  const scenes = endScenes(script, 8, 5);
  assert.equal(scenes.find((s) => s.kind === 'number').text, '팔');
  assert.equal(scenes.at(-1).kind, 'fall');
});

test('장면 목록은 같은 입력에 늘 같다', () => {
  assert.deepEqual(problemScenes(script, [12, -5, 9], 42), problemScenes(script, [12, -5, 9], 42));
  assert.deepEqual(greetScenes(script, 9), greetScenes(script, 9));
});
