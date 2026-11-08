// 수업 끝 소리(docs/SPEC.md 7.5절). 선생님이 쓰러질 때 한 번 난다.
// 소리는 아이가 직접 녹음한 것이다(src/content/end-sound.m4a, 휴대폰 녹음기, 약 2.5초).
// 빌드할 때 index.html 안에 들어가므로 따로 받지 않는다.
// 녹음을 재생하지 못하는 브라우저에서는 Web Audio로 만든 짧은 "웁" 소리를 낸다.
import recordedUrl from '../content/end-sound.m4a';

let context = null;
let audio = null;

export function playEndSound() {
  try {
    audio ??= new Audio(recordedUrl);
    audio.currentTime = 0;
    const played = audio.play();
    if (played?.catch) played.catch(() => synthesized());
  } catch {
    synthesized();
  }
}

/** 대신 내는 소리: 짧게 떨어지는 "웁" */
function synthesized() {
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    const ac = context;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.28);
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(filter).connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // 소리를 낼 수 없는 브라우저: 소리 없이 쓰러지기만 한다.
  }
}
