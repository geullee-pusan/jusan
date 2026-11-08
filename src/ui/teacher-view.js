// 큐브 선생님을 그리고 움직인다(docs/SPEC.md 7.5절). CSS 3D로 상자를 쌓는다. 라이브러리를 쓰지 않는다.
// 동작: 말하기(입), 가리키기, 기다리기(숨쉬기·깜빡임), 듣기, 끄덕이기, 시연, 쓰러지기.

/**
 * @param {HTMLElement} root 선생님을 넣을 자리
 * @param {object} look teacher-look.json
 * @param {{unit?: number}} options unit: 블록 한 칸의 화면 크기(px)
 */
export function createTeacher(root, look, { unit = 6 } = {}) {
  const U = unit;
  const C = look.colors;
  root.classList.add('teacher-stage');
  const scene = el('div', 'teacher-scene');
  const rig = el('div', 'teacher-part');
  scene.appendChild(rig);
  root.appendChild(scene);

  /** 상자 하나. 크기와 가운데 자리는 칸 단위, y는 위쪽이 +. */
  function box(parent, [w, h, d], [x, y, z], color) {
    const b = el('div', 'teacher-box');
    b.style.width = `${w * U}px`;
    b.style.height = `${h * U}px`;
    b.style.left = `${(-w * U) / 2}px`;
    b.style.top = `${(-h * U) / 2}px`;
    b.style.transform = `translate3d(${x * U}px, ${-y * U}px, ${z * U}px)`;
    const faces = [
      [w, h, `translateZ(${(d * U) / 2}px)`, 1],
      [w, h, `rotateY(180deg) translateZ(${(d * U) / 2}px)`, 0.7],
      [d, h, `rotateY(90deg) translateZ(${(w * U) / 2}px)`, 0.82],
      [d, h, `rotateY(-90deg) translateZ(${(w * U) / 2}px)`, 0.82],
      [w, d, `rotateX(90deg) translateZ(${(h * U) / 2}px)`, 1.12],
      [w, d, `rotateX(-90deg) translateZ(${(h * U) / 2}px)`, 0.6],
    ];
    for (const [fw, fh, t, light] of faces) {
      const f = el('div', 'teacher-face');
      f.style.width = `${fw * U}px`;
      f.style.height = `${fh * U}px`;
      f.style.left = `${((w - fw) * U) / 2}px`;
      f.style.top = `${((h - fh) * U) / 2}px`;
      f.style.transform = t;
      f.style.background = color;
      f.style.filter = `brightness(${light})`;
      b.appendChild(f);
    }
    parent.appendChild(b);
    return b;
  }

  /** 돌릴 수 있는 묶음. 기준점(칸 단위)을 중심으로 돈다. */
  function part(parent, [px, py, pz]) {
    const outer = el('div', 'teacher-part');
    outer.style.transform = `translate3d(${px * U}px, ${-py * U}px, ${pz * U}px)`;
    const inner = el('div', 'teacher-part teacher-moving');
    outer.appendChild(inner);
    parent.appendChild(outer);
    return inner;
  }

  const [bodyW, bodyH, bodyD] = look.body;
  const [legW, legH, legD] = look.leg;
  const [armW, armH, armD] = look.arm;
  const [headW, headH, headD] = look.head;
  const bodyTop = legH + bodyH;

  // 다리, 몸통
  box(rig, [legW, legH, legD], [-legW / 2, legH / 2, 0], C.leg);
  box(rig, [legW, legH, legD], [legW / 2, legH / 2, 0], C.leg);
  box(rig, [bodyW, bodyH, bodyD], [0, legH + bodyH / 2, 0], C.body);
  // 팔: 어깨(몸통 위 끝)를 중심으로 돈다.
  const armL = part(rig, [-(bodyW / 2 + armW / 2), bodyTop, 0]);
  box(armL, [armW, armH, armD], [0, -armH / 2, 0], C.arm);
  const armR = part(rig, [bodyW / 2 + armW / 2, bodyTop, 0]);
  box(armR, [armW, armH, armD], [0, -armH / 2, 0], C.arm);
  // 머리: 목을 중심으로 돈다. 얼굴(눈·빈칸·입)은 머리 가운데에 모은다.
  const head = part(rig, [0, bodyTop, 0]);
  box(head, [headW, headH, headD], [0, headH / 2, 0], C.head);
  const [eyeW, eyeH, eyeD] = look.eye;
  const [barW, barH, barD] = look.mouthBar;
  const [cornerW, cornerH, cornerD] = look.mouthCorner;
  const faceH = eyeH + look.eyeMouthGap + cornerH + barH;
  const faceTop = headH / 2 + faceH / 2;
  const front = headD / 2 + 0.5;
  const eyes = [-look.eyeX, look.eyeX].map((x) => box(head, [eyeW, eyeH, eyeD], [x, faceTop - eyeH / 2, front], C.eye));
  const cornerY = faceTop - eyeH - look.eyeMouthGap - cornerH / 2;
  box(head, [cornerW, cornerH, cornerD], [-look.mouthCornerX, cornerY, front], C.mouth);
  box(head, [cornerW, cornerH, cornerD], [look.mouthCornerX, cornerY, front], C.mouth);
  const mouth = box(head, [barW, barH, barD], [0, cornerY - cornerH / 2 - barH / 2, front], C.mouth);
  const mouthBase = mouth.style.transform;
  const eyeBase = eyes.map((e) => e.style.transform);

  // 자세 하나: 몸 전체 높이에 맞춰 무대 크기를 정한다.
  const totalH = legH + bodyH + headH;
  root.style.setProperty('--teacher-height', `${totalH * U}px`);

  let yaw = -18;
  let pitch = -6;
  let fallen = false;
  let talking = false;
  let alive = true;
  let t = 0;
  let last = 0;

  function frame(now) {
    if (!alive) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    t += dt;
    scene.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg)`;
    if (!fallen) rig.style.transform = `translateY(${Math.sin(t * 2) * 1.5 + (talking ? Math.abs(Math.sin(t * 9)) * -2 : 0)}px)`;
    if (talking) setMouth(Math.sin(t * 22) > 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function setMouth(open) {
    mouth.style.transform = mouthBase + (open ? ` translateY(${(barH * U) / 2}px) scaleY(2)` : '');
  }

  function blink() {
    if (!alive) return;
    if (!fallen) {
      eyes.forEach((e, i) => (e.style.transform = `${eyeBase[i]} scaleY(.15)`));
      setTimeout(() => eyes.forEach((e, i) => (e.style.transform = eyeBase[i])), 140);
    }
    setTimeout(blink, 2500 + Math.random() * 3000);
  }
  setTimeout(blink, 2000);

  // 끌어서 돌려 보기
  let drag = null;
  root.addEventListener('pointerdown', (e) => {
    drag = [e.clientX, e.clientY, yaw, pitch];
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw = drag[2] + (e.clientX - drag[0]) * 0.4;
    pitch = Math.max(-35, Math.min(20, drag[3] - (e.clientY - drag[1]) * 0.3));
  });
  root.addEventListener('pointerup', () => (drag = null));

  const POSES = {
    idle: { armL: '', armR: '', head: '' },
    talk: { armL: '', armR: 'rotateZ(-12deg)', head: '' },
    point: { armL: '', armR: 'rotateZ(-100deg)', head: 'rotateY(18deg)' },
    listen: { armL: '', armR: '', head: 'rotateZ(12deg)' },
    demo: { armL: 'rotateZ(40deg) rotateX(-30deg)', armR: 'rotateZ(-40deg) rotateX(-30deg)', head: 'rotateX(-12deg)' },
  };

  return {
    /** 자세: idle, talk, point, listen, demo */
    pose(name) {
      const p = POSES[name] ?? POSES.idle;
      armL.style.transform = p.armL;
      armR.style.transform = p.armR;
      head.style.transform = p.head;
    },
    /** 입을 움직이기 시작하거나 멈춘다 */
    talking(on) {
      talking = on;
      if (!on) setMouth(false);
    },
    /** 고개를 두 번 끄덕인다 */
    nod() {
      return new Promise((resolve) => {
        const steps = ['rotateX(-18deg)', '', 'rotateX(-18deg)', ''];
        steps.forEach((s, i) => setTimeout(() => (head.style.transform = s), i * 280));
        setTimeout(resolve, steps.length * 280);
      });
    },
    /** 뒤로 쓰러진다 */
    fall() {
      fallen = true;
      talking = false;
      setMouth(false);
      rig.style.transition = 'transform .6s cubic-bezier(.5,0,.9,.6)';
      rig.style.transform = `translateZ(${-bodyD * U}px) rotateX(90deg)`;
      return new Promise((resolve) => setTimeout(resolve, 650));
    },
    /** 다시 일어선다 */
    standUp() {
      rig.style.transition = 'transform .4s ease';
      rig.style.transform = '';
      return new Promise((resolve) =>
        setTimeout(() => {
          rig.style.transition = '';
          fallen = false;
          resolve();
        }, 420),
      );
    },
    destroy() {
      alive = false;
      root.innerHTML = '';
    },
  };
}

function el(tag, className) {
  const e = document.createElement(tag);
  e.className = className;
  return e;
}
