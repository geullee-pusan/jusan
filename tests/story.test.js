// 성 지키기 이야기: 어떤 장면을 언제 보여 주나
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS } from '../src/core/defense.js';
import { beadsAt, FINAL_LEVEL, fillLine, replayable, sceneOnLevelUp, sceneOnStart, SCENES } from '../src/core/story.js';

test('프롤로그는 Lv.1부터 시작한 판에서 처음 한 번만', () => {
  assert.equal(sceneOnStart(1, []), 'prologue');
  assert.equal(sceneOnStart(1, ['prologue']), null);
  assert.equal(sceneOnStart(4, []), null, '높은 레벨부터 시작하면 건너뛴다');
});

test('땅이 바뀌는 레벨에 처음 오르면 사이 장면', () => {
  assert.equal(sceneOnLevelUp(3, 4, []), 'interlude-1');
  assert.equal(sceneOnLevelUp(6, 7, []), 'interlude-2');
  assert.equal(sceneOnLevelUp(9, 10, []), 'interlude-3');
  assert.equal(sceneOnLevelUp(12, 13, []), 'interlude-4');
  assert.equal(sceneOnLevelUp(4, 5, []), null, '같은 땅 안에서는 없다');
  assert.equal(sceneOnLevelUp(3, 4, ['interlude-1']), null, '본 장면은 다시 나오지 않는다');
});

test('마지막 레벨을 깨면 엔딩, 그 뒤로는 나오지 않는다', () => {
  assert.equal(FINAL_LEVEL, LEVELS.length);
  assert.equal(sceneOnLevelUp(FINAL_LEVEL, FINAL_LEVEL + 1, []), 'ending');
  assert.equal(sceneOnLevelUp(FINAL_LEVEL, FINAL_LEVEL + 1, ['ending']), null);
  assert.equal(sceneOnLevelUp(FINAL_LEVEL + 1, FINAL_LEVEL + 2, []), null);
});

test('다시 보기: 프롤로그는 늘, 나머지는 본 것만 이야기 순서대로', () => {
  assert.deepEqual(replayable([]), ['prologue']);
  assert.deepEqual(replayable(['interlude-2', 'interlude-1']), ['prologue', 'interlude-1', 'interlude-2']);
  assert.deepEqual(replayable(SCENES), SCENES);
});

test('대사 빈칸 채우기와 주판알 수', () => {
  assert.equal(fillLine('몬스터 {defeated}마리', { defeated: 23 }), '몬스터 23마리');
  assert.equal(fillLine('{없는것} 그대로', {}), '{없는것} 그대로');
  assert.deepEqual(SCENES.map(beadsAt), [0, 1, 2, 3, 4, 5]);
});
