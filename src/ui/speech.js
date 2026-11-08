// 선생님 목소리(docs/SPEC.md 7.4절). 기기의 음성 합성을 쓴다. 밖으로 나가는 요청이 없다.
// 아이가 원한 것: 1~5글자마다 목소리가 바뀐다. 조각 나누기는 src/core/voicechunks.js가 한다.
// 조각마다 높낮이·빠르기(teacher.json의 voices)를 바꾸고, 기기에 한국어 목소리가 여럿이면 목소리도 돌려 쓴다.
// 목소리 고르기와 Chrome 버그 피하기는 지하철 게임(src/ui/ride-sound.js)에서 가져왔다.

/** 이 브라우저가 글을 소리로 읽을 수 있는가. 삼성 인터넷, 카카오톡·네이버 앱 안의 브라우저에는 없다. */
export function speechSupported() {
  return typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/** 기기의 한국어 목소리들. 기기 안 목소리를 앞에 둔다. */
function koreanVoices() {
  try {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const ko = voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('ko'));
    return [...ko.filter((v) => v.localService || isAndroid()), ...ko.filter((v) => !(v.localService || isAndroid()))];
  } catch {
    return [];
  }
}

/**
 * 목소리 목록이 다 올라올 때까지 기다린다. 브라우저는 처음에 빈 목록을 주고 나중에 voiceschanged로 알려 준다.
 * 목록이 비어 있지 않거나, 알려 주거나, 3초가 지나면 끝난다.
 */
export function voicesReady() {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    try {
      if (synth.getVoices().length > 0) return resolve();
      const done = () => {
        clearTimeout(limit);
        synth.removeEventListener?.('voiceschanged', done);
        resolve();
      };
      const limit = setTimeout(done, 3000);
      synth.addEventListener?.('voiceschanged', done);
    } catch {
      resolve();
    }
  });
}

/** 읽는 중인 말 조각을 붙잡아 둔다. Chrome은 붙잡지 않은 말 조각을 중간에 버려 소리가 안 날 때가 있다. */
const held = new Set();
let muted = false;
let turn = 0;

export function setMuted(on) {
  muted = on;
  if (on) stopSpeaking();
}

export function stopSpeaking() {
  turn++;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // 멈추지 못해도 다음 말은 차례 번호로 막힌다.
  }
}

/**
 * 조각들을 차례로 읽는다. 다 읽으면(또는 소리가 안 나는 기기에서 그만큼 시간이 지나면) 끝난다.
 * @param {{text: string, voice: number}[]} chunks voicechunks.js가 나눈 조각
 * @param {{pitch: number, rate: number}[]} styles 목소리 번호별 높낮이·빠르기
 * @param {{onStart?: () => void}} hooks onStart: 소리가 실제로 나기 시작할 때
 * @returns {Promise<void>}
 */
export function speakChunks(chunks, styles, { onStart } = {}) {
  const text = chunks.map((c) => c.text).join('');
  // 소리가 안 나도 수업이 이어지게, 글자 수로 말하는 시간을 어림한다(한 글자 0.22초).
  const guessMs = 600 + [...text].length * 220;
  if (muted || !speechSupported() || chunks.length === 0) {
    onStart?.();
    return wait(guessMs);
  }
  const synth = window.speechSynthesis;
  const voices = koreanVoices();
  const my = ++turn;
  return new Promise((resolve) => {
    let finished = false;
    let started = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(limit);
      resolve();
    };
    // 기기가 다 읽었다고 전하지 않을 때를 대비해 넉넉히 기다린 뒤 끝낸다.
    const limit = setTimeout(finish, guessMs * 2 + 2000);
    const go = () => {
      if (my !== turn) return finish();
      try {
        synth.resume();
      } catch {
        // resume이 없는 브라우저
      }
      chunks.forEach((chunk, i) => {
        const style = styles[chunk.voice % styles.length];
        const say = new SpeechSynthesisUtterance(chunk.text);
        say.lang = 'ko-KR';
        if (voices.length > 1) say.voice = voices[chunk.voice % voices.length];
        else if (voices.length === 1 && !isAndroid()) say.voice = voices[0];
        say.pitch = style.pitch;
        say.rate = style.rate;
        held.add(say);
        say.addEventListener('start', () => {
          if (!started) {
            started = true;
            onStart?.();
          }
        });
        const release = () => {
          held.delete(say);
          if (i === chunks.length - 1) finish();
        };
        say.addEventListener('end', release);
        say.addEventListener('error', release);
        synth.speak(say);
      });
    };
    const busy = synth.speaking || synth.pending;
    if (busy) {
      synth.cancel();
      setTimeout(go, 250);
    } else go();
  });
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
