// 선생님 목소리 조각 나누기(docs/SPEC.md 7.4절).
// 아이가 원한 것: 선생님 목소리가 1~5글자마다(그때그때 무작위로 정한 길이) 계속 바뀐다.
// 무작위는 시드 난수로 정한다. 같은 말을 같은 시드로 나누면 언제나 같게 나뉜다.
import { createRng, randInt } from './rng.js';

/**
 * 말을 1~5글자 조각으로 나누고, 조각마다 목소리 번호를 붙인다.
 *  - 글자 수에는 띄어쓰기와 문장부호를 세지 않는다. 띄어쓰기와 부호는 앞 조각에 붙는다.
 *  - 바로 앞 조각과 같은 목소리는 고르지 않는다(바뀌는 게 들리도록).
 * @param {string} text 읽을 말
 * @param {number} seed 시드
 * @param {{voices: number, min?: number, max?: number}} options voices: 목소리 가짓수(2 이상)
 * @returns {{text: string, voice: number}[]} 조각들. 이어 붙이면 text와 같다.
 */
export function splitVoiceChunks(text, seed, { voices, min = 1, max = 5 }) {
  if (voices < 2) throw new Error('목소리는 2가지 이상이어야 바꿀 수 있어요');
  const rng = createRng(seed);
  const chars = [...text];
  const chunks = [];
  let i = 0;
  let last = -1;
  while (i < chars.length) {
    const want = randInt(rng, min, max);
    let taken = 0;
    let piece = '';
    // 앞에 붙은 띄어쓰기·부호는 이 조각에 넣는다(첫 조각이 빈칸으로 시작할 때).
    while (i < chars.length && taken < want) {
      const ch = chars[i++];
      piece += ch;
      if (isLetter(ch)) taken++;
    }
    // 뒤따르는 띄어쓰기·부호는 이 조각에 붙인다.
    while (i < chars.length && !isLetter(chars[i])) piece += chars[i++];
    let voice;
    if (last < 0) voice = randInt(rng, 0, voices - 1);
    else {
      voice = randInt(rng, 0, voices - 2); // 앞 목소리를 뺀 나머지 중에서 고른다
      if (voice >= last) voice++;
    }
    last = voice;
    chunks.push({ text: piece, voice });
  }
  return chunks;
}

/** 소리 나는 글자인가(한글, 영문, 숫자) */
function isLetter(ch) {
  return /[\p{L}\p{N}]/u.test(ch);
}

/** 조각의 소리 나는 글자 수 */
export function letterCount(text) {
  return [...text].filter(isLetter).length;
}
