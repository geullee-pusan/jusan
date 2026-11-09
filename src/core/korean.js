// 한국어 말 다듬기: 조사 고르기, 자리 이름. 순수 함수다.

/** 마지막 글자에 받침이 있는가(한글이 아니면 숫자 읽기로 본다) */
export function hasBatchim(word) {
  const last = [...word.trim()].at(-1);
  if (!last) return false;
  const code = last.codePointAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  // 숫자로 끝나면 숫자 읽기의 받침: 0(영) 1(일) 3(삼) 6(육) 7(칠) 8(팔)은 받침, 2 4 5 9는 없음
  if (/[0-9]/.test(last)) return '013678'.includes(last);
  return false;
}

/** 받침에 맞춰 조사를 붙인다. josa('오', '은', '는') → '오는' */
export function josa(word, withBatchim, without) {
  return word + (hasBatchim(word) ? withBatchim : without);
}

/** "이에요/예요" */
export function ieyo(word) {
  return word + (hasBatchim(word) ? '이에요' : '예요');
}

const PLACE_NAMES = ['일', '십', '백', '천', '만', '십만', '백만', '천만', '억'];

/** 자리 번호(0 = 일의 자리)의 이름 */
export function placeName(place) {
  const name = PLACE_NAMES[place];
  if (!name) throw new Error(`자리 이름이 없어요: ${place}`);
  return name;
}

const NATIVE_ONES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const NATIVE_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];

/** 개수 세기 말(관형): 1 → "한", 20 → "스무", 21 → "스물한", 0 → "영" */
export function nativeCount(n) {
  if (!Number.isInteger(n) || n < 0 || n > 99) throw new Error(`1~99만 세요: ${n}`);
  if (n === 0) return '영';
  if (n === 20) return '스무';
  return NATIVE_TENS[Math.floor(n / 10)] + NATIVE_ONES[n % 10];
}
