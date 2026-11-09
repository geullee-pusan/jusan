# 성 지키기 그림 프롬프트 (2026-11-10)

"주판 성 지키기" 몬스터 17종과 배경 5장을 AI 이미지 도구로 만들 때 쓰는 프롬프트다. 부모가 만들어 주면 앱에 넣는다.

- 원칙
  - 리얼리티가 가장 중요하다(부모 결정).
  - 특정 게임·영화의 캐릭터를 따라 하지 않는다.
  - 초등학생이 보는 앱이라 피와 잔인한 장면은 넣지 않는다.
- 파일 위치
  - 몬스터는 `assets/monsters/<이름>.png`에 둔다.
  - 배경은 `assets/backgrounds/bg-<번호>.png`에 둔다.
  - 이름과 번호는 아래 표의 파일 이름을 따른다.

## 몬스터 (정사각형 1024×1024)

각 프롬프트 뒤에 아래 **공통 문장**을 붙인다.

> Semi-realistic fantasy creature, highly detailed digital painting with realistic textures and lighting, soft rim light. Full body, side view, facing LEFT as if walking toward the left edge of the image. Centered, whole body visible with nothing cut off, feet touching the bottom of the frame. Isolated on a transparent background (if transparency is not possible, a plain flat pure white background). No ground, no shadow, no text, no logo, no frame. Scary-cool but suitable for a 9-year-old: no blood, no gore. Original design, not based on any existing game or movie. Square 1024x1024.

| 파일 | 몬스터 | 프롬프트 |
|---|---|---|
| `slime.png` | 슬라임 | A gelatinous green slime creature, a wobbling translucent jelly dome, light refracting through it, small bubbles and a darker core visible inside, two glossy black eyes and a small mischievous mouth, wet glossy highlights. |
| `bat.png` | 박쥐 | A giant cave bat in flight, wings spread wide, leathery semi-translucent wing membranes with visible finger bones, dark brown fur, big pointed ears, glowing red eyes, small white fangs. |
| `mushroom.png` | 버섯 | A walking mushroom monster with a red fly-agaric style cap covered in white warts, a pale cream stem with a frilly ring, angry little eyes and mouth on the stem, two tiny root-like feet. |
| `spider.png` | 거미 | A large hairy jumping spider, fuzzy black and brown body with orange and white markings on the abdomen, big glossy front eyes, eight jointed legs, front legs slightly raised as if about to pounce. |
| `raven.png` | 큰까마귀(날아옴) | A giant black raven in flight, wings spread wide, glossy blue-black feathers with realistic detail, sharp curved beak, glowing amber eyes, talons tucked under its body. |
| `zombie.png` | 좀비 | A shambling zombie in tattered grey-brown rags, pale grey-green skin, sunken tired eyes, messy dark hair, arms stretched forward, torn trousers and worn boots. Spooky but harmless-looking, not rotting, not bloody. |
| `skeleton.png` | 해골 | An animated skeleton warrior, aged ivory bones with realistic texture, dark eye sockets with faint blue glowing points, holding a rusty short sword and a cracked round wooden shield. |
| `ghost.png` | 유령 | A floating ghost made of glowing pale blue mist and cloth-like wisps, hollow dark eyes and an open moaning mouth, its lower body fading into smoke, soft inner glow, semi-transparent. |
| `goblin.png` | 고블린 | A small mischievous goblin with olive-green skin, very long pointed ears, a long crooked nose, yellow eyes, a sharp-toothed grin, wearing a patched leather vest, holding a wooden club with metal studs. |
| `golem.png` | 바위 골렘 | A hulking rock golem made of stacked grey boulders, cracks across the stone, moss and small plants growing on its shoulders, huge stone fists hanging near the ground, small glowing blue eyes deep in a stone head. |
| `knight.png` | 검은 기사 | A menacing black-armored knight, dark steel plate armor with worn edges and highlights, closed helmet with a narrow visor slit glowing red, a red plume, a tattered dark red cape, holding a longsword and a black kite shield. |
| `witch.png` | 마녀(빗자루, 날아옴) | A sinister old witch flying on a long wooden broomstick, sitting sideways on the broom, dark purple robe and tall crooked pointed hat fluttering in the wind, pale greenish skin, long nose, wild grey hair streaming back, one hand holding a gnarled staff topped with a glowing green crystal, wisps of green magic trailing behind the broom. (날아오는 몬스터는 공통 문장의 "feet touching the bottom" 대신 "flying toward the LEFT edge, in mid-air with no ground beneath") |
| `dragon.png` | 드래곤 | A red dragon standing on all fours, crimson scales with realistic texture, golden belly plates, large bat-like wings half raised, curved horns, yellow slit-pupil eyes, smoke curling from its nostrils, a long spiked tail. |
| `giant.png` | 거인 | A huge brutish giant with tan weathered skin, a heavy brow, a bushy brown beard, wearing animal-hide clothes with a rope belt, carrying an enormous tree-trunk club over one shoulder. |
| `gargoyle.png` | 가고일(날아옴) | A stone gargoyle flying with large bat-like stone wings spread, grey weathered granite body with cracks and patches of moss, curved horns, glowing orange eyes, sharp stone claws, a long tail. |
| `lava.png` | 용암 골렘 | A golem made of black volcanic basalt with bright glowing orange-yellow lava flowing through deep cracks, embers and sparks floating off it, burning eyes, molten drips falling from its fists. |
| `boss.png` | 마왕 | The final boss, a tall demon king in ornate black and purple armor, huge curved horns, a jagged golden crown, face hidden in shadow with two glowing red eyes, a long tattered black cape with crimson lining, holding a staff with a glowing purple crystal, a dark purple aura around him. |

## 배경 (가로로 긴 그림, 21:9 또는 16:9)

각 프롬프트 뒤에 아래 **공통 문장**을 붙인다.

> Realistic painted fantasy landscape for a side-view game background, very wide landscape format (21:9, or 16:9 if not available). Seen from the side at ground level. Flat open ground fills the lower two-thirds so characters can walk across it from right to left. The left edge is kept simple (a castle will be placed there). No characters, no creatures, no buildings, no text. Highly detailed, realistic lighting and atmosphere.

레벨이 오를수록 점점 어둡고 험해진다.

| 파일 | 땅 | 레벨 | 프롬프트 |
|---|---|---|---|
| `bg-1.png` | 풀밭 | 1~3 | A sunny green meadow with short grass and a few wildflowers, blue sky with soft white clouds, gentle hills in the distance. Calm and bright. |
| `bg-2.png` | 해 질 녘 들판 | 4~6 | The same kind of meadow at sunset, long shadows, an orange and purple sky, the grass growing darker, a few bare trees on the horizon. Slightly ominous. |
| `bg-3.png` | 메마른 땅 | 7~9 | A dry cracked wasteland, dusty orange-brown earth, scattered rocks and old bleached animal bones, a hazy yellow sky, a few dead bushes. Harsh and hot. |
| `bg-4.png` | 어둠 동굴 | 10~12 | Inside a huge dark cave, a rough stone floor, stalactites hanging from above, faint blue crystals glowing in the walls, deep shadows, mist creeping along the ground. Eerie. |
| `bg-5.png` | 용암 땅 | 13~ | A volcanic land, black cracked rock ground with glowing rivers of lava, a red smoky sky, falling embers, an erupting volcano in the far distance. Dangerous and dramatic. |

## 성 (넣고 싶으면)

| 파일 | 프롬프트 |
|---|---|
| `castle.png` | A sturdy medieval stone castle wall with one round tower, seen from the side and facing right, weathered grey stone with patches of moss, a small red flag on top. Same realistic painted style. Isolated on a transparent background (or plain pure white). Tall vertical image, about 1:2. |

## 받은 뒤 할 일

- 바탕 정리
  - 흰 바탕이면 바탕을 지워 투명하게 만든다.
  - 몬스터마다 잘라서 크기를 맞춘다.
- 크기 줄이기
  - 몬스터는 긴 쪽이 256px쯤인 WebP로 줄인다.
  - 배경은 가로 1600px쯤인 WebP로 줄인다.
  - 앱이 한 파일이라 그림도 그 안에 들어간다. 가볍게 해야 한다.
- 게임 연결
  - 몬스터가 걷거나 날거나 떠다니는 움직임을 넣는다.
  - 배경은 레벨에 맞춰 바꿔 끼운다.

## 배경음악 (게임 모드에만, 2026-11-10)

배경 단계마다 한 곡씩 만든다. 레벨이 오를수록 점점 긴박해진다.

- 만드는 법(Suno 같은 AI 음악 도구)
  - 가사 없이(Instrumental) 만든다. 각 곡 1분~1분 30초쯤이면 된다.
  - 끝과 처음이 자연스럽게 이어지는(반복 재생) 곡이 좋다.
- 파일 위치
  - `assets/music/bgm-<번호>.mp3`에 둔다.
- 앱에서 쓰는 방식
  - 게임 화면의 🎵 단추로 켜고 끈다. 처음에는 꺼져 있다.
  - 마이크로 답을 듣기 때문에 소리는 작게 낸다.
- 특정 게임·영화 음악을 따라 하지 않는다.

| 파일 | 땅(레벨) | 스타일 프롬프트 |
|---|---|---|
| `bgm-1.mp3` | 풀밭(1~3) | Instrumental, light adventurous fantasy, gentle strings and flute, soft hand percussion, bright and hopeful, calm steady tempo around 95 BPM, seamless loop, no vocals, background music for a children's game |
| `bgm-2.mp3` | 해 질 녘 들판(4~6) | Instrumental, fantasy adventure at dusk, warm strings with a hint of tension, low pizzicato bass, soft taiko drums, slightly mysterious, tempo around 105 BPM, seamless loop, no vocals, background music for a children's game |
| `bgm-3.mp3` | 메마른 땅(7~9) | Instrumental, desert fantasy, dry plucked strings and hand drums, low drone, dusty and tense, tempo around 112 BPM, seamless loop, no vocals, background music for a children's game |
| `bgm-4.mp3` | 어둠 동굴(10~12) | Instrumental, dark cave ambience with steady pulse, deep cello ostinato, echoing chimes like crystals, distant drips, suspenseful but not scary, tempo around 118 BPM, seamless loop, no vocals, background music for a children's game |
| `bgm-5.mp3` | 용암 땅(13~) | Instrumental, epic final battle, driving orchestral strings, heavy taiko drums, brass stabs, urgent and heroic, tempo around 130 BPM, seamless loop, no vocals, not too loud, background music for a children's game |

## 이야기 장면 그림 (2026-11-10, docs/story.md)

없어도 이야기는 돌아간다(효과로 대신한다). 있으면 `src/content/story/A1.webp`~`A5.webp`로 넣는다. 원본은 `assets/story/`에 둔다.
A1·A3·A4는 투명 바탕(또는 흰 바탕)으로, 가운데에 겹친다. A2·A5는 가로로 긴 장면 전체(21:9 또는 16:9)다.

공통 문장(모든 그림 뒤에 붙인다):
> Semi-realistic fantasy illustration, highly detailed digital painting with realistic textures and lighting, same style as a children's fantasy game. Suitable for a 9-year-old: no blood, no gore, not too scary. Original design, not based on any existing game, movie or book. No text, no logo, no frame.

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `A1` | 프롤로그 1 | A large ornate wooden abacus mounted on a stone frame, with exactly five big glowing golden beads shining warm light, magical sparkles around them, isolated on a transparent background (or plain pure white). Square 1024x1024. |
| `A2` | 프롤로그 2 | Night sky over a quiet meadow, a dark horned demon king silhouette flying away across the moon carrying five glowing golden beads that leave a trail of light, a small stone castle with a tower far away below, stars, mysterious blue night. Wide landscape 21:9. |
| `A3` | 사이 장면 | A single large glowing golden abacus bead, round and slightly flattened like a real abacus bead, radiating warm light and tiny sparkles, isolated on a transparent background (or plain pure white). Square 1024x1024. |
| `A4` | 엔딩 2 | A small, tired demon king in dark purple armor with a crooked golden crown, his dark aura gone, looking a bit embarrassed and funny, holding out one glowing golden abacus bead with both hands, side view facing left, full body, isolated on a transparent background (or plain pure white). Square 1024x1024. |
| `A5` | 엔딩 3 | A sunny green meadow with a stone castle with one round tower, a big abacus on top of the castle with five glowing golden beads, colorful fireworks in the blue sky shaped like numbers 1 to 5, joyful celebration atmosphere. Wide landscape 21:9. |
