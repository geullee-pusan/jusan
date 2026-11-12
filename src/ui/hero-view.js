// 성 지키기의 3D 주인공(이로). 아이를 찍은 영상으로 만든 모델이다(docs/3d-hero.md, 부모 허락).
// 성 앞에 서 있다가(오래 기다리면 하품), 성벽이 깎이면 고개를 떨구는 동작(defeated)을, 몬스터를 무찌르면 춤 하나를 춘다.
// 그리기만 하고 게임 규칙에는 끼어들지 않는다.
import * as THREE from 'three';
import data from '../content/hero/hero.json';
import textureUrl from '../content/hero/hero.webp';
import { buildHero, HERO_VIEW, heroCamera } from './hero-model.js';

/** 캔버스 밖으로 몸이 나가 잘리는 동작은 쓰지 않는다(scripts/hero-pack이 재어 data.fits에 적는다) */
const fits = (name) => data.fits?.[name] !== false && data.clips.some((c) => c.name === name);
const DANCES = ['dance1', 'dance2', 'dance3', 'dance4', 'dance5', 'dance6'].filter(fits);
const FADE = 0.25;
/** 성벽이 깎일 때 번갈아 하는 동작 */
const HURTS = ['defeated', 'hurt2', 'hurt3'].filter(fits);
/** 이만큼(초) 아무 일 없이 서 있으면 하품한다 */
const YAWN_AFTER = 15;

/**
 * @param {HTMLElement} host 캔버스를 넣을 곳
 * @returns {{start: () => void, stop: () => void, hurt: () => void, cheer: () => void, idle: () => void}}
 */
export function createHeroView(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'def-hero';
  host.appendChild(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    // WebGL을 못 쓰는 기기: 주인공 없이 게임만 한다
    canvas.remove();
    return { start() {}, stop() {}, hurt() {}, cheer() {}, idle() {} };
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x55606a, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(2, 3, 2);
  scene.add(sun);
  const camera = heroCamera();

  let mixer = null;
  let clips = null;
  let current = null;
  let currentName = '';
  let dance = 0;
  let hurtNo = 0;
  let idleFor = 0; // 서 있기만 한 시간(초)
  const image = new Image();
  image.onload = () => {
    const hero = buildHero(data, image);
    hero.root.rotation.y = HERO_VIEW.turn; // 몬스터가 오는 오른쪽을 비스듬히 본다
    scene.add(hero.root);
    clips = hero.clips;
    mixer = new THREE.AnimationMixer(hero.root);
    mixer.addEventListener('finished', (e) => {
      if (e.action === current && currentName !== 'idle') play('idle');
    });
    play('idle');
  };
  image.src = textureUrl;

  function play(name) {
    if (!mixer || !clips[name]) return;
    const action = mixer.clipAction(clips[name]);
    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.timeScale = HURTS.includes(name) ? 1.4 : 1;
    if (name === 'idle') {
      action.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.play();
    if (current && current !== action) action.crossFadeFrom(current, FADE, false);
    current = action;
    currentName = name;
    idleFor = 0;
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  let running = false;
  let last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    resize();
    mixer?.update(dt);
    if (currentName === 'idle') {
      idleFor += dt;
      if (idleFor > YAWN_AFTER && fits('yawn')) play('yawn');
      else if (idleFor > YAWN_AFTER) idleFor = 0;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  return {
    /** 그리기 시작(게임 화면이 보일 때) */
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    },
    /** 그리기 멈춤(멈춤·끝·지도) */
    stop() {
      running = false;
    },
    /** 성벽이 깎였을 때: 하던 동작을 멈추고 고개를 떨구거나, 움찔하거나, 아파한다(돌아가며) */
    hurt() {
      if (HURTS.length) play(HURTS[hurtNo++ % HURTS.length]);
    },
    /** 몬스터를 무찔렀을 때: 춤 하나(차례대로 돌아가며). 고개를 떨구거나 춤추는 중이면 그대로 둔다 */
    cheer() {
      if ((currentName !== 'idle' && currentName !== 'yawn') || !DANCES.length) return;
      play(DANCES[dance++ % DANCES.length]);
    },
    /** 새 판: 숨쉬기로 */
    idle() {
      play('idle');
    },
  };
}
