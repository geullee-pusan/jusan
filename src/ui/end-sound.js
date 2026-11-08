// 수업 끝 소리(docs/SPEC.md 7.5절). 선생님이 쓰러지기 시작하는 순간에 한 번 난다.
// 소리는 아이가 직접 녹음한 것이다(src/content/end-sound.m4a, 휴대폰 녹음기, 약 2.5초).
// 빌드할 때 index.html 안에 들어가므로 따로 받지 않는다.
//
// 싱크: 녹음 앞부분에는 무음이 있다(처음 녹음은 0.66초). 앱이 처음 뜰 때 녹음을 풀어서
// 소리가 시작되는 곳을 찾아 두고, 재생할 때 그 바로 앞부터 튼다. 다시 녹음해도 저절로 맞는다.
// 녹음을 재생하지 못하는 브라우저에서는 Web Audio로 만든 짧은 "웁" 소리를 낸다.
import recordedDataUrl from '../content/end-sound.m4a?inline';

/** 소리 시작보다 조금 앞에서 튼다(말 첫소리가 잘리지 않게) */
const LEAD_SECONDS = 0.02;

let context = null;
let decoded = null; // { buffer, start }

/** 앱이 뜰 때 한 번 부른다. 녹음을 풀고 소리가 시작되는 곳을 찾아 둔다. */
export async function prepareEndSound() {
  try {
    const base64 = recordedDataUrl.slice(recordedDataUrl.indexOf(',') + 1);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    // 사용자가 누르기 전에도 풀 수 있도록 오프라인 컨텍스트로 푼다.
    const offline = new OfflineAudioContext(1, 1, 44100);
    const buffer = await offline.decodeAudioData(bytes.buffer);
    decoded = { buffer, start: Math.max(0, soundStart(buffer) - LEAD_SECONDS) };
  } catch {
    decoded = null; // 풀지 못하면 대신 내는 소리를 쓴다
  }
}

/** 가장 큰 소리의 10%를 처음 넘는 곳(초) */
export function soundStart(buffer) {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const threshold = peak * 0.1;
  let i = 0;
  while (i < data.length && Math.abs(data[i]) < threshold) i++;
  return i / buffer.sampleRate;
}

export function playEndSound() {
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    if (!decoded) return synthesized();
    const source = context.createBufferSource();
    source.buffer = decoded.buffer;
    source.connect(context.destination);
    source.start(0, decoded.start);
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
