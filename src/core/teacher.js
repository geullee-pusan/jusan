// 선생님이 할 말과 동작을 정한다(docs/SPEC.md 7.3절). 순수 함수다.
// 화면(src/ui)은 여기서 받은 장면 목록을 차례로 보여 주고 읽기만 한다.
//
// 장면 종류
//  - say:     대사 한 줄. { kind, id, text, pose, seed }
//  - number:  칠판에 한 줄 쓰며 숫자를 부른다. { kind, row, value, sign, pieces, text, pose, seed }
//  - clear:   칠판을 지운다.
//  - listen:  아이의 대답을 기다린다. 선생님은 귀를 기울인다.
//  - wait:    아이가 "다 했어요"를 할 때까지 기다린다.
//  - nod:     고개를 끄덕인다.
//  - fall:    수업 끝. 뒤로 쓰러지며 끝 소리가 난다.
import { createRng, seedFrom } from './rng.js';
import { numberPieces, readNumber } from './numread.js';

/**
 * 상황에 맞는 대사 하나를 시드로 고른다.
 * @param {object} script teacher.json
 * @param {string} situation lines의 열쇠
 */
export function pickLine(script, situation, seed) {
  const list = script.lines[situation];
  if (!list || list.length === 0) throw new Error(`대사가 없어요: ${situation}`);
  const rng = createRng(seedFrom(situation, seed));
  return list[Math.floor(rng() * list.length)];
}

function say(script, situation, seed, pose = 'talk') {
  const line = pickLine(script, situation, seed);
  return { kind: 'say', id: line.id, text: line.text, pose, seed: seedFrom('say', line.id, seed) };
}

/** 수업 시작: 인사와 준비 */
export function greetScenes(script, seed) {
  return [say(script, 'greet', seed), say(script, 'ready', seed)];
}

/**
 * 문제를 불러 준다(듣고 풀기). 칠판에 한 줄씩 쓰며 부른다.
 * @param {number[]} rows 더하고 뺄 수. 빼는 줄은 음수. 첫 줄은 0 이상.
 * @param {{show?: boolean}} options show가 false면 칠판에 숫자를 쓰지 않는다(듣고만 푼다).
 */
export function problemScenes(script, rows, seed, { show = true } = {}) {
  if (rows.length === 0) throw new Error('문제 줄이 없어요');
  if (rows[0] < 0) throw new Error('첫 줄은 빼기일 수 없어요');
  const scenes = [{ kind: 'clear' }, say(script, 'listen-first', seed)];
  rows.forEach((value, row) => {
    const sign = row === 0 ? '' : value < 0 ? '-' : '+';
    const word = sign === '-' ? script.words.minus : sign === '+' ? script.words.plus : '';
    const abs = Math.abs(value);
    const pieces = [...(word ? [word] : []), ...numberPieces(abs)];
    const text = [word, readNumber(abs)].filter(Boolean).join(' ');
    scenes.push({ kind: 'number', row, value: abs, sign, pieces, text, show, pose: 'point', seed: seedFrom('number', seed, row) });
  });
  scenes.push({ kind: 'number', row: rows.length, value: null, sign: '', pieces: [script.words.ask], text: script.words.ask, show: false, pose: 'point', seed: seedFrom('ask', seed) });
  scenes.push({ kind: 'wait' });
  scenes.push(say(script, 'answer', seed));
  scenes.push({ kind: 'listen' });
  return scenes;
}

/** 답을 들은 뒤 */
export function answerScenes(script, correct, seed) {
  if (correct) return [{ kind: 'nod' }, say(script, 'correct', seed)];
  return [say(script, 'wrong', seed)];
}

/** 수업 끝: 맞힌 문제 수를 말하고, 인사하고, 쓰러진다. */
export function endScenes(script, correctCount, seed) {
  return [
    say(script, 'summary-pre', seed),
    {
      kind: 'number', row: null, value: correctCount, sign: '', pieces: numberPieces(correctCount),
      text: readNumber(correctCount), show: false, pose: 'talk', seed: seedFrom('summary', seed),
    },
    say(script, 'summary-post', seed),
    say(script, 'bye', seed),
    { kind: 'fall' },
  ];
}

/** 정답 */
export function sumRows(rows) {
  return rows.reduce((a, b) => a + b, 0);
}
