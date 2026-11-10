// 말로 대답하기(docs/SPEC.md 7.2·7.4절). 브라우저 음성 인식을 한국어로 쓴다.
// 한 번 묻고 한 번 듣는다. 선생님이 말하는 동안에는 듣지 않는다(재생기가 말이 끝난 뒤에 부른다).
// 음성 인식이 없거나 안 되면 null을 돌려주고, 화면은 숫자판으로 받는다.

export function listenSupported() {
  return typeof (window.SpeechRecognition || window.webkitSpeechRecognition) === 'function';
}

let current = null;

/**
 * 한 번 듣는다.
 * @param {{onInterim?: (text: string) => void, timeoutMs?: number}} options
 * @returns {Promise<{texts: string[]} | {error: string}>} texts: 인식 후보들(앞일수록 그럴듯함)
 */
export function listenOnce({ onInterim, timeoutMs = 9000 } = {}) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return Promise.resolve({ error: 'unsupported' });
  stopListening();
  return new Promise((resolve) => {
    const rec = new Rec();
    current = rec;
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 5;
    let done = false;
    let lastTexts = [];
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(limit);
      if (current === rec) current = null;
      try {
        rec.abort();
      } catch {
        // 이미 멈췄다
      }
      resolve(result);
    };
    const limit = setTimeout(() => finish(lastTexts.length ? { texts: lastTexts } : { error: 'timeout' }), timeoutMs);
    rec.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const texts = [...result].map((alt) => alt.transcript);
      lastTexts = texts;
      onInterim?.(texts[0] ?? '');
      if (result.isFinal) finish({ texts });
    };
    rec.onerror = (event) => finish({ error: event.error || 'error' });
    rec.onend = () => finish(lastTexts.length ? { texts: lastTexts } : { error: 'no-speech' });
    try {
      rec.start();
    } catch {
      finish({ error: 'start-failed' });
    }
  });
}

export function stopListening() {
  if (!current) return;
  try {
    current.abort();
  } catch {
    // 이미 멈췄다
  }
  current = null;
}

/**
 * 길게 듣는다(성 지키기처럼 내내 들을 때). 마이크를 한 번 켜 두고 숫자를 여러 번 듣는다.
 * 짧게 끊어 다시 켜면 안드로이드가 그때마다 배경음악을 줄이거나 멈춰서 음악이 끊긴다(2026-11-10 태블릿에서 확인).
 * 브라우저가 스스로 끝내거나 maxMs가 지나거나 stopListening()을 부르면 끝난다.
 * @param {{onInterim?: (text: string) => void, onFinal?: (texts: string[]) => void, maxMs?: number}} options
 * @returns {Promise<{ended: true} | {error: string}>}
 */
export function listenStream({ onInterim, onFinal, maxMs = 60000 } = {}) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return Promise.resolve({ error: 'unsupported' });
  stopListening();
  return new Promise((resolve) => {
    const rec = new Rec();
    current = rec;
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 5;
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(limit);
      if (current === rec) current = null;
      try {
        rec.abort();
      } catch {
        // 이미 멈췄다
      }
      resolve(result);
    };
    const limit = setTimeout(() => finish({ ended: true }), maxMs);
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const texts = [...result].map((alt) => alt.transcript);
        if (result.isFinal) onFinal?.(texts);
        else onInterim?.(texts[0] ?? '');
      }
    };
    rec.onerror = (event) => {
      const error = event.error || 'error';
      // 조용해서 생기는 no-speech는 끝난 것으로 본다(다시 켠다)
      finish(error === 'no-speech' || error === 'aborted' ? { ended: true } : { error });
    };
    rec.onend = () => finish({ ended: true });
    try {
      rec.start();
    } catch {
      finish({ error: 'start-failed' });
    }
  });
}
