// 기술 지도(실시간 레벨 체크)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newlyDone, recommend, RULE, skillMap, skillsOfResult, SKILLS, stateOf } from '../src/core/skills.js';

const r = (features, firstTry, extra = {}) => ({ features, firstTry, correct: firstTry, ...extra });
const round = (lesson, results) => ({ lesson, finished: true, results });
const get = (map, id) => map.find((s) => s.id === id);

test('기술 id는 겹치지 않고, 기록이 없으면 모두 "아직"이다', () => {
  assert.equal(new Set(SKILLS.map((s) => s.id)).size, SKILLS.length);
  assert.ok(skillMap([]).every((s) => s.state === 'notyet' && s.tries === 0));
});

test('상태: 3번 미만은 아직, 절반 넘게 맞히면 거의, 6번 넘게 풀고 8번 중 7번 맞히면 됨', () => {
  assert.equal(stateOf(2, 2), 'notyet');
  assert.equal(stateOf(2, 3), 'almost');
  assert.equal(stateOf(1, 3), 'notyet');
  assert.equal(stateOf(6, 6), 'done');
  assert.equal(stateOf(5, 6), 'almost');
  assert.equal(stateOf(7, 8), 'done');
  assert.equal(stateOf(6, 8), 'almost');
  assert.equal(RULE.recent, 8);
});

test('문제 결과가 들어가는 기술', () => {
  assert.deepEqual(skillsOfResult('add-2', r({ techniques: ['A1', 'A4'] }, true)).sort(), ['direct', 'friend-add']);
  assert.deepEqual(skillsOfResult('mul-0', { a: 7, firstTry: true }), ['tt-7']);
  assert.deepEqual(skillsOfResult('mul-1digit', r({ padded: true, carry: false, zeroProduct: false }, true)).sort(), ['mul-place', 'zero-pad']);
  assert.deepEqual(skillsOfResult('mental-2', r({ techniques: ['A4'] }, true)), ['mind-listen'], '암산 섬은 암산 칸에만');
  assert.ok(skillsOfResult('add-6', r({ techniques: ['A1'] }, true)).includes('many-rows'));
});

test('실시간: 한 번에 맞힌 만큼 올라가고, 틀리면 떨어진다', () => {
  const ok = r({ techniques: ['A4'] }, true);
  const bad = r({ techniques: ['A4'] }, false);
  assert.equal(get(skillMap([round('add-2', [ok, ok])]), 'friend-add').state, 'notyet');
  assert.equal(get(skillMap([round('add-2', [ok, ok, ok])]), 'friend-add').state, 'almost');
  assert.equal(get(skillMap([round('add-2', new Array(7).fill(ok))]), 'friend-add').state, 'done');
  const slipped = [round('add-2', new Array(6).fill(ok)), round('add-2', [bad, bad, bad])];
  assert.equal(get(skillMap(slipped), 'friend-add').state, 'almost', '최근 8번 중 5번이면 다시 거의');
});

test('틀린 이유를 짐작했으면 그 기술만 틀림으로 넣는다', () => {
  const miss = r({ padded: true, carry: true, zeroProduct: false }, false, { miss: 'no-pad' });
  const map = skillMap([round('mul-1digit', [miss])]);
  assert.equal(get(map, 'zero-pad').tries, 1);
  assert.equal(get(map, 'zero-pad').hits, 0);
  assert.equal(get(map, 'mul-carry').tries, 0, '받아올림 탓은 아니니 셈하지 않는다');
});

test('이번 판으로 "됨"이 된 기술', () => {
  const ok = r({ techniques: ['A3'] }, true);
  const before = [round('add-4', new Array(5).fill(ok))];
  const after = [...before, round('add-4', [ok, ok])];
  assert.deepEqual(newlyDone(before, after).map((s) => s.id), ['five-add']);
  assert.deepEqual(newlyDone(after, after), []);
});

test('선생님 추천: 거의 → 해 본 아직 → 안 해 본 섬', () => {
  const open = ['add-1', 'add-2', 'add-3', 'add-4', 'mul-0', 'mul-1digit'];
  assert.deepEqual(recommend([], open), { island: 'add-1', skill: null, why: 'new' });
  const almost = [round('add-3', [r({ techniques: ['B4'] }, true), r({ techniques: ['B4'] }, true), r({ techniques: ['B4'] }, false)])];
  const rec = recommend(almost, open);
  assert.equal(rec.island, 'add-3');
  assert.equal(rec.why, 'almost');
});

import { overallLevel, TITLES } from '../src/core/skills.js';

test('전체 레벨: 됨 3점, 거의 1점, 3점마다 레벨 하나, 칭호는 레벨 3마다', () => {
  assert.deepEqual(overallLevel(skillMap([])), { level: 1, points: 0, toNext: 3, title: TITLES[0], nextTitle: TITLES[1] });
  const ok = r({ techniques: ['A4'] }, true);
  const lv = overallLevel(skillMap([round('add-2', new Array(7).fill(ok))])); // 친구수 덧셈 됨 → 3점
  assert.equal(lv.level, 2);
  const many = SKILLS.map((s) => ({ ...s, state: 'done' }));
  const top = overallLevel(many);
  assert.equal(top.points, SKILLS.length * 3);
  assert.equal(top.title, TITLES[Math.min(TITLES.length - 1, Math.floor((top.level - 1) / 3))]);
});
