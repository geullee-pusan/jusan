// 말로 들은 답을 숫자로 바꾼다(docs/SPEC.md 7.3절). 순수 함수다.
// "삼백이십오", "325", "삼백 이십 오", "삼천 이십사", "3,024", "답은 팔백팔십사요"를 모두 숫자로 바꾼다.
// 소수도 읽는다(자리점 성 "소수" 섬): "3.5", "삼 점 오", "십이 점 사칠", "영 점 영육", "점 오"(= 0.5).

const SINO = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9 };
const SMALL = { 십: 10, 백: 100, 천: 1000 };
const BIG = { 만: 10000, 억: 100000000 };
const NATIVE_TENS = { 열: 10, 스물: 20, 스무: 20, 서른: 30, 마흔: 40, 쉰: 50, 예순: 60, 일흔: 70, 여든: 80, 아흔: 90 };
const NATIVE_ONES = { 하나: 1, 한: 1, 둘: 2, 두: 2, 셋: 3, 세: 3, 넷: 4, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9 };

/** 앞뒤 말(답은, ~이요, ~예요)을 떼어 낸다 */
function strip(text) {
  return text
    .replace(/[\s,.!?~]/g, '')
    .replace(/^(답은|정답은|답|음+|어+)/, '')
    .replace(/(입니다|이에요|예요|이요|요|이다|다|개)$/, '');
}

/** 한자어 수(+ 숫자 섞임). 못 읽으면 null */
function parseSino(s) {
  let total = 0;
  let section = 0; // 만 아래 부분
  let digit = null; // 단위 앞의 숫자
  let i = 0;
  let any = false;
  while (i < s.length) {
    const ch = s[i];
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      digit = Number(s.slice(i, j));
      i = j;
      any = true;
      continue;
    }
    if (ch in SINO) {
      if (digit !== null) section += digit; // "삼백이" 다음에 또 숫자가 오면 앞 숫자는 일의 자리
      digit = SINO[ch];
      any = true;
    } else if (ch in SMALL) {
      section += (digit ?? 1) * SMALL[ch];
      digit = null;
      any = true;
    } else if (ch in BIG) {
      section += digit ?? 0;
      total += (section || 1) * BIG[ch];
      section = 0;
      digit = null;
      any = true;
    } else return null;
    i++;
  }
  if (!any) return null;
  return total + section + (digit ?? 0);
}

/** 고유어 수(1~99) */
function parseNative(s) {
  for (const [word, tens] of Object.entries(NATIVE_TENS)) {
    if (s.startsWith(word)) {
      const rest = s.slice(word.length);
      if (!rest) return tens;
      return rest in NATIVE_ONES ? tens + NATIVE_ONES[rest] : null;
    }
  }
  return s in NATIVE_ONES ? NATIVE_ONES[s] : null;
}

/** 소수점 뒤: 숫자를 하나씩("사칠" → "47", "47" → "47") */
function parseFraction(f) {
  if (/^[0-9]+$/.test(f)) return f;
  let out = '';
  for (const ch of f) {
    if (!(ch in SINO)) return null;
    out += SINO[ch];
  }
  return out || null;
}

/**
 * 들은 글자를 숫자로. 못 알아들으면 null.
 * @param {string} text
 */
export function parseSpokenNumber(text) {
  if (typeof text !== 'string') return null;
  // 숫자 사이의 점은 소수점이다("3.5"). 끝에 붙은 마침표("884.")는 소수점이 아니다
  const dot = text.replace(/[\s,]/g, '').match(/(\d+)\.(\d+)/);
  if (dot) return Number(`${dot[1]}.${dot[2]}`);
  const s = strip(text);
  if (!s) return null;
  const parts = s.split(/점|쩜/);
  if (parts.length === 2) {
    const head = parts[0] === '' ? 0 : parseSpokenNumber(parts[0]);
    const tail = parseFraction(parts[1]);
    if (head === null || !Number.isInteger(head) || tail === null) return null;
    return Number(`${head}.${tail}`);
  }
  if (parts.length > 2) return null;
  if (/^[0-9]+$/.test(s)) return Number(s);
  return parseSino(s) ?? parseNative(s);
}

/** 인식기가 준 후보 여러 개 중 숫자로 바뀌는 첫 후보 */
export function pickSpokenNumber(candidates) {
  for (const c of candidates) {
    const n = parseSpokenNumber(c);
    if (n !== null) return n;
  }
  return null;
}

/** "네", "아니요" 같은 짧은 대답과 명령 */
export function parseSpokenCommand(text) {
  const s = strip(text ?? '');
  // 네·아니요(2026-11-10 넓힘): 안드로이드는 "네"를 "내"로 자주 알아듣고, 아이는 "할래", "싫어"처럼도 답한다
  if (/^(아니|아뇨|틀려|싫어|싫|안할래|안해|안풀래|안볼래|됐어|괜찮아|노)/.test(s)) return 'no';
  if (/^(네|내|넵|넹|예|응|웅|맞아|맞아요|맞습니다|그래|좋아|할래|할게|풀래|풀게|해볼래|해볼게|볼래|오케이|ok|okay|yes)/i.test(s)) return 'yes';
  if (/(다했|다놨|다풀|끝났|했어)/.test(s)) return 'done';
  if (/(다시|한번더)/.test(s)) return 'again';
  if (/(천천히)/.test(s)) return 'slower';
  if (/(그만)/.test(s)) return 'stop';
  return null;
}
