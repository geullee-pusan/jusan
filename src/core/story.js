// 성 지키기 이야기 "이로와 빛의 주판알"(docs/story.md, 2026-11-10). 순수 함수다.
// 어떤 장면을 언제 보여 줄지만 정한다. 보여 주는 일은 UI(src/ui/story-view.js)가 한다.
//  - 프롤로그: Lv.1부터 시작한 판에서, 아직 본 적이 없을 때
//  - 사이 장면 1~4: 판 중에 레벨이 올라 땅(배경 단계)이 바뀔 때, 그 땅의 장면을 아직 본 적이 없을 때
//  - 엔딩: 마지막 레벨(Lv.17)을 깼을 때(Lv.18이 될 때), 아직 본 적이 없을 때
// 장면은 기술 지도와 레벨에 아무 영향이 없다. 장면이 나오는 동안 게임 시간은 멈춘다(UI).
import { LEVELS, stageOf } from './defense.js';

/** 이야기 순서 */
export const SCENES = ['prologue', 'interlude-1', 'interlude-2', 'interlude-3', 'interlude-4', 'ending'];

/** 마지막 레벨. 이 레벨을 깨면(다음 레벨이 되면) 엔딩이다 */
export const FINAL_LEVEL = LEVELS.length;

/**
 * 판을 시작할 때 보여 줄 장면
 * @param {number} startLevel
 * @param {string[]} seen 본 장면 id
 * @returns {string|null}
 */
export function sceneOnStart(startLevel, seen = []) {
  return startLevel === 1 && !seen.includes('prologue') ? 'prologue' : null;
}

/**
 * 레벨이 올랐을 때 보여 줄 장면(땅이 바뀌었거나 마지막 레벨을 깼을 때)
 * @param {number} from 오르기 전 레벨
 * @param {number} to 오른 레벨
 * @param {string[]} seen
 * @returns {string|null}
 */
export function sceneOnLevelUp(from, to, seen = []) {
  if (from <= FINAL_LEVEL && to > FINAL_LEVEL) return seen.includes('ending') ? null : 'ending';
  const before = stageOf(from);
  const after = stageOf(to);
  if (after <= before) return null;
  const id = `interlude-${after - 1}`;
  return SCENES.includes(id) && !seen.includes(id) ? id : null;
}

/** 다시 볼 수 있는 장면: 프롤로그는 늘, 나머지는 본 적이 있는 것만(이야기 순서대로) */
export function replayable(seen = []) {
  return SCENES.filter((id) => id === 'prologue' || seen.includes(id));
}

/** 대사의 빈칸을 채운다: "{defeated}마리" → "23마리" */
export function fillLine(text, values = {}) {
  return text.replace(/\{(\w+)\}/g, (all, key) => (key in values ? String(values[key]) : all));
}

/** 장면에서 되찾은 주판알 수(●○ 표시용) */
export function beadsAt(id) {
  if (id === 'prologue') return 0;
  if (id === 'ending') return 5;
  return Number(id.split('-')[1]);
}
