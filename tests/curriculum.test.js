// 지도의 세계와 섬(src/content/curriculum.json)
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const curriculum = JSON.parse(readFileSync(resolve(ROOT, 'src/content/curriculum.json'), 'utf8'));
const islands = curriculum.worlds.flatMap((w) => w.islands);

test('섬 id는 겹치지 않고, 이름과 배우는 것이 있다', () => {
  assert.equal(new Set(islands.map((i) => i.id)).size, islands.length);
  for (const i of islands) assert.ok(i.title && i.learn, i.id);
});

test('열린 섬에는 수업 대본이 있다', () => {
  const open = islands.filter((i) => i.open);
  assert.ok(open.length >= 1);
  for (const i of open) assert.ok(existsSync(resolve(ROOT, `src/content/lessons/${i.lesson}.json`)), i.id);
});

test('큰 흐름: 덧셈·뺄셈 → 곱셈 → 나눗셈 → 암산 → 소수, 곱셈 산은 구구 점검부터', () => {
  assert.deepEqual(curriculum.worlds.map((w) => w.id), ['add', 'mul', 'div', 'mental', 'decimal']);
  assert.equal(curriculum.worlds[1].islands[0].id, 'mul-0');
  const add = curriculum.worlds[0].islands.map((i) => i.id);
  assert.ok(add.indexOf('add-2') < add.indexOf('add-4'), '친구수가 5의 짝보다 먼저(아이 진도)');
});
