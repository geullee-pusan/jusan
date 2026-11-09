// 성 지키기 이야기 장면 재생기(docs/story.md). 무엇을 언제 보여 줄지는 src/core/story.js가 정한다.
//  - 그림 한 장: 이미 있는 그림(배경, 성, 몬스터)을 겹치고, 새 그림(src/content/story/A1~A5.webp)이 있으면 그것을 쓴다.
//    새 그림이 아직 없으면 효과(빛나는 주판, 마왕 그림자, 빛의 주판알, 불꽃)로 대신한다.
//  - 그림은 천천히 다가가거나(zoom) 옆으로 흐른다(pan).
//  - 선생님이 대사를 목소리와 자막으로 읽고, 아이가 "다음"을 누를 때까지 기다린다(CLAUDE.md 선생님 규칙).
//    "건너뛰기"는 언제든 누를 수 있다.
import look from '../content/teacher-look.json';
import teacherVoice from '../content/teacher.json';
import story from '../content/story.json';
import { beadsAt, fillLine } from '../core/story.js';
import { sfx } from './sfx.js';
import { speak, stopSpeaking } from './speech.js';
import { createTeacher } from './teacher-view.js';

const BACKDROPS = import.meta.glob('../content/backgrounds/bg-*.webp', { eager: true, import: 'default' });
const MONSTERS = import.meta.glob('../content/monsters/*.webp', { eager: true, import: 'default' });
const CASTLE = Object.values(import.meta.glob('../content/backgrounds/castle.webp', { eager: true, import: 'default' }))[0];
const ART = import.meta.glob('../content/story/*.webp', { eager: true, import: 'default' });
/** 새 그림 가운데 장면 전체를 채우는 것(나머지는 가운데에 겹친다) */
const FULL_ART = new Set(['A2', 'A5']);
const FLYING = new Set(['bat', 'ghost', 'witch', 'raven', 'gargoyle']);

const art = (name) => ART[`../content/story/${name}.webp`];
const monster = (type) => MONSTERS[`../content/monsters/${type}.webp`];

/**
 * @param {HTMLElement} root 이 안에 덮개 화면을 만든다
 * @param {{outfit: () => string[], music: (track: number|null) => void}} io
 */
export function createStoryView(root, io) {
  const box = document.createElement('section');
  box.className = 'story';
  box.hidden = true;
  box.innerHTML = `
    <div class="story-stage"><div class="story-layer"></div></div>
    <div class="story-beads"></div>
    <div class="story-teacher"></div>
    <div class="story-caption panel"><b class="story-title"></b><p class="story-text"></p></div>
    <div class="story-controls">
      <button class="block-btn small" data-s="skip">건너뛰기 ⏭️</button>
      <button class="block-btn green" data-s="next">다음 ▶</button>
    </div>`;
  root.appendChild(box);
  const $ = (s) => box.querySelector(s);
  const teacher = createTeacher($('.story-teacher'), look, { unit: 3 });

  let waitNext = null;
  let skipped = false;
  box.addEventListener('click', (e) => {
    const act = e.target.closest('[data-s]')?.dataset.s;
    if (!act) return;
    sfx('tap');
    if (act === 'skip') {
      skipped = true;
      stopSpeaking();
    }
    if (act === 'next') stopSpeaking();
    waitNext?.();
  });

  /** 그림 한 장을 꾸민다 */
  function drawPanel(p) {
    const layer = $('.story-layer');
    const a = p.art ? art(p.art) : null;
    // 밤 장면: 새 그림(원래 밤 그림)이 있으면 어둡게 덮지 않는다
    layer.className = `story-layer motion-${p.motion ?? 'zoom'}${p.night && !a ? ' night' : ''}`;
    const bg = a && FULL_ART.has(p.art) ? a : BACKDROPS[`../content/backgrounds/bg-${p.bg}.webp`];
    layer.style.backgroundImage = bg ? `url(${bg})` : '';
    // 장면 전체 그림(A2, A5)은 잘리지 않게 다 보여 주고, 남는 위아래는 같은 그림을 흐리게 채운다
    const full = Boolean(a && FULL_ART.has(p.art));
    layer.classList.toggle('full-art', full);
    $('.story-stage').classList.toggle('blurfill', full);
    $('.story-stage').style.setProperty('--fill', full ? `url(${a})` : 'none');
    let html = '';
    if (p.castle && CASTLE && !(a && FULL_ART.has(p.art))) {
      // 새 그림을 가운데에 크게 겹칠 때는 성을 왼쪽으로 비켜 세운다
      const at = a && p.castle === 'center' ? 'left' : p.castle;
      html += `<img class="s-castle at-${at}" src="${CASTLE}" alt="">`;
      if (p.effect === 'abacus-glow' && !a) html += '<div class="s-abacus at-castle-top">' + '<i></i>'.repeat(5) + '</div>';
    }
    (p.monsters ?? []).forEach((t, i) => {
      const src = monster(t);
      if (src) html += `<img class="s-mon ${FLYING.has(t) ? 'fly' : 'walk'}" style="--i:${i}" src="${src}" alt="">`;
    });
    if (p.boss && monster('boss') && !(a && p.art === 'A4')) html += `<img class="s-boss ${p.boss}" src="${monster('boss')}" alt="">`;
    if (a && !FULL_ART.has(p.art)) html += `<img class="s-art art-${p.art}" src="${a}" alt="">`;
    else if (!a) {
      if (p.effect === 'thief') html += `<div class="s-thief">${monster('boss') ? `<img src="${monster('boss')}" alt="">` : ''}<span class="s-beads-fly">${'<i></i>'.repeat(5)}</span></div><div class="s-stars"></div>`;
      if (p.effect === 'bead' || p.effect === 'bead-flowers') html += '<div class="s-bead"><i></i></div>';
      if (p.effect === 'bead-flowers') html += '<div class="s-flowers">' + '🌼🌸🌼🌷🌼🌸'.split('').filter((c) => c.trim()).map((f, i) => `<span style="--i:${i}">${f}</span>`).join('') + '</div>';
      if (p.effect === 'fireworks') html += '<div class="s-fireworks">' + [0, 1, 2, 3, 4].map((i) => `<i style="--i:${i}"></i>`).join('') + '</div><div class="s-numbers">' + '12345'.split('').map((n, i) => `<span style="--i:${i}">${n}</span>`).join('') + '</div>';
    }
    layer.innerHTML = html;
    // 다시 다가가게(움직임을 처음부터)
    layer.style.animation = 'none';
    void layer.offsetWidth;
    layer.style.animation = '';
    $('.story-teacher').hidden = !p.teacher;
  }

  function drawBeads(n) {
    $('.story-beads').innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  }

  /**
   * 장면 하나를 처음부터 끝까지 보여 준다. 건너뛰면 바로 끝난다.
   * @param {string} id 장면 id(src/core/story.js의 SCENES)
   * @param {object} values 대사 빈칸 값(예: {defeated: 23})
   */
  async function play(id, values = {}) {
    const scene = story.scenes[id];
    if (!scene) return;
    skipped = false;
    box.hidden = false;
    teacher.setOutfit(io.outfit());
    $('.story-title').textContent = scene.title;
    for (const p of scene.panels) {
      if (skipped) break;
      io.music(p.music ?? scene.music);
      drawPanel(p);
      drawBeads(p.beads ?? beadsAt(id));
      const next = $('[data-s=next]');
      for (const raw of p.lines) {
        if (skipped) break;
        const text = fillLine(raw, values);
        $('.story-text').textContent = text;
        teacher.pose('talk');
        // 말하는 동안에도 "다음"으로 넘길 수 있다
        next.textContent = '다음 ▶';
        await Promise.race([speak(text, teacherVoice.voice), new Promise((ok) => (waitNext = ok))]);
        teacher.pose('idle');
      }
      if (skipped) break;
      // 다 읽으면 아이가 "다음"을 누를 때까지 기다린다
      next.classList.add('ready');
      await new Promise((ok) => (waitNext = ok));
      next.classList.remove('ready');
    }
    waitNext = null;
    stopSpeaking();
    box.hidden = true;
    io.music(null);
  }

  return { play, get playing() { return !box.hidden; } };
}
