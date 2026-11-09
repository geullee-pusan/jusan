// 기기 안에 기록을 둔다(docs/SPEC.md 11장). localStorage는 이 파일에서만, 늘 try/catch로 쓴다.
// 저장된 값이 없거나 깨져 있어도 앱은 빈 기록으로 정상으로 뜬다. 아무 데도 보내지 않는다.
//
// 기록(원본): rounds — 판마다 { lesson, date, finished, seconds, results: [{ key, features, firstTry, correct }], bonus }
// 배지와 꾸미기는 이 기록에서 다시 계산한다(src/core/badges.js).
// 설정: outfit(입힌 꾸미기 id 목록), teacherName

const KEY = 'jusan:v1';
const EMPTY = { rounds: [], outfit: [], teacherName: '큐브 선생님', flashMs: null };

export function loadData() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const data = JSON.parse(raw);
    return {
      rounds: Array.isArray(data.rounds) ? data.rounds : [],
      outfit: Array.isArray(data.outfit) ? data.outfit : [],
      teacherName: typeof data.teacherName === 'string' && data.teacherName ? data.teacherName : EMPTY.teacherName,
      flashMs: Number.isFinite(data.flashMs) ? data.flashMs : null,
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveData(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // 저장할 수 없는 브라우저(비공개 창 등): 이번에만 기억한다
  }
}
