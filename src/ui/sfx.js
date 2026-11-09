// 짧은 효과음(직접 만든 소리, 파일 없음). 특정 게임의 효과음을 따라 하지 않는다.
//  tap: 버튼 "톡", correct: 맞았을 때 "띵동", badge: 배지 받을 때 짧은 가락, bead: 알 "딱"
//  성 지키기(2026-11-10): appear(몬스터 나타남), defeat(무찌름), nope(그 답의 몬스터 없음), wall(성벽 깎임),
//    levelup(레벨 업), gameover(끝), 그리고 몬스터 고유 동작 소리(boing, flap, puff, skitter, groan, rattle,
//    wail, stomp, clank, roar, erupt, summon, cackle)
let ac = null;
let muted = false;
let noiseBuf = null;

export function setSfxMuted(on) {
  muted = on;
}

/** 소리를 꺼 두었는지(배경음악도 이것을 따른다) */
export function isSfxMuted() {
  return muted;
}

function ctx() {
  ac ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

/** 소리 하나: 주파수를 to로 미끄러뜨릴 수 있고(glide), 떨림(vibrato)을 줄 수 있다 */
function tone(freq, start, dur, { type = 'square', gain = 0.12, to = null, vibrato = 0 } = {}) {
  const a = ctx();
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  if (vibrato) {
    const lfo = a.createOscillator();
    const lg = a.createGain();
    lfo.frequency.value = 7;
    lg.gain.value = vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.02);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** 바람·불·먼지 같은 잡음. 거르개(filter)로 높낮이를 정하고, from→to로 미끄러뜨릴 수 있다 */
function noise(start, dur, { gain = 0.12, type = 'bandpass', from = 1200, to = null, q = 1 } = {}) {
  const a = ctx();
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    // 잡음 자체는 소리 재료일 뿐이라 매번 같아도 된다(고정된 수열)
    let x = 12345;
    for (let i = 0; i < d.length; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (x / 0x7fffffff) * 2 - 1;
    }
  }
  const t = a.currentTime + start;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t, 0, dur + 0.05);
}

const SOUNDS = {
  tap: () => tone(880, 0, 0.06, { gain: 0.06 }),
  bead: () => tone(1500, 0, 0.03, { type: 'triangle', gain: 0.05 }),
  correct: () => {
    tone(784, 0, 0.12);
    tone(1175, 0.11, 0.22);
  },
  wall: () => {
    tone(140, 0, 0.18, { type: 'sawtooth', gain: 0.16 });
    tone(90, 0.08, 0.22, { type: 'square', gain: 0.12 });
    noise(0, 0.35, { type: 'lowpass', from: 900, to: 150, gain: 0.18 });
  },
  badge: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16)),

  // ---- 성 지키기 ----
  appear: () => noise(0, 0.32, { from: 300, to: 1400, gain: 0.05, q: 0.8 }),
  defeat: () => {
    noise(0, 0.18, { type: 'lowpass', from: 2400, to: 300, gain: 0.16 });
    tone(660, 0.02, 0.1, { type: 'triangle', gain: 0.1 });
    tone(990, 0.1, 0.18, { type: 'triangle', gain: 0.1 });
  },
  nope: () => tone(180, 0, 0.18, { type: 'square', gain: 0.06, to: 140 }),
  levelup: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.18, { gain: 0.1 }));
    tone(1319, 0.42, 0.45, { type: 'triangle', gain: 0.12, vibrato: 12 });
    tone(1047, 0.42, 0.45, { type: 'triangle', gain: 0.08 });
  },
  gameover: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.28, { type: 'triangle', gain: 0.1 })),

  // 몬스터 고유 동작
  boing: () => tone(220, 0, 0.35, { type: 'sine', gain: 0.12, to: 520 }),
  flap: () => {
    noise(0, 0.12, { from: 700, to: 300, gain: 0.08, q: 0.7 });
    noise(0.16, 0.12, { from: 700, to: 300, gain: 0.08, q: 0.7 });
  },
  puff: () => noise(0, 0.3, { type: 'lowpass', from: 1800, to: 400, gain: 0.08 }),
  skitter: () => [0, 0.05, 0.1, 0.15, 0.2].forEach((s) => noise(s, 0.03, { from: 3200, gain: 0.05, q: 4 })),
  groan: () => tone(110, 0, 0.7, { type: 'sawtooth', gain: 0.06, to: 85, vibrato: 6 }),
  rattle: () => [0, 0.06, 0.11, 0.18, 0.24, 0.3].forEach((s, i) => tone(i % 2 ? 1300 : 1700, s, 0.03, { type: 'square', gain: 0.04 })),
  wail: () => tone(420, 0, 0.9, { type: 'sine', gain: 0.07, to: 260, vibrato: 18 }),
  stomp: () => {
    tone(70, 0, 0.35, { type: 'sine', gain: 0.22, to: 40 });
    noise(0, 0.25, { type: 'lowpass', from: 400, to: 120, gain: 0.12 });
  },
  clank: () => {
    tone(820, 0, 0.12, { type: 'square', gain: 0.05 });
    tone(1240, 0.01, 0.2, { type: 'triangle', gain: 0.05 });
    tone(70, 0, 0.25, { type: 'sine', gain: 0.15, to: 45 });
  },
  roar: () => {
    tone(95, 0, 0.6, { type: 'sawtooth', gain: 0.08, to: 70, vibrato: 10 });
    noise(0.15, 0.6, { type: 'lowpass', from: 600, to: 2200, gain: 0.12 });
  },
  erupt: () => {
    tone(55, 0, 0.6, { type: 'sine', gain: 0.18, to: 40 });
    [0.05, 0.14, 0.22, 0.33, 0.41].forEach((s) => noise(s, 0.05, { from: 2500, gain: 0.06, q: 3 }));
  },
  summon: () => {
    [196, 233, 277].forEach((f) => tone(f, 0, 0.9, { type: 'sawtooth', gain: 0.035, to: f * 1.5 }));
    noise(0.1, 0.8, { from: 300, to: 1200, gain: 0.04, q: 2 });
  },
  cackle: () => [0, 0.11, 0.22, 0.33].forEach((s, i) => tone(i % 2 ? 900 : 1050, s, 0.08, { type: 'square', gain: 0.04, to: i % 2 ? 750 : 880 })),
};

export function sfx(name) {
  if (muted) return;
  try {
    SOUNDS[name]?.();
  } catch {
    // 소리를 낼 수 없는 브라우저
  }
}
