// 짧은 효과음(직접 만든 소리, 파일 없음). 특정 게임의 효과음을 따라 하지 않는다.
//  tap: 버튼 "톡", correct: 맞았을 때 "띵동", badge: 배지 받을 때 짧은 가락, bead: 알 "딱"
let ac = null;
let muted = false;

export function setSfxMuted(on) {
  muted = on;
}

function ctx() {
  ac ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, start, dur, { type = 'square', gain = 0.12 } = {}) {
  const a = ctx();
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfx(name) {
  if (muted) return;
  try {
    if (name === 'tap') tone(880, 0, 0.06, { gain: 0.06 });
    if (name === 'bead') tone(1500, 0, 0.03, { type: 'triangle', gain: 0.05 });
    if (name === 'correct') {
      tone(784, 0, 0.12);
      tone(1175, 0.11, 0.22);
    }
    if (name === 'wall') {
      tone(140, 0, 0.18, { type: 'sawtooth', gain: 0.16 });
      tone(90, 0.08, 0.22, { type: 'square', gain: 0.12 });
    }
    if (name === 'badge') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16));
  } catch {
    // 소리를 낼 수 없는 브라우저
  }
}
