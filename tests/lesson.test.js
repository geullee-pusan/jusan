// 1강(한 자리 곱셈) 수업 만들기
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { askScenes, checkScenes, endScenes, fill, lessonPlan, solveScenes } from '../src/core/lesson.js';
import { multiplySteps, featuresOf } from '../src/core/multiply.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = JSON.parse(readFileSync(resolve(ROOT, 'src/content/lessons/mul-1digit.json'), 'utf8'));
const problem = (a, b) => {
  const solution = multiplySteps(a, b);
  return { a, b, solution, features: featuresOf(solution) };
};
const texts = (scenes) => scenes.filter((s) => s.kind === 'say').map((s) => s.text);

test('대사 틀 채우기: 받침에 맞춰 조사를 고른다', () => {
  assert.equal(fill('{x는} 좋아요', { x: '오' }), '오는 좋아요');
  assert.equal(fill('{x는} 좋아요', { x: '삼' }), '삼은 좋아요');
  assert.equal(fill('{x를} 빼요', { x: '삼' }), '삼을 빼요');
  assert.equal(fill('답은 {x이에요}', { x: '오백이십이' }), '답은 오백이십이예요');
  assert.equal(fill('답은 {x이에요}', { x: '팔백팔십사' }), '답은 팔백팔십사예요');
  assert.equal(fill('답은 {x이에요}', { x: '육십육' }), '답은 육십육이에요');
  assert.throws(() => fill('{nothing}', {}));
});

test('같이 풀기(친구수 문제): 자릿수, 곱, 친구수 설명, 끝난 자리, 답을 말한다', () => {
  const scenes = solveScenes(script, problem(9, 58), 1, { explainOrder: true });
  const said = texts(scenes);
  assert.ok(said.includes('구 곱하기 오십팔.'));
  assert.ok(said.includes('한 자리와 두 자리를 더하면 세 자리. 백의 자리에서 시작해요.'));
  assert.ok(said.includes('구 곱하기 오는 사십오.'));
  assert.ok(said.includes('구 곱하기 팔은 칠십이.'));
  assert.ok(said.some((t) => t.includes('칠의 친구수 삼을 빼요') || t.includes('친구수 삼을 빼요')), said.join('\n'));
  assert.ok(said.includes('십의 자리에서 끝났어요. 다음은 한 칸 오른쪽이에요.'));
  assert.ok(said.includes('답은 오백이십이예요.'));
  assert.equal(scenes.filter((s) => s.kind === 'abacus-steps').length, 2);
});

test('같이 풀기(0 붙이기 문제): 영을 붙인다고 말하고, 비는 앞자리와 쉼표를 짚는다', () => {
  const said = texts(solveScenes(script, problem(221, 4), 1));
  assert.ok(said.includes('사 곱하기 이는 팔.'));
  assert.ok(said.includes('한 자리니까 앞에 영을 붙여요. 영팔.'));
  assert.ok(said.includes('답은 팔백팔십사예요.'));
  assert.ok(said.includes('맨 앞 천의 자리는 비었어요.'));
  const four = texts(solveScenes(script, problem(4, 938), 1));
  assert.ok(four.includes('천의 자리에는 쉼표를 찍어서 써요.'));
  const zero = texts(solveScenes(script, problem(6, 504), 1));
  assert.ok(zero.some((t) => t.startsWith('영이어도 두 칸을 써요')));
});

test('수업 전체: 같이 풀기 4개, 혼자 풀기 4개 확인, 끝', () => {
  const { parts, practice } = lessonPlan(script, 7);
  assert.equal(parts.filter((p) => p.check).length, 4);
  assert.ok(parts.at(-1).end);
  assert.equal(practice.length, 4);
  const waits = parts.flatMap((p) => p.scenes ?? []).filter((s) => s.kind === 'wait');
  assert.equal(waits.length, 5, '같이 풀기 4번 + 혼자 풀기 1번 기다린다');
  assert.deepEqual(lessonPlan(script, 7).parts, parts, '같은 시드는 같은 수업');
});

test('확인: 맞으면 끄덕이고, 틀리면 짐작을 말한 뒤 같이 다시 놓는다', () => {
  const p = problem(221, 4);
  const ok = checkScenes(script, p, 884, 1);
  assert.ok(ok.correct);
  assert.equal(ok.scenes[0].kind, 'nod');
  const bad = checkScenes(script, p, 8840, 1);
  assert.equal(bad.correct, false);
  assert.ok(bad.scenes[0].text.includes('영을 붙였나요'));
  assert.ok(bad.scenes.some((s) => s.kind === 'abacus-steps'));
  const product = checkScenes(script, problem(9, 58), 513, 1);
  assert.ok(product.scenes[0].text.startsWith('구 곱하기 팔을 다시 확인해 봐요'));
  assert.equal(askScenes(script, 2, 1)[0].text, '두 번째 문제 답은 뭐예요?');
});

test('수업 끝: 맞힌 수를 말하고 쓰러진다', () => {
  const scenes = endScenes(script, 3, 1);
  assert.ok(texts(scenes).includes('기초문제 네 개 중에 세 개를 맞혔어요.'));
  assert.equal(scenes.at(-1).kind, 'fall');
  assert.ok(!texts(endScenes(script, 0, 1)).some((t) => t.includes('개를 맞혔어요')));
});

test('모든 대사 틀에 요란한 칭찬과 금지된 말이 없다', () => {
  for (const [key, list] of Object.entries(script.lines)) {
    for (const t of list) assert.ok(!/최고|천재|대박|점수/.test(t), `${key}: ${t}`);
  }
});
