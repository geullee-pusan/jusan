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
