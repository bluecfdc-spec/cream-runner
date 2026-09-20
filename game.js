(function(){
  "use strict";

  var app = document.getElementById('app');
  var sky = document.getElementById('sky');
  var obstaclesLayer = document.getElementById('obstacles');
  var character = document.getElementById('character');
  var charImg = document.getElementById('charImg');
  var effectsLayer = document.getElementById('effectsLayer');
  var hitFlashEl = document.getElementById('hitFlash');
  var invincibleHud = document.getElementById('invincibleHud');
  var invincibleTimeEl = document.getElementById('invincibleTime');
  var charCountdown = document.getElementById('charCountdown');
  var charCountdownNum = document.getElementById('charCountdownNum');
  var gaugeIcon = document.getElementById('gaugeIcon');
  var gaugeFill = document.getElementById('gaugeFill');
  var gaugeRider = document.getElementById('gaugeRider');
  var crowWarningEl = document.getElementById('crowWarning');
  var scoreVal = document.getElementById('scoreVal');
  var startScreen = document.getElementById('startScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var startBtn = document.getElementById('startBtn');
  var retryBtn = document.getElementById('retryBtn');
  var finalScoreEl = document.getElementById('finalScore');
  var top3List = document.getElementById('top3List');
  var top3Status = document.getElementById('top3Status');
  var top10List = document.getElementById('top10List');
  var top10Status = document.getElementById('top10Status');
  var loadingOverlay = document.getElementById('loadingOverlay');
  var newRecordBox = document.getElementById('newRecordBox');
  var newRecordLabel = document.getElementById('newRecordLabel');
  var nameInput = document.getElementById('nameInput');
  var submitNameBtn = document.getElementById('submitNameBtn');
  var gameoverPic = document.getElementById('gameoverPic');
  var gameOverTitleEl = document.getElementById('gameOverTitle');
  var bannerImg = document.getElementById('bannerImg');
  var startBannerImg = document.getElementById('startBannerImg');
  var visitBadge = document.getElementById('visitBadge');
  var visitTodayEl = document.getElementById('visitToday');
  var visitTotalEl = document.getElementById('visitTotal');

  var IMG_RUN = "assets/img_run.png";
  var IMG_JUMP = "assets/img_jump.png";
  var IMG_GAMEOVER = "assets/img_gameover.png";
  var IMG_POOP = "assets/img_poop.png";
  var IMG_DOG_A = "assets/img_dog_a.png";
  var IMG_DOG_B = "assets/img_dog_b.png";
  var IMG_STAR_ITEM = "assets/img_star_item.png";
  var IMG_BANNER = "assets/img_banner.png";
  var IMG_START_BANNER = "assets/img_start_banner.jpg";
  var IMG_STROLLER = "assets/img_stroller.png";
  var IMG_INVINCIBLE_CHAR = "assets/img_invincible_char.png";
  var IMG_CROW_UP = "assets/img_crow_up.png";
  var IMG_CROW_DOWN = "assets/img_crow_down.png";

  // ---- 테스트 모드 ----
  // ?boss=1 : 오프닝곡 하나만 재생해서 그 곡이 곧 "마지막 곡"이 된다. 곡 길이만 버티면
  // 유모차 예고 -> 유모차 -> 보스 -> 클리어까지 확인할 수 있다.
  // ?hard=1 : 하드 구간(쥐 도약/큰 똥)을 처음부터 켠다.
  // ?safe=1 : 위 두 모드와 같이 쓸 때만 동작. 일반 장애물을 아예 만들지 않아서 죽지 않고
  // 엔딩 연출만 관람할 수 있다 (?boss=1&safe=1).
  // 두 모드에서는 순위 등록과 방문자 집계를 하지 않아 실제 기록이 더러워지지 않는다.
  // 그리고 테스트가 의미 있으려면 "그 구간의 속도"여야 하므로, 시작 시점의 경과 시간과
  // 난이도 배수를 실제 게임의 해당 지점 값으로 맞춰서 시작한다 (아래 TEST_START_SEC).
  var TEST_BOSS = false, TEST_HARD = false, TEST_SAFE = false;
  try {
    var testQs = new URLSearchParams(window.location.search);
    TEST_BOSS = !!testQs.get('boss');
    TEST_HARD = !!testQs.get('hard');
    TEST_SAFE = !!testQs.get('safe');
  } catch (e) {}
  var TEST_MODE = TEST_BOSS || TEST_HARD;
  TEST_SAFE = TEST_SAFE && TEST_MODE; // 장애물 제거는 테스트 모드에서만 허용

  // ---- 점수 구간 돌파 축하 연출: 1,000 / 5,000 / 10,000점을 처음 넘는 순간, 플레이 화면
  // 왼쪽 상단(캐릭터 뒷편)에 축하 이미지가 1초간 떴다 사라지고 축하음이 한 번 울린다.
  // 순수 연출이라 obstacles에 절대 들어가지 않고 충돌/점프/게임오버 판정과 무관하다.
  // 구간을 추가/변경하려면 SCORE_MILESTONES 배열만 고치면 된다 (이미지는 assets/ 안에).
  // 이미지 자체는 assets/milestone_*_pN.js 안에 base64 문자열로 들어있다 (GitHub에 텍스트로만
  // 올릴 수 있어서 캐릭터 이미지들과 같은 방식). 혹시 그 파일들이 빠지면 같은 이름의 실제
  // 이미지 파일로 자동 대체된다.
  function milestoneSrc(b64, filePath){
    return b64 ? ('data:image/webp;base64,' + b64) : filePath;
  }
  var SCORE_MILESTONES = [
    { score: 1000, img: milestoneSrc(window.MILESTONE_IMG_1000, "assets/milestone_1000.webp") },
    { score: 5000, img: milestoneSrc(window.MILESTONE_IMG_5000, "assets/milestone_5000.webp") },
    { score: 10000, img: milestoneSrc(window.MILESTONE_IMG_10000, "assets/milestone_10000.webp") }
  ];
  var MILESTONE_FX_MS = 1000; // 화면에 보이는 시간 (1초)
  // 크기/위치는 assets/tune.js(있으면) 에서 window.MILESTONE_* 로 덮어쓸 수 있게 해둔다.
  // 그래야 이런 미세조정을 할 때 game.js 전체를 다시 올리지 않아도 된다.
  var MILESTONE_SIZE_FRAC = window.MILESTONE_SIZE_FRAC || 0.372; // 오빠!/엄마! 문구(0.26)보다 +43% (기존 0.286에서 +30%)
  var MILESTONE_TOP_FRAC = window.MILESTONE_TOP_FRAC || 0.09; // 위에서 내려온 거리 (커진 크기에서 위가 안 잘리게)
  var MILESTONE_LEFT_FRAC = window.MILESTONE_LEFT_FRAC || 0.025; // 왼쪽 여백
  var milestoneIdx = 0; // 다음에 터질 구간 (reset()에서 0으로 초기화)
  // 1초만 보이는 연출이라 그 순간에 처음 받아오면 늦게 떠서 놓칠 수 있으니 미리 디코딩해둔다.
  SCORE_MILESTONES.forEach(function(m){ var pre = new Image(); pre.src = m.img; });

  // ---- 3-lives family recovery system: state 3 = 온가족(원본 트리오), 2 = 여자+강아지,
  // 1 = 강아지 혼자. Run art for state 3 reuses the original IMG_RUN/IMG_JUMP; states 2/1
  // use the CHAR_IMG_RUN_1/2 (run) and CHAR_IMG_JUMP_1/2/3 (jump) globals loaded from
  // assets/char_run_*.js / assets/char_jump_*.js via <script> tags in index.html.
  var ITEM_IMG_WOMAN = window.ITEM_IMG_WOMAN;
  var ITEM_IMG_MAN = window.ITEM_IMG_MAN;
  var CALL_IMG_OPPA = window.CALL_IMG_OPPA;
  var CALL_IMG_MOM = window.CALL_IMG_MOM;

  function runImgForState(st){
    if (st >= 3) return IMG_RUN;
    if (st === 2) return window.CHAR_IMG_RUN_2;
    return window.CHAR_IMG_RUN_1;
  }
  function jumpImgForState(st){
    if (st >= 3) return window.CHAR_IMG_JUMP_3 || IMG_JUMP;
    if (st === 2) return window.CHAR_IMG_JUMP_2;
    return window.CHAR_IMG_JUMP_1;
  }

  // per-life-state visual/hitbox tuning: as characters are lost, the sprite's visible
  // "body mass" shrinks (fewer figures in the frame), so the running position is nudged
  // back (left) to compensate and the hitbox narrows to match - the on-screen character
  // BOX size itself never changes between states, only where it sits and how tight the
  // hitbox is within it.
  var LIFE_STATE_CFG = {
    3: { offsetXFrac: 0, hitFront: 0.72, hitRear: 0.40 },
    2: { offsetXFrac: -0.05, hitFront: 0.66, hitRear: 0.42 },
    1: { offsetXFrac: -0.10, hitFront: 0.60, hitRear: 0.45 }
  };
  var lifeState = 3; // 3 = 온가족, 2 = 여자+강아지, 1 = 강아지 혼자
  var charOffsetX = 0;
  var hitInvuln = false; // brief grace period right after a life-loss hit so the same
    // obstacle can't immediately cause a second hit next frame
  var HIT_INVULN_DURATION = 1.0;
  var hitInvulnTimer = 0;
  var LIFE_RECOVERY_DELAY = 25; // seconds after the most recent life-loss before the
    // recovery bonus for the missing family member appears
  var BONUS_ITEM_H = 45; // set for real in layout()
  var bonusDueAt = null; // gameTime value at which the next recovery bonus should spawn
  var bonusSpawned = false; // true while a recovery bonus item is currently on screen

  function applyCharTransform(){
    character.style.transform = 'translate(' + charOffsetX.toFixed(1) + 'px,' + (-jumpY).toFixed(1) + 'px)';
  }

  if (gameoverPic) gameoverPic.src = IMG_GAMEOVER;
  if (bannerImg) bannerImg.src = IMG_BANNER;
  if (startBannerImg) startBannerImg.src = IMG_START_BANNER;
  if (gaugeIcon) gaugeIcon.src = IMG_STROLLER;
  if (gaugeRider) gaugeRider.src = IMG_INVINCIBLE_CHAR;

  /* ---------------- audio: sfx (synthesized) + BGM (compilation -> infinite loop) ---------------- */
  var audioCtx = null, masterGain = null, sfxGain = null;

  function ensureAudio(){
    if (!audioCtx){
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);
      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = 0.6;
      sfxGain.connect(masterGain);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(dest, freq, time, dur, gainVal, wave){
    if (!audioCtx) return;
    wave = wave || 'sine';
    gainVal = gainVal == null ? 0.4 : gainVal;
    var osc = audioCtx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gainVal, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g); g.connect(dest);
    osc.start(time); osc.stop(time + dur + 0.05);

    var osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.01, time);
    var g2 = audioCtx.createGain();
    g2.gain.setValueAtTime(0.0001, time);
    g2.gain.exponentialRampToValueAtTime(gainVal * 0.22, time + 0.006);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.55);
    osc2.connect(g2); g2.connect(dest);
    osc2.start(time); osc2.stop(time + dur * 0.55 + 0.05);
  }

  function playJumpSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 523.25, t, 0.11, 0.5, 'triangle');
    playTone(sfxGain, 783.99, t + 0.055, 0.15, 0.42, 'triangle');
  }

  function playGameOverSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 392.00, t, 0.22, 0.4, 'triangle');
    playTone(sfxGain, 261.63, t + 0.16, 0.4, 0.4, 'triangle');
  }

  // sharp, punchy impact sound played the instant a collision happens (before the
  // sadder descending game-over tune, which still plays once the score screen shows)
  function playHitSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 160, t, 0.16, 0.55, 'square');
    playTone(sfxGain, 90, t + 0.02, 0.18, 0.5, 'square');
  }

  // short bright "ding" rewarding a clean dodge
  function playNearMissSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 880, t, 0.09, 0.28, 'triangle');
    playTone(sfxGain, 1318.5, t + 0.05, 0.12, 0.24, 'triangle');
  }

  // cheerful rising jingle for picking up the 개모차 invincibility item
  function playPickupSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 523.25, t, 0.1, 0.32, 'triangle');
    playTone(sfxGain, 659.25, t + 0.07, 0.1, 0.3, 'triangle');
    playTone(sfxGain, 987.77, t + 0.14, 0.18, 0.32, 'triangle');
  }

  // light little "poof" of contact, right when the plow hits (kept snappy/instant)
  function playPlowSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 300, t, 0.07, 0.2, 'triangle');
  }

  // bigger, more satisfying "위잉-펑" swoosh+pop for the obstacle actually flying off and
  // spinning away - layered on top of playPlowSfx's contact poof for extra impact
  function playObstacleKoSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    // fast rising "swoosh" as it spins off
    var osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.16);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.2);
    // bright little "pop" landing on top right as it disappears
    playTone(sfxGain, 1046.5, t + 0.13, 0.14, 0.3, 'triangle');
    playTone(sfxGain, 1568.0, t + 0.17, 0.12, 0.22, 'triangle');
  }

  // short cheerful "ding-ding!" for scooping up the bonus star
  function playStarSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 1046.5, t, 0.09, 0.3, 'triangle');
    playTone(sfxGain, 1568.0, t + 0.06, 0.14, 0.3, 'triangle');
  }

  // 점수 구간 돌파(1,000/5,000/10,000점) 축하음: 밝게 쭉 올라가는 아르페지오(도-미-솔-높은도)에
  // 반짝이는 꼬리음을 얹은 짧은 팡파레. 다른 효과음과 같은 합성음이라 추가 음원 파일이 필요 없고,
  // 돌파 연출 이미지와 같은 타이밍에 딱 한 번만 울린다.
  function playMilestoneSfx(){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    playTone(sfxGain, 523.25, t, 0.12, 0.34, 'triangle');
    playTone(sfxGain, 659.25, t + 0.08, 0.12, 0.32, 'triangle');
    playTone(sfxGain, 783.99, t + 0.16, 0.14, 0.32, 'triangle');
    playTone(sfxGain, 1046.5, t + 0.26, 0.34, 0.36, 'triangle');
    playTone(sfxGain, 1568.0, t + 0.30, 0.26, 0.18, 'sine');
    playTone(sfxGain, 2093.0, t + 0.40, 0.22, 0.12, 'sine');
  }

  // ---- BGM v3: open_fix plays fixed at game start, then the tracks in assets/bgm_manifest.js
  // play once each - BGM_CYCLE_1 shuffled first, then BGM_CYCLE_2 shuffled (order is random
  // WITHIN each cycle, never between cycles) - and finally end_fix. Two <audio>
  // elements are alternated so every track change can hand off cleanly - the outgoing track
  // fades all the way out, a short silence follows, then the next fades in (no overlap at all,
  // see bgmBeginHandoff). The track list itself lives entirely in bgm_manifest.js so
  // adding/removing/swapping songs later - including swapping open_fix/end_fix - never
  // needs touching this file. Everything here runs off audio "timeupdate"/"ended" events and
  // a couple of short requestAnimationFrame fades, so it never touches the game loop and has
  // zero effect on play time or performance.
  var BGM_VOLUME = 0.55;
  // 곡 전환 방식: 두 곡을 겹치는 크로스페이드가 아니라, 앞 곡을 완전히 페이드 아웃해서
  // 끝낸 뒤 아주 짧은 무음을 두고 다음 곡을 페이드 인한다. 애니 OP처럼 조성/템포/악기가
  // 전혀 다른 곡들이 겹치면 소리가 탁해져서 완성도가 떨어져 들리기 때문이다. 무음이 길면
  // "음악이 끊겼나?" 싶으니 0.3초만 둔다. 세 값 모두 assets/tune.js 에서
  // window.BGM_FADE_OUT_MS / BGM_GAP_MS / BGM_FADE_IN_MS 로 조정할 수 있다.
  var BGM_FADE_OUT_MS = window.BGM_FADE_OUT_MS || 2000; // 앞 곡이 사라지는 시간
  var BGM_GAP_MS = window.BGM_GAP_MS || 300; // 두 곡 사이 완전 무음 구간
  var BGM_FADE_IN_MS = window.BGM_FADE_IN_MS || 2000; // 다음 곡이 올라오는 시간
  var bgmGapTimer = null;
  var bgmEls = [document.getElementById('bgm-a'), document.getElementById('bgm-b')];
  var bgmActive = 0;
  var bgmQueue = [];
  var bgmQueueIdx = -1;
  var bgmAdvancing = false;
  var bgmCdImgEl = document.getElementById('bgmCdImg');
  // CD 이미지도 배경을 지운 WebP를 base64로 assets/bgm_cd.js에 담아뒀다 (파일 업로드 없이
  // 바로 보이게). 그 파일이 없으면 assets/bgm/cd.png 파일을 대신 찾는다.
  if (bgmCdImgEl){
    bgmCdImgEl.src = window.BGM_CD_IMG ? ('data:image/webp;base64,' + window.BGM_CD_IMG) : 'assets/bgm/cd.png';
  }
  var bgmTitleTrackEl = document.getElementById('bgmTitleTrack');
  var bgmTitleCopyEls = document.querySelectorAll('.bgmTitleCopy');
  var BGM_MARQUEE_SPEED = 45; // px/sec - constant scroll speed regardless of title length
  bgmEls.forEach(function(el){ if (el) el.volume = 0; });

  function bgmShuffle(list){
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  // 재생 순서는 bgm_manifest.js가 정한다. BGM_PLAYLIST가 있으면 그 배열의 순서를 그대로
  // 쓰고(무작위 없음), 없으면 예전 방식인 BGM_CYCLE_1(무작위) -> BGM_CYCLE_2(무작위)로
  // 동작한다. 사이클 방식에서는 사이클 "안에서만" 순서가 섞이고 사이클끼리의 앞뒤는 절대
  // 바뀌지 않는다. 두 배열도 없으면 BGM_MIDDLE 하나를 통째로 섞는다 (하위 호환).
  // 어느 방식이든 맨 앞은 항상 BGM_OPEN이고, 맨 뒤 곡이 끝나면 엔딩(보스)으로 넘어간다.
  function bgmBuildQueue(){
    var fixed = window.BGM_PLAYLIST;
    var c1 = window.BGM_CYCLE_1 || window.BGM_MIDDLE || [];
    var c2 = window.BGM_CYCLE_2 || [];
    // 테스트 모드(?boss=1)에서는 오프닝곡 하나만 넣어서, 그 곡이 곧 마지막 곡이 되게 한다.
    if (TEST_BOSS) bgmQueue = [window.BGM_OPEN];
    else if (fixed && fixed.length) bgmQueue = [window.BGM_OPEN].concat(fixed);
    else bgmQueue = [window.BGM_OPEN].concat(bgmShuffle(c1), bgmShuffle(c2));
    bgmQueueIdx = -1;
  }
  // 같은 <audio>에 대해 페이드가 새로 시작되면 이전 페이드는 즉시 버린다. 이게 없으면
  // (예: 크로스페이드 도중에 죽고 바로 다시하기) 지난 페이드가 뒤늦게 끝나면서 방금 새로
  // 시작한 곡의 볼륨을 0으로 덮거나 pause()를 불러서 음악이 조용히 멈춰버릴 수 있다.
  var bgmFadeGen = [0, 0];
  function bgmCancelFades(){ bgmFadeGen[0]++; bgmFadeGen[1]++; }
  function bgmFade(el, from, to, ms, done){
    var idx = bgmEls.indexOf(el);
    var gen = (idx >= 0) ? ++bgmFadeGen[idx] : 0;
    var fadingIn = to > from;
    var start = null;
    function step(ts){
      if (idx >= 0 && bgmFadeGen[idx] !== gen) return; // 더 최신 페이드에 밀렸다
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / ms);
      // 등청감(equal-power) 크로스페이드. 볼륨을 직선으로 옮기면 두 곡이 겹치는 동안
      // 전체 음량이 한 번 푹 꺼졌다 올라오는 것처럼 들려서 전환이 급하게 느껴진다.
      // 내려가는 쪽은 cos, 올라오는 쪽은 sin 곡선을 쓰면 두 곡의 합이 일정하게 유지되어
      // 훨씬 부드럽게 넘어간다.
      var e = fadingIn ? Math.sin(p * Math.PI / 2) : 1 - Math.cos(p * Math.PI / 2);
      var v = from + (to - from) * e;
      el.volume = v < 0 ? 0 : (v > 1 ? 1 : v);
      if (p < 1) requestAnimationFrame(step);
      else { el.volume = to; if (done) done(); }
    }
    requestAnimationFrame(step);
  }
  // ---- marquee title: two identical text copies inside a flex track (see #bgmTitleTrack/
  // .bgmTitleCopy in style.css) - translateX(-50%) always travels exactly one copy's width,
  // so the loop is seamless no matter how long the title is (never truncated). The scroll
  // duration is recomputed per-track from the actual rendered text width so every title
  // scrolls at the same constant speed instead of a fixed duration that would look too
  // fast/slow depending on length.
  function bgmSetTitle(track){
    var title = track ? track.title : '';
    for (var i = 0; i < bgmTitleCopyEls.length; i++) bgmTitleCopyEls[i].textContent = title;
    if (!bgmTitleTrackEl) return;
    // restart the animation synchronously (no requestAnimationFrame dependency, so this
    // still works even in a throttled/background tab): 'none' + forcing a reflow by
    // reading offsetWidth clears the old animation state before applying the new
    // duration, instead of the browser silently keeping the previous run in progress.
    bgmTitleTrackEl.style.animation = 'none';
    var copyEl = bgmTitleCopyEls[0];
    if (copyEl) void copyEl.offsetWidth; // force reflow
    var w = copyEl ? copyEl.offsetWidth : 0;
    var dur = Math.max(4, w / BGM_MARQUEE_SPEED);
    bgmTitleTrackEl.style.animation = 'bgmMarquee ' + dur + 's linear infinite';
    bgmTitleTrackEl.style.animationPlayState = 'running';
  }
  function bgmSetSpinning(running){
    var state = running ? 'running' : 'paused';
    if (bgmCdImgEl) bgmCdImgEl.style.animationPlayState = state;
    if (bgmTitleTrackEl) bgmTitleTrackEl.style.animationPlayState = state;
  }
  // ---- 왕(보스)까지 진행도 ----
  // 곡 목록(오프닝 + 본편)에서 몇 번째 곡의 어디까지 왔는지로 계산한다. 곡 하나가 한 칸이고
  // 마지막 곡이 끝나는 순간이 곧 보스 등장이므로, 100%가 정확히 왕을 만나는 시점이 된다.
  // 곡 길이를 미리 알 필요가 없는 방식이라, 재생 목록을 바꿔도 여기는 고칠 것이 없다.
  var bossProgWrapEl = document.getElementById('bossProgWrap');
  var bossProgFillEl = document.getElementById('bossProgFill');
  var bossProgMarksEl = document.getElementById('bossProgMarks');
  function bossProgSet(pct){
    if (!bossProgFillEl) return;
    bossProgFillEl.style.width = Math.max(0, Math.min(100, pct)).toFixed(2) + '%';
  }
  // 곡 경계마다 눈금을 그린다 (몇 곡 남았는지 눈으로 보이게).
  function bossProgBuildMarks(){
    if (!bossProgMarksEl) return;
    bossProgMarksEl.innerHTML = '';
    for (var i = 1; i < bgmQueue.length; i++){
      var m = document.createElement('i');
      m.style.left = (i / bgmQueue.length * 100) + '%';
      bossProgMarksEl.appendChild(m);
    }
  }
  function bossProgUpdate(){
    if (!bossProgFillEl) return;
    if (bossMusicOn){ bossProgSet(100); return; }
    var n = bgmQueue.length;
    if (!n || bgmQueueIdx < 0){ bossProgSet(0); return; }
    var el = bgmEls[bgmActive];
    var frac = 0;
    if (el && el.duration && !isNaN(el.duration) && el.duration > 0){
      frac = Math.min(1, el.currentTime / el.duration);
    }
    bossProgSet((bgmQueueIdx + frac) / n * 100);
  }

  function bgmPlayTrack(track, opts){
    opts = opts || {};
    if (!track) return;
    var folder = window.BGM_FOLDER || '';
    var nextIdx = 1 - bgmActive;
    var curEl = bgmEls[bgmActive];
    var nextEl = bgmEls[nextIdx];
    if (!nextEl) return;
    try {
      nextEl.loop = !!opts.loop;
      nextEl.src = folder + track.file;
      nextEl.currentTime = 0;
      nextEl.volume = (opts.instant && !opts.fadeIn) ? BGM_VOLUME : 0;
      var p = nextEl.play();
      if (p && p.catch) p.catch(function(){});
    } catch (e) {}
    bgmSetTitle(track);
    bgmSetSpinning(true);
    if (opts.instant) {
      bgmCancelFades();
      if (curEl) { try { curEl.pause(); } catch (e) {} }
      // fadeIn이 있으면 0에서 서서히 올린다 (보스 음악이 갑툭튀하지 않게).
      if (opts.fadeIn) { nextEl.volume = 0; bgmFade(nextEl, 0, BGM_VOLUME, opts.fadeIn); }
      else nextEl.volume = BGM_VOLUME;
    } else {
      // 앞 곡은 bgmBeginHandoff에서 이미 페이드 아웃 후 정지된 상태다. 혹시라도 남아 있으면
      // 여기서 확실히 멈춰서, 두 곡이 같이 들리는 순간이 단 한 프레임도 없게 만든다.
      if (curEl && !curEl.paused) { try { curEl.pause(); } catch (e) {} }
      bgmFade(nextEl, 0, BGM_VOLUME, BGM_FADE_IN_MS);
    }
    bgmActive = nextIdx;
    bgmAdvancing = false;
    bossProgUpdate();
  }
  function bgmAdvance(){
    bgmQueueIdx++;
    if (bgmQueueIdx === 0) {
      bgmPlayTrack(bgmQueue[0], { instant: true });
    } else if (bgmQueueIdx < bgmQueue.length) {
      bgmPlayTrack(bgmQueue[bgmQueueIdx], {});
    } else {
      beginFinalBoss();
    }
  }
  // 곡 전환 1단계: 앞 곡을 끝까지 페이드 아웃하고 정지한 뒤, 짧은 무음을 두고 다음 곡을
  // 시작한다 (2단계인 페이드 인은 bgmPlayTrack에서 한다). 이 구간 내내 bgmAdvancing이
  // true로 유지되므로, 앞 곡의 'ended'가 뒤늦게 떠도 다음 곡이 두 번 시작되지 않는다.
  function bgmBeginHandoff(){
    var curEl = bgmEls[bgmActive];
    if (!curEl || curEl.paused){ bgmAdvance(); return; }
    bgmFade(curEl, curEl.volume, 0, BGM_FADE_OUT_MS, function(){
      try { curEl.pause(); } catch (e) {}
      if (bgmGapTimer) clearTimeout(bgmGapTimer);
      bgmGapTimer = setTimeout(function(){
        bgmGapTimer = null;
        bgmAdvance();
      }, BGM_GAP_MS);
    });
  }
  function bgmIsLastQueued(){
    return bgmQueueIdx >= 0 && bgmQueueIdx === bgmQueue.length - 1;
  }
  function bgmCheckCrossfade(el){
    if (!el || el.loop) return;
    if (bossMusicOn) return; // 보스 음원은 다음 곡으로 넘기지 않는다 (한 번만 재생)
    if (!el.duration || isNaN(el.duration)) return;
    var remain = el.duration - el.currentTime;
    if (bgmIsLastQueued()){
      // 마지막 곡은 미리 넘기지 않는다. 곡이 완전히 끝나는 순간 보스 음원이 딱 시작해야
      // 연출이 살고, 페이드 아웃을 걸면 유모차 등장 구간과 겹쳐버린다.
      checkFinalSequence(remain);
      return;
    }
    if (remain <= BGM_FADE_OUT_MS / 1000 && !bgmAdvancing) {
      bgmAdvancing = true;
      bgmBeginHandoff();
    }
  }
  bgmEls.forEach(function(el){
    if (!el) return;
    el.addEventListener('timeupdate', function(){
      if (bgmEls[bgmActive] !== el) return;
      bgmCheckCrossfade(el);
      bossProgUpdate();
    });
    el.addEventListener('ended', function(){
      if (bgmEls[bgmActive] !== el) return;
      if (bossMusicOn){
        // 보스 음원이 끝나면 BGM은 완전히 끝 (반복 없음, 다음 곡 없음)
        bgmSetSpinning(false);
        return;
      }
      if (!bgmAdvancing) {
        bgmAdvancing = true;
        bgmAdvance();
      }
    });
  });

  function startMusic(){
    stopMusic();
    bossMusicOn = false;
    bgmBuildQueue();
    bossProgBuildMarks();
    bossProgSet(0);
    if (bossProgWrapEl) bossProgWrapEl.classList.remove('arrived');
    bgmAdvancing = false;
    bgmAdvance();
  }
  function stopMusic(){
    bgmCancelFades();
    // 무음 구간 중에 죽거나 다시하기를 누르면, 예약된 "다음 곡 시작"도 같이 취소한다.
    if (bgmGapTimer){ clearTimeout(bgmGapTimer); bgmGapTimer = null; }
    bgmEls.forEach(function(el){ if (el) { try { el.pause(); } catch (e) {} } });
    bgmSetSpinning(false);
  }

  /* ---------------- game state & physics (all scaled to the 16:9 box) ---------------- */
  var SPRITE_ASPECT = 230 / 172;
  var GRAVITY = 2300;
  var JUMP_PEAK_1 = 200; // guaranteed apex height of a single jump
  var JUMP_PEAK_2 = 320; // guaranteed apex height once you double-jump, no matter the timing
  var GROUND_H = 64;
  var OBST_POOP_H = 26; // 💩 flat & small, always has to be jumped
  var STAR_H = 45; // treat-jar bonus item size (50% bigger than the original size so
    // it actually reads as something worth grabbing) - air lane, no
    // longer a hazard, so it's fine to line up with a ground obstacle
  var STAR_ELEV_HIGH = 40; // "sky" flight lane - the original, higher pop-up height
  var STAR_ELEV_MID = 20; // "mid-air" flight lane - noticeably lower than the sky lane, but
    // still clearly off the ground so it never reads as a ground hazard
  var STAR_ASPECT = 200 / 435; // treat-jar art's width/height ratio (tall bottle shape)
  var DOG_H = 34; // dog obstacle height, jumpable like poop
  var DOG_ASPECT = 1.48; // dog sprite box width/height ratio
  var CROW_H = 40; // real hazard again - taller than the dog, so it forces a proper
    // jump, but still ground-level (jump to clear, exactly like every
    // other obstacle - no "duck" mechanic exists in this game, so an
    // aerial-only hazard would be undodgeable/unfair)
  var CROW_ASPECT = 325 / 300; // box sized off the wings-up frame's aspect
  var CROW_LIFT_MAX = 200; // how high above its ground-level hitbox the crow visually swoops
    // at the top of its dive (purely cosmetic - see loop())
  var CROW_ARC_RANGE = 400; // horizontal distance (px) over which the lift eases from 0 (right
    // at the character's x, the actual jump-it moment) up to max
  var DOG_EXTRA_SPEED = 0; // dog closes in faster than the scroll speed (set in layout)

  // ---- 10,000점 돌파 이후의 추가 난이도 (까마귀는 이전과 완전히 동일하게 유지) ----
  // 1) 회색쥐: 화면 가운데(= 플레이어를 만나기 직전)에서 깔짝 뛴다. 최고 높이는 플레이어
  // 단일 점프의 1/3. 까마귀의 "보여주기용" 상하 움직임과 달리 이건 판정에도 반영된다 -
  // 판정 박스의 크기(o.w/o.h)와 좌우 여백은 그대로 두고, 뛴 높이만큼 박스가 같이
  // 올라간다 (loop()의 oTop 참고).
  // 2) 핑크똥: 이후에 새로 나오는 것부터 15% 커진다 (이미 화면에 있는 건 그대로).
  // 숫자는 assets/tune.js(있으면) 에서 window.* 로 덮어쓸 수 있게 해뒀다.
  // 테스트 모드에서는 항상 하드 구간으로 시작한다. 실제 보스 도달 시점(약 4분 52초)에는
  // 이미 5,000점을 훨씬 넘겨서 하드 구간이므로, ?boss=1도 같은 조건이어야 테스트가 맞다.
  var HARD_MODE_SCORE = TEST_MODE ? 1 : (window.HARD_MODE_SCORE || 10000);
  var POOP_HARD_SCALE = window.POOP_HARD_SCALE || 1.15;
  // 똥 판정 박스: 그림은 그대로 두고 판정만 줄인다. 핑크똥 그림은 아래가 넓고 위로 갈수록
  // 가늘어지는 모양이라, 그림 사각형 전체를 판정으로 쓰면 "똥 머리 위 허공"에 부딪혀 죽는다.
  // 상단 28%와 좌우 각 18%를 판정에서 제외한다 (1.0 / 0.08 이 예전 값).
  var POOP_HIT_TOP_FRAC = window.POOP_HIT_TOP_FRAC || 0.72;
  var POOP_HIT_SIDE_FRAC = window.POOP_HIT_SIDE_FRAC || 0.18;
  // 콤보(똥 바로 뒤 쥐) 간격을 "점프 한 번의 체공시간" 대비 비율로 정의한다. 픽셀이 아니라
  // 점프 길이 기준이라 속도가 어떻게 바뀌어도 똥과 쥐의 간격이 항상 똑같이 느껴진다.
  var COMBO_GAP_FRAC = window.COMBO_GAP_FRAC || 0.40;
  // 어려운 조합(똥+쥐 콤보)이 나올 확률. 하드 구간에서 서서히 올라간다. 점프 물리는 고정해
  // 두고 "조합"으로만 난이도를 올리기 위한 장치다 (COMBO_RAMP_MULT 배수에서 최대치).
  var DOG_COMBO_CHANCE_MAX = window.DOG_COMBO_CHANCE_MAX || 0.60;
  var COMBO_RAMP_MULT = window.COMBO_RAMP_MULT || 20;
  var MOUSE_HOP_PEAK_FRAC = window.MOUSE_HOP_PEAK_FRAC || (1 / 3); // 플레이어 점프 높이 대비
  var MOUSE_HOP_X_START_FRAC = window.MOUSE_HOP_X_START_FRAC || 0.50; // appW 기준 도약 시작 지점
  var MOUSE_HOP_X_END_FRAC = window.MOUSE_HOP_X_END_FRAC || 0.02; // appW 기준 착지 지점
  var MOUSE_HOP_PEAK = 30; // set for real in layout()
  var MOUSE_HOP_X0 = 0; // set for real in layout()
  var MOUSE_HOP_X1 = 0; // set for real in layout()
  function hardMode(){ return score >= HARD_MODE_SCORE; }
  // 하드 구간 동안 "똥+쥐 콤보"가 나올 확률이 서서히 올라간다. 점프 물리는 고정되어 있어서
  // 각 패턴의 정답과 타이밍 여유는 변하지 않고, 어려운 조합을 만나는 빈도만 높아진다.
  // 즉 "타이밍을 못 잡아서" 죽는 게 아니라 "리듬 타다가 패턴이 바뀌어서" 죽게 된다.
  function comboChance(){
    if (!hardMode()) return DOG_COMBO_CHANCE;
    var span = Math.max(0.001, COMBO_RAMP_MULT - GRAVITY_CAP_MULT);
    var p = Math.min(1, Math.max(0, (speedMultiplier - GRAVITY_CAP_MULT) / span));
    return DOG_COMBO_CHANCE + (DOG_COMBO_CHANCE_MAX - DOG_COMBO_CHANCE) * p;
  }

  // ---- 최종 보스전 (엔딩) ----
  // 2차 사이클의 마지막 곡이 끝나기 5초 전부터 이 순서로 진행된다:
  // 5초 전 : 일반 장애물 생성 중단 + "유모차를 먹어라!" 예고 표시
  // 3초 전 : 유모차 아이템이 공중/바닥 중 한 곳에 딱 한 번만 등장
  // 곡 종료 : Final_Boss 음원이 겹침 없이 바로 시작 + 악마 보스 등장
  // 유모차를 먹으면 무적이 "시간 무한"으로 발동해 보스를 무찌를 수 있고, 못 먹으면 보스에
  // 부딪히는 순간 목숨이 남아 있어도 즉시 게임오버다 (보스는 2단 점프로도 넘을 수 없는 높이).
  var BOSS_IMG = window.BOSS_IMG ? ('data:image/webp;base64,' + window.BOSS_IMG) : 'assets/boss.webp';
  var BOSS_DOWN_IMG = window.BOSS_DOWN_IMG ? ('data:image/webp;base64,' + window.BOSS_DOWN_IMG) : 'assets/boss_down.webp';
  var CLEAR_MSG_IMG = window.CLEAR_MSG_IMG ? ('data:image/webp;base64,' + window.CLEAR_MSG_IMG) : 'assets/clear_msg.webp';
  // 보스가 뜨는 순간에 처음 받아오면 늦게 나타나니 미리 디코딩해두고, 가로/세로 비율도
  // 실제 이미지에서 읽어 쓴다 (나중에 그림을 바꿔도 찌그러지지 않게).
  var bossPreload = new Image(); bossPreload.src = BOSS_IMG;
  var bossDownPreload = new Image(); bossDownPreload.src = BOSS_DOWN_IMG;
  var clearMsgPreload = new Image(); clearMsgPreload.src = CLEAR_MSG_IMG;
  // 진행도 바 오른쪽 끝의 작은 왕 얼굴. 도달할 때까지는 흑백으로 깔려 있다가, 왕이 등장하는
  // 순간 제 색으로 살아난다 (style.css의 #bossProgWrap.arrived 참고).
  var bossProgGoalEl = document.getElementById('bossProgGoal');
  if (bossProgGoalEl) bossProgGoalEl.src = BOSS_IMG;
  function bossAspect(){
    return (bossPreload.naturalWidth && bossPreload.naturalHeight)
      ? (bossPreload.naturalWidth / bossPreload.naturalHeight) : 1.018;
  }
  // 마지막 곡의 "남은 시간"을 기준으로 엔딩이 진행된다. 음악 페이드 아웃이 가장 먼저
  // 시작되고(5초 전), 그 다음 예고(4초 전), 그 다음 유모차(3초 전) 순서다. 예고가 떠 있는
  // 시간은 4초 - 3초 = 1초로, 이전(2초)의 절반이다.
  var FINAL_FADE_LEAD = window.FINAL_FADE_LEAD || 5; // 마지막 곡 남은 시간(초) - 음악 줄이기 시작
  var FINAL_NOTICE_LEAD = window.FINAL_NOTICE_LEAD || 4; // 마지막 곡 남은 시간(초) - 예고 + 장애물 중단
  var FINAL_ITEM_LEAD = window.FINAL_ITEM_LEAD || 3; // 마지막 곡 남은 시간(초) - 유모차 등장
  // 유모차 크기: appH 대비. 0.22에서 0.14로 줄였다. 유모차 그림은 정사각형이라 0.22면
  // 별(트릿) 아이템보다 넓이가 3배 가까이 커서 너무 쉽게 먹혔다. 0.14면 +100점 별 아이템과
  // 화면에서 차지하는 넓이가 거의 같아져서, 제대로 노려야 먹을 수 있다.
  var FINAL_STROLLER_FRAC = window.FINAL_STROLLER_FRAC || 0.14;
  // 유모차가 뜨는 위치. 바닥에서 띄우는 높이를 appH 대비 비율로 적고, 그중 하나가 무작위로
  // 뽑힌다. 기본은 "공중 44%" 와 "바닥 0%" 두 곳이다.
  // 공중(44%): 판정 박스가 닿으려면 22.5%까지 떠야 해서 2단 점프가 필요하다. 보스 속도에서
  // 1단 점프는 그 높이에 머무는 시간이 부족해 닿지 않는다.
  // 바닥(0%): 뛰지 말고 그냥 달려가야 먹는다. 급해서 반사적으로 점프하면 유모차 위를 넘어가
  // 버려서 놓친다 (점프 최고점 40% > 유모차 높이 14%).
  // 즉 "떴다 -> 뛸까 말까"를 순간 판단하는 구간이 된다. 중간 높이(9%)는 서서 달려도 그냥
  // 먹혀서 공짜였기 때문에 뺐다. 값은 assets/tune.js 에서 window.FINAL_STROLLER_LANES 로
  // 바꿀 수 있다 (예: [0.51, 0] 로 하면 공중이 프레임 단위로 어려워진다).
  var FINAL_STROLLER_LANES = window.FINAL_STROLLER_LANES || [0.44, 0];
  var BOSS_H_FRAC = window.BOSS_H_FRAC || 0.72; // 2단 점프 최고점(0.64)보다 커야 벽이 된다
  var CLEAR_MSG_FRAC = window.CLEAR_MSG_FRAC || 0.7254; // 10,000점 돌파(0.4836)보다 50% 큼
  var CLEAR_MSG_TOP_FRAC = window.CLEAR_MSG_TOP_FRAC || 0.11; // 돌파 연출과 같은 높이
  var CLEAR_MSG_DELAY_MS = 700; // 다운된 보스를 먼저 보여주는 시간
  var CLEAR_HOLD_MS = 2600; // 다운/축하 연출 후 점수 화면까지
  // 보스 음악이 0에서 정상 볼륨까지 올라오는 시간. 보스는 등장 후 1초 안에 캐릭터에게
  // 닿으므로, 너무 길게 잡으면 정작 보스와 부딪히는 순간이 조용해진다. 1.2초면 첫
  // 0.5초에 이미 60% 볼륨이라 "갑툭튀"는 사라지고 타격감은 유지된다.
  var BOSS_FADE_IN_MS = window.BOSS_FADE_IN_MS || 1200;
  var KO_SCORE = window.KO_SCORE || 500; // 무적 중 장애물/보스 처치 보상
  var CLEAR_TAG = '클리어'; // 순위표 이름 앞에 붙는 표시

  // 테스트 모드 시작 시점(초). 실제 게임에서 그 구간에 도달하는 시간이다.
  // ?boss=1 -> 292초(4분 52초) = 보스가 등장하는 시점의 속도
  // ?hard=1 -> 140초(2분 20초) = 5,000점을 넘기는 시점의 속도
  // 이 시각부터 시작해서 실제 게임과 똑같이 계속 빨라진다.
  var TEST_START_SEC = TEST_BOSS ? (window.TEST_BOSS_AT_SEC || 292)
    : (window.TEST_HARD_AT_SEC || 140);

  var finalPhase = false; // 예고가 뜬 순간부터 true (일반 장애물 생성 중단)
  var finalFadeStarted = false; // 마지막 곡 페이드 아웃을 시작했는가
  var finalNoticeShown = false;
  var finalItemSpawned = false;
  var strollerTaken = false; // 유모차를 먹었는가 (= 보스를 잡을 수 있는가)
  var infiniteInvincible = false;
  var bossMusicOn = false;
  var bossSpawned = false;
  var cleared = false;
  var lastFinalCleared = false; // 순위 등록 시 "클리어" 표시를 붙일지
  var strollerNoticeEl = null;

  var BASE_SPEED = 260;
  var MAX_SPEED = 560;
  var OBST_GAP_PX = 340; // target pixel gap between obstacles, kept ~constant as speed rises
  var SPEED_WAVE_AMPLITUDE = 0.14; // +/-14% gentle speed-up/slow-down wave layered on top
  var SPEED_WAVE_PERIOD = 7; // seconds per full wave cycle

  var state = 'idle'; // idle | playing | over
  var vy = 0, jumpY = 0, isJumping = false;
  var jumpsUsed = 0;
  var MAX_JUMPS = 2;
  var speed = BASE_SPEED;
  var score = 0;
  var bgPosX = 0;
  var obstacles = [];
  var spawnTimer = 0;
  var nextSpawnIn = 1300;
  var lastTime = 0;
  var rafId = null;
  var charLeftPx = 0;
  var groundTop = 0;

  // ---- speed-scaled jump snap: higher speed = shorter hang time (same jump height) ----
  var BASE_GRAVITY = 2300; // set for real in layout(), scaled to box height
  var GRAVITY_SPEED_SCALE = 0.35; // e.g. speedMultiplier 2.0 -> ~35% more gravity -> snappier, shorter jumps
  // ---- 중력 상한 (아주 중요) ----
  // 스크롤 속도는 MAX_SPEED 때문에 배수 2.45(약 1분 50초)에서 멈춘다. 그런데 중력은 배수를
  // 따라 끝없이 커지게 되어 있었다. 그러면 "세상은 더 이상 빨라지지 않는데 내 점프만 계속
  // 짧아지는" 상태가 되어, 보스 도달 시점에는 장애물이 몸을 스쳐 지나가는 시간(248ms)이
  // 점프 체공(205ms)보다 길어져 어떤 장애물도 사람이 넘을 수 없게 된다 (프레임 단위로
  // 정확히 눌러야만 가능). 그래서 중력도 같이 상한을 둔다. 이 시점 이후로는 점프 궤적이
  // 고정되므로, 같은 패턴의 "정답"(1탭 / 2연타 / 1탭+착지+2연타)이 보스까지 변하지 않는다.
  // 난이도는 대신 조합 빈도(comboChance)로 올린다.
  var GRAVITY_CAP_MULT = window.GRAVITY_CAP_MULT || 4;
  function gravityFor(mult){
    var m = Math.min(mult, GRAVITY_CAP_MULT);
    return BASE_GRAVITY * (1 + GRAVITY_SPEED_SCALE * (m - 1));
  }

  // ---- 개모차 gauge: every clean dodge fills the gauge a little; full gauge auto-triggers
  // invincibility instead of the old dodge-streak that just visually reset (and felt
  // pointless) whenever you died. This way every clean dodge is banked toward something
  // concrete you keep working on, and dying only costs you the current partial fill.
  var dodgeGauge = 0;
  var GAUGE_MAX_BASE = 10; // clean dodges needed to fill the gauge early on
  var GAUGE_MAX_LATE = 15; // ...rising to this many later, once obstacles come in faster
    // (see currentGaugeMax) - keeps invincibility from becoming a
    // free crutch once the higher spawn rate makes clean dodges easy
    // to rack up quickly.
  // 실제 게임이 t초 지점에서 갖고 있는 난이도 배수를 그대로 계산한다 (loop()의 램프와 동일
  // 한 식): 음악 램프(MUSIC_RAMP_FACTOR) + 첫 15초의 1.02/3초 + 70초 이후의 1.04/3초.
  // 테스트 모드에서 시작 배수를 맞추는 데만 쓴다.
  function multiplierAtSecond(t){
    var m = MUSIC_RAMP_FACTOR * Math.pow(EARLY_LEVEL_UP_FACTOR,
      Math.floor(EASE_WINDOW_SECONDS / LEVEL_UP_SECONDS));
    var plateauEnd = EASE_WINDOW_SECONDS + DIFFICULTY_DELAY_SECONDS;
    if (t > plateauEnd) m *= Math.pow(LEVEL_UP_FACTOR, (t - plateauEnd) / LEVEL_UP_SECONDS);
    return m;
  }

  function currentGaugeMax(){
    var diff = Math.min(1, (speedMultiplier - 1) / 1.6);
    return Math.round(GAUGE_MAX_BASE + (GAUGE_MAX_LATE - GAUGE_MAX_BASE) * diff);
  }

  // ---- 개모차 invincibility power-up ----
  var invincible = false;
  var invincibleTimer = 0;
  var INVINCIBLE_DURATION = 5;

  // difficulty ramps 4% every 3s OR every 8 obstacles passed, whichever comes first
  // (~30-40% faster by the 20-30s mark)
  var LEVEL_UP_SECONDS = 3;
  var LEVEL_UP_OBSTACLES = 8;
  var LEVEL_UP_FACTOR = 1.04;
  // gentler ramp for the first EASE_WINDOW_SECONDS, per player feedback that the opening
  // was too hard - then the ramp is paused entirely (plateau, no further speed-up at all)
  // until DIFFICULTY_DELAY_SECONDS have passed, so the escalation originally reached
  // around the 15s mark now shows up around 1:10 (70s) instead.
  var EASE_WINDOW_SECONDS = 15;
  var DIFFICULTY_DELAY_SECONDS = 55; // 15 + 55 = 70s
  var EARLY_LEVEL_UP_FACTOR = 1.02;
  var speedMultiplier = 1;
  var gameTime = 0;
  var obstaclesPassed = 0;
  var lastLevelTime = 0;
  var lastLevelCount = 0;
  var wasRampActive = true;
  // the BGM's main track picks up to a faster tempo right around 0:15 into the song - rather
  // than a single jarring jump right at that instant, we smoothly ramp an extra speed boost
  // in underneath, starting a couple seconds in and finishing by 0:15, so the game already
  // *feels* sped up by the time the music actually kicks in (on top of the slow, steady
  // LEVEL_UP_FACTOR drip that keeps running the whole time).
  var MUSIC_RAMP_START = 2;
  var MUSIC_RAMP_END = 15;
  var MUSIC_RAMP_FACTOR = 1.32;
  var musicRampProgress = 0;

  // ---- Top 10 leaderboard ----
  // Backed by Firebase Firestore (no-login, public read / rule-validated write) instead of
  // the old Google Apps Script + Sheet combo, which was prone to silent deployment breakage
  // (the exec URL started 404ing) and slow cold-starts. To moderate bad entries, open the
  // "scores" collection in the Firebase console (Firestore Database > 데이터) and delete the
  // row directly - same manual workflow as before, just in a different console.
  var firebaseConfig = {
    apiKey: "AIzaSyAKW4uUsBQxaGOujIi4gS95TsvQnamkX_g",
    authDomain: "cream-runner.firebaseapp.com",
    projectId: "cream-runner",
    storageBucket: "cream-runner.firebasestorage.app",
    messagingSenderId: "941210359174",
    appId: "1:941210359174:web:61e4531cbeef98e9d4c807"
  };
  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  // KakaoTalk/Instagram in-app browsers (and some carrier networks) often block or badly
  // throttle WebSockets, which is what Firestore's realtime channel tries first by default -
  // when that happens the SDK has to detect the failure and fall back to long-polling, and
  // that detection/fallback dance is exactly what was showing up as "느리다 / 순위를 불러오지
  // 못했어요 / 재시작해야 갱신됨" for players opening the game from a chat app link. Forcing
  // auto-detected long-polling skips that slow negotiation and connects reliably in those
  // in-app browsers too, at the cost of a small amount of extra latency on a normal network.
  db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });
  var SCORES_COLLECTION = 'scores';
  // visitor counter: a completely separate collection/documents from `scores`, written with
  // atomic increments (no read-before-write needed), so it never touches or competes with
  // the leaderboard's read/write path or its performance.
  var VISITS_COLLECTION = 'visits';
  var lastFinalScore = null;
  var lastFinalDate = null;

  function formatToday(){
    var d = new Date();
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '.' + m + '.' + day;
  }

  // key for "today"'s visit-counter document, e.g. "2026-09-19"
  function formatDateKey(){
    var d = new Date();
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  // display-only formatting for the visit-counter badge: the real count keeps accumulating
  // exactly (stored/incremented as a plain integer in Firestore), this only shortens how big
  // numbers are SHOWN so the badge never breaks its layout - e.g. 1234 -> "1.2K", 15000 -> "15.0K".
  function formatVisitCount(n){
    if (n == null) return '-';
    if (n < 1000) return String(n);
    return (n / 1000).toFixed(1) + 'K';
  }

  function renderLeaderboard(listEl, statusEl, entries, highlight){
    listEl.innerHTML = '';
    if (!entries.length){
      statusEl.hidden = false;
      statusEl.textContent = '아직 기록이 없어요. 첫 기록의 주인공이 되어보세요!';
      return;
    }
    statusEl.hidden = true;
    entries.forEach(function(e, i){
      var li = document.createElement('li');
      if (highlight && lastFinalScore !== null && e.score === lastFinalScore && e.date === lastFinalDate){
        li.style.background = 'rgba(240,180,41,.16)';
        li.style.borderRadius = '8px';
      }
      var rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = (i + 1) + '위';
      var name = document.createElement('span');
      name.className = 'lb-name';
      // 이름이 "클리어 "로 시작하면 그 부분만 떼서 배지로 보여준다 (저장은 이름 앞에 붙임).
      var rawName = String(e.name == null ? '' : e.name);
      if (rawName.indexOf(CLEAR_TAG) === 0){
        var badge = document.createElement('span');
        badge.className = 'lb-clear';
        badge.textContent = CLEAR_TAG;
        name.appendChild(badge);
        name.appendChild(document.createTextNode(rawName.slice(CLEAR_TAG.length).replace(/^\s+/, '')));
      } else {
        name.textContent = rawName;
      }
      var sc = document.createElement('span');
      sc.className = 'lb-score';
      sc.textContent = e.score + '점';
      var dt = document.createElement('span');
      dt.className = 'lb-date';
      dt.textContent = e.date || '';
      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(sc);
      li.appendChild(dt);
      listEl.appendChild(li);
    });
  }

  function showLoading(){
    if (loadingOverlay) loadingOverlay.hidden = false;
  }
  function hideLoading(){
    if (loadingOverlay) loadingOverlay.hidden = true;
  }

  // the leaderboard backend can occasionally be slow to answer (cold network, etc.) -
  // without a hard timeout, a stalled request left people staring at a screen that never
  // finished appearing (see showLoading/hideLoading below). This caps how long any single
  // call is allowed to hang before we give up on it and show the "couldn't load" state
  // instead - it never rejects, it just resolves with null once the time is up, so callers
  // can gate revealing a screen on it without ever hanging forever.
  var FETCH_TIMEOUT_MS = 15000;

  function withTimeout(promise, timeoutMs){
    return new Promise(function(resolve){
      var settled = false;
      var timer = setTimeout(function(){
        if (settled) return;
        settled = true;
        resolve(null);
      }, timeoutMs);
      promise.then(function(value){
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, function(){
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  function loadLeaderboard(limitN){
    return withTimeout(
      db.collection(SCORES_COLLECTION).orderBy('score', 'desc').limit(limitN).get().then(function(snapshot){
        var arr = [];
        snapshot.forEach(function(doc){ arr.push(doc.data()); });
        return arr;
      }),
      FETCH_TIMEOUT_MS
    );
  }

  // returns a promise that always resolves (never rejects) once the fetch attempt is
  // fully settled (success, failure, or timeout) - callers gate revealing a screen on
  // this promise so the screen only ever appears once the leaderboard call is truly done,
  // one way or the other, instead of appearing right away with a buried "불러오는 중..."
  // line that's easy to miss while the fetch is still running underneath it.
  function loadTop3(){
    top3Status.hidden = false;
    top3Status.textContent = '불러오는 중...';
    return loadLeaderboard(3).then(function(top3){
      if (top3 === null){
        top3Status.hidden = false;
        top3Status.textContent = '순위를 불러오지 못했어요.';
        return;
      }
      renderLeaderboard(top3List, top3Status, top3, false);
    });
  }

  function loadTop10AndCheckRecord(finalScore, finalDate){
    top10Status.hidden = false;
    top10Status.textContent = '불러오는 중...';
    newRecordBox.hidden = true;
    return loadLeaderboard(10).then(function(top10){
      if (top10 === null){
        top10Status.hidden = false;
        top10Status.textContent = '순위를 불러오지 못했어요.';
        return;
      }
      renderLeaderboard(top10List, top10Status, top10, true);

      var qualifies = top10.length < 10 || finalScore > (top10[9] ? top10[9].score : -Infinity);
      if (qualifies && !TEST_MODE){
        newRecordLabel.textContent = '🎉 TOP 10 진입! 이름을 남겨보세요.';
        newRecordBox.hidden = false;
        nameInput.value = '';
        nameInput.disabled = false;
        submitNameBtn.disabled = false;
        submitNameBtn.textContent = '등록';
      }
    });
  }

  function submitScore(){
    var name = (nameInput.value || '').trim() || '익명';
    // "클리어" 표시는 이름 앞에 붙여서 저장한다 (Firebase 보안 규칙을 건드리지 않아도 되게).
    // 클리어하지 않은 사람이 이름에 직접 "클리어"를 넣어 위조하는 것은 떼어내서 막는다.
    while (name.indexOf(CLEAR_TAG) === 0) name = name.slice(CLEAR_TAG.length).replace(/^\s+/, '');
    if (!name) name = '익명';
    name = name.slice(0, 8);
    var storedName = lastFinalCleared ? (CLEAR_TAG + ' ' + name) : name;
    if (TEST_MODE){
      // 테스트 모드 점수는 실제 순위표에 넣지 않는다.
      newRecordLabel.textContent = '테스트 모드에서는 순위에 등록되지 않습니다.';
      nameInput.hidden = true;
      submitNameBtn.hidden = true;
      return;
    }
    submitNameBtn.disabled = true;
    nameInput.disabled = true;
    submitNameBtn.textContent = '등록 중...';
    withTimeout(
      db.collection(SCORES_COLLECTION).add({ name: storedName, score: lastFinalScore, date: lastFinalDate }),
      15000
    ).then(function(ref){
      if (ref === null){
        throw new Error('timeout');
      }
      return loadLeaderboard(10);
    }).then(function(top10){
      renderLeaderboard(top10List, top10Status, top10 || [], true);
      newRecordLabel.textContent = '✅ 등록 완료!';
      nameInput.hidden = true;
      submitNameBtn.hidden = true;
    }).catch(function(){
      submitNameBtn.disabled = false;
      nameInput.disabled = false;
      submitNameBtn.textContent = '등록';
      alert('등록에 실패했어요. 잠시 후 다시 시도해주세요.');
    });
  }

  if (submitNameBtn) submitNameBtn.addEventListener('click', submitScore);
  if (nameInput){
    nameInput.addEventListener('keydown', function(e){
      if (e.key === 'Enter') submitScore();
    });
  }

  // ---- visitor counter (오늘 접속 / 누적 접속) ----
  // Deliberately kept 100% independent of the leaderboard flow above: it never gates
  // showLoading/hideLoading or the start screen reveal, and any failure here is swallowed
  // silently (the badge just stays hidden) so it can never slow down or break page load,
  // the leaderboard, or score submission. Runs exactly once per page load (not on every
  // return to the start screen after a run), so replaying the game never inflates it.
  function recordAndShowVisitCounts(){
    try {
      var todayKey = formatDateKey();
      var totalRef = db.collection(VISITS_COLLECTION).doc('total');
      var todayRef = db.collection(VISITS_COLLECTION).doc(todayKey);
      var inc = firebase.firestore.FieldValue.increment(1);
      // atomic increments - no read-before-write needed, so this is a single cheap write
      // per document regardless of how many visits have accumulated so far.
      var totalWrite = totalRef.set({ count: inc }, { merge: true }).catch(function(){});
      var todayWrite = todayRef.set({ count: inc, date: todayKey }, { merge: true }).catch(function(){});

      // wait for the increments to actually settle on the server before reading them back.
      // reading immediately after an increment() write returns the SDK's local optimistic
      // estimate - which assumes a base of 0 when the true prior value isn't cached on this
      // page load yet - instead of the real accumulated total, so the badge would otherwise
      // always show "1" no matter how many visits have actually happened. This ordering only
      // delays the badge itself; it still never blocks or gates anything else on the page.
      Promise.all([totalWrite, todayWrite]).then(function(){
        return Promise.all([
          withTimeout(totalRef.get(), FETCH_TIMEOUT_MS),
          withTimeout(todayRef.get(), FETCH_TIMEOUT_MS)
        ]);
      }).then(function(results){
        if (!visitBadge) return;
        var totalSnap = results[0];
        var todaySnap = results[1];
        var totalCount = (totalSnap && totalSnap.exists) ? totalSnap.data().count : null;
        var todayCount = (todaySnap && todaySnap.exists) ? todaySnap.data().count : null;
        if (totalCount == null && todayCount == null) return; // couldn't load - just skip it, non-critical
        visitTodayEl.textContent = '오늘 ' + formatVisitCount(todayCount);
        visitTotalEl.textContent = '누적 ' + formatVisitCount(totalCount);
        visitBadge.hidden = false;
      }).catch(function(){ /* non-critical - leave badge hidden */ });
    } catch (e) { /* never let this interfere with the rest of page startup */ }
  }

  // start screen stays hidden (see index.html) until the initial TOP3 fetch has fully
  // settled - the spinner overlay is what's visible in the meantime.
  showLoading();
  loadTop3().then(function(){
    hideLoading();
    startScreen.hidden = false;
  });
  // fired in parallel, not chained - never delays the loading overlay / start screen above.
  if (!TEST_MODE) recordAndShowVisitCounts();

  function layout(){
    var rect = app.getBoundingClientRect();
    var appW = rect.width;
    var appH = rect.height;

    GROUND_H = appH * 0.15;
    groundTop = appH - GROUND_H;
    charLeftPx = appW * 0.1;

    // character shrunk ~15% (0.46 -> 0.39) and obstacles bumped up ~10-15% below so the two
    // sizes read as more evenly matched, instead of the character towering over everything.
    var charH = appH * 0.39;
    var charW = charH * SPRITE_ASPECT;
    character.style.width = charW + 'px';
    character.style.height = charH + 'px';
    character.style.left = charLeftPx + 'px';
    character.style.bottom = GROUND_H + 'px';
    charOffsetX = (LIFE_STATE_CFG[lifeState] || LIFE_STATE_CFG[3]).offsetXFrac * charW;
    applyCharTransform();

    ground.style.height = GROUND_H + 'px';

    OBST_POOP_H = appH * 0.10;
    STAR_H = appH * 0.195; // 50% bigger than the original 0.13 - easier to see and grab
    BONUS_ITEM_H = appH * 0.185; // 여자/남자 복귀 보너스 아이템 - star와 비슷한 크기감
    STAR_ELEV_HIGH = charH + appH * 0.12;
    // pinned to a fixed fraction of appH (not charH) so shrinking the character doesn't
    // drag this up along with it - it needs to sit low enough to clearly overlap the
    // standing (non-jumping) hitbox so it's still grabbable on the ground lane without
    // jumping, just not literally touching the ground.
    STAR_ELEV_MID = appH * 0.09;
    DOG_H = appH * 0.15;
    CROW_H = appH * 0.215;
    CROW_LIFT_MAX = appH * 0.62;
    CROW_ARC_RANGE = appW * 0.6;
    DOG_EXTRA_SPEED = appW * 0.09; // dog closes in faster than plain scroll speed (standalone dog only)
    OBST_GAP_PX = appW * 0.46;

    // physics scaled to box height so the jump arc feels the same on every device.
    // double jump reliably reaches JUMP_PEAK_2 no matter when the 2nd press lands (see doJump).
    var gravityFactor = 7.83; // lower = longer, floatier hang time (~+0.1s airtime vs. before)
    BASE_GRAVITY = gravityFactor * appH;
    GRAVITY = gravityFor(speedMultiplier);
    JUMP_PEAK_1 = appH * 0.40;
    JUMP_PEAK_2 = appH * 0.64;

    MOUSE_HOP_PEAK = JUMP_PEAK_1 * MOUSE_HOP_PEAK_FRAC;
    MOUSE_HOP_X0 = appW * MOUSE_HOP_X_START_FRAC;
    MOUSE_HOP_X1 = appW * MOUSE_HOP_X_END_FRAC;

    BASE_SPEED = Math.max(150, appW * 0.368 * 1.05);
    MAX_SPEED = Math.max(360, appW * 0.9 * 1.05);

    // 하단 여백이 아주 좁은 화면(가로로 긴 데스크톱 창처럼 #app이 높이를 거의 다 먹는 경우)
    // 에서는 게이지 + 진행도 바 + 점프 버튼이 다 들어갈 자리가 없다. 그럴 때는 진행도 바를
    // 숨겨서 점프 버튼을 가리지 않게 한다 (게이지는 게임 진행에 직접 쓰이므로 유지).
    if (bossProgWrapEl && bottomSpace){
      bossProgWrapEl.hidden = bottomSpace.getBoundingClientRect().height < 165;
    }
  }
  window.addEventListener('resize', layout);

  function setCharImage(jumping){
    // while invincible, the whole family+dog art takes over instead of the normal run/jump
    // frames - the run-loop keeps calling this on every landing, so it has to keep winning
    // out over jumping/not-jumping for the whole duration of the power-up.
    charImg.src = invincible ? IMG_INVINCIBLE_CHAR : (jumping ? jumpImgForState(lifeState) : runImgForState(lifeState));
  }

  function reset(){
    obstacles.forEach(function(o){ o.el.remove(); });
    obstacles = [];
    speed = BASE_SPEED;
    score = 0;
    vy = 0; jumpY = 0; isJumping = false; jumpsUsed = 0;
    spawnTimer = 0;
    nextSpawnIn = 1300;
    lastSpawnType = null;
    speedMultiplier = 1;
    gameTime = 0;
    obstaclesPassed = 0;
    lastLevelTime = 0;
    lastLevelCount = 0;
    wasRampActive = true;
    musicRampProgress = 0;
    dodgeGauge = 0;
    invincible = false;
    invincibleTimer = 0;
    lifeState = 3;
    hitInvuln = false;
    hitInvulnTimer = 0;
    bonusDueAt = null;
    bonusSpawned = false;
    milestoneIdx = 0;
    finalPhase = false;
    finalFadeStarted = false;
    finalNoticeShown = false;
    finalItemSpawned = false;
    strollerTaken = false;
    infiniteInvincible = false;
    bossSpawned = false;
    cleared = false;
    hideStrollerNotice();
    bossProgSet(0);
    if (bossProgWrapEl) bossProgWrapEl.classList.remove('arrived');
    character.classList.remove('invincible', 'invincible-warning');
    if (invincibleHud) invincibleHud.hidden = true;
    if (charCountdown) charCountdown.hidden = true;
    updateGaugeUI();
    character.classList.add('run');
    setCharImage(false);
    scoreVal.textContent = '0';
    app.classList.remove('hit-shake');
    if (hitFlashEl) hitFlashEl.classList.remove('flash');
    if (effectsLayer) effectsLayer.innerHTML = '';
    if (crowWarningEl) crowWarningEl.hidden = true;
    if (crowWarnTimer) { clearTimeout(crowWarnTimer); crowWarnTimer = null; }
    crowPending = false;
    // 테스트 모드: 실제 게임의 해당 구간 속도로 시작한다. gameTime까지 그 시점으로 옮겨서
    // 장애물 종류 해금(까마귀 10초 이후 등)과 난이도 램프가 실제 게임과 똑같이 이어진다.
    if (TEST_MODE){
      gameTime = TEST_START_SEC;
      musicRampProgress = 1; // 음악 램프는 이미 다 적용된 상태
      speedMultiplier = multiplierAtSecond(TEST_START_SEC);
      lastLevelTime = gameTime;
      lastLevelCount = 0;
    }
    layout();
  }

  function startGame(){
    // belt-and-suspenders: if the name input still has focus from the previous
    // game-over screen, drop focus before restarting so no lingering iOS zoom/keyboard
    // state carries into the new game.
    if (nameInput && document.activeElement === nameInput) nameInput.blur();
    ensureAudio();
    startMusic();
    reset();
    state = 'playing';
    startScreen.hidden = true;
    gameOverScreen.hidden = true;
    lastTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  // ---- crow warning + delayed spawn: a 2-second blinking warning fires first, and only once
  // it finishes does the actual crow obstacle get created (from off-screen right, diving in) -
  // the main obstacle spawner is paused (crowPending) for those 2 seconds so nothing else can
  // sneak in and create an unfair overlap while the warning is showing. ----
  var CROW_WARN_TIME = 2000;
  var crowWarnTimer = null;
  var crowPending = false;

  function beginCrowSequence(){
    crowPending = true;
    if (crowWarningEl) crowWarningEl.hidden = false;
    if (crowWarnTimer) clearTimeout(crowWarnTimer);
    crowWarnTimer = setTimeout(function(){
      crowWarnTimer = null;
      if (crowWarningEl) crowWarningEl.hidden = true;
      if (state === 'playing'){
        spawnGroundObstacle('crow');
        // pick a normal gap for whatever spawns next, starting the countdown fresh now that
        // the crow has actually appeared (the 2s warning itself doesn't eat into the pacing).
        var gapPx = OBST_GAP_PX * (0.82 + Math.random() * 0.36);
        nextSpawnIn = Math.max(0.85, gapPx / speed) * 1000;
        spawnTimer = 0;
      }
      crowPending = false;
    }, CROW_WARN_TIME);
  }

  // the actual impact (visible spark + hit-stop freeze + shake) has already played out by
  // the time this runs (see triggerHit) - this just shows the score screen afterward
  function endGame(isClear){
    state = 'over';
    if (!isClear) playGameOverSfx();

    var finalScore = Math.floor(score);
    finalScoreEl.textContent = String(finalScore);

    lastFinalScore = finalScore;
    lastFinalDate = formatToday();
    lastFinalCleared = !!isClear;
    newRecordBox.hidden = true;
    nameInput.hidden = false;
    submitNameBtn.hidden = false;
    // 점수/순위/이름 입력은 게임오버와 완전히 동일하고, 실망한 표정 그림과 문구만 바꾼다.
    if (gameoverPic) gameoverPic.hidden = !!isClear;
    if (gameOverTitleEl) gameOverTitleEl.textContent = isClear ? '완벽한 산책이었어!' : '크림아! 발 닦자!';

    // the game-over screen itself only appears once the TOP10 fetch has fully settled -
    // the spinner overlay covers the wait instead, so it's never mistaken for a freeze.
    showLoading();
    loadTop10AndCheckRecord(finalScore, lastFinalDate).then(function(){
      hideLoading();
      gameOverScreen.hidden = false;
    });
  }

  var HIT_STOP_MS = 420; // how long the freeze/flash/shake plays before the score screen shows

  function spawnImpactEffect(cx, cy){
    if (!effectsLayer) return;
    var el = document.createElement('div');
    el.className = 'impact-burst';
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    effectsLayer.appendChild(el);
    setTimeout(function(){ el.remove(); }, 500);
  }

  function spawnNearMissEffect(cx, cy){
    if (!effectsLayer) return;
    var el = document.createElement('div');
    el.className = 'near-miss-spark';
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    el.textContent = '★';
    effectsLayer.appendChild(el);
    setTimeout(function(){ el.remove(); }, 600);
  }

  // "+100" popup where a bonus star was collected
  function spawnStarPopFx(cx, cy){
    if (!effectsLayer) return;
    var el = document.createElement('div');
    el.className = 'star-pop-fx';
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    el.textContent = '+100';
    effectsLayer.appendChild(el);
    setTimeout(function(){ el.remove(); }, 600);
  }

  // "+50" popup for KO'ing an obstacle during invincibility - randomized neon color
  // (pink/green/orange) each time so the combo feels bright and varied, distinct from the
  // star pickup's gold "+100"
  var KO_POP_COLORS = ['c-pink', 'c-green', 'c-orange'];
  function spawnKoPopFx(cx, cy){
    if (!effectsLayer) return;
    var el = document.createElement('div');
    var color = KO_POP_COLORS[Math.floor(Math.random() * KO_POP_COLORS.length)];
    el.className = 'ko-pop-fx ' + color;
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    el.textContent = '+' + KO_SCORE;
    effectsLayer.appendChild(el);
    setTimeout(function(){ el.remove(); }, 550);
  }


  // called the instant a collision is detected: freezes gameplay immediately (hit-stop),
  // shows exactly where contact happened, shakes/flashes the screen for impact, switches
  // the character to its gameover pose right away - then, once the player has actually had
  // a moment to see all that, hands off to endGame() for the score screen.
  function triggerHit(cx, cy){
    if (state !== 'playing') return;
    state = 'hit';
    stopMusic();
    playHitSfx();
    character.classList.remove('run');
    charImg.src = IMG_GAMEOVER;
    spawnImpactEffect(cx, cy);
    app.classList.add('hit-shake');
    if (hitFlashEl) hitFlashEl.classList.add('flash');
    setTimeout(function(){
      app.classList.remove('hit-shake');
      if (hitFlashEl) hitFlashEl.classList.remove('flash');
      endGame();
    }, HIT_STOP_MS);
  }

  var LIFE_LOSS_FLASH_MS = 260; // shorter than the full HIT_STOP_MS gameover freeze - the
    // run keeps going, this is just a quick flash/shake beat
  // called when a hit happens while more than one family member is still present: the
  // family "demotes" one level (온가족 -> 여자+강아지 -> 강아지 혼자) instead of ending the
  // run outright - only a hit while the dog is already alone (lifeState 1) triggers the
  // real triggerHit()/endGame() game-over flow above.
  function triggerLifeLoss(cx, cy){
    if (state !== 'playing') return;
    playHitSfx();
    spawnImpactEffect(cx, cy);
    app.classList.remove('hit-shake');
    void app.offsetWidth;
    app.classList.add('hit-shake');
    if (hitFlashEl){
      hitFlashEl.classList.remove('flash');
      void hitFlashEl.offsetWidth;
      hitFlashEl.classList.add('flash');
    }
    setTimeout(function(){
      app.classList.remove('hit-shake');
      if (hitFlashEl) hitFlashEl.classList.remove('flash');
    }, LIFE_LOSS_FLASH_MS);

    lifeState = Math.max(1, lifeState - 1);
    charOffsetX = LIFE_STATE_CFG[lifeState].offsetXFrac * character.offsetWidth;
    applyCharTransform();
    setCharImage(isJumping);

    // brief grace period so the same obstacle can't immediately cause a second hit
    hitInvuln = true;
    hitInvulnTimer = HIT_INVULN_DURATION;

    // any bonus item already on screen was for whoever was lost BEFORE this hit - that
    // target is now stale, so clear it and reschedule fresh from this collision (the
    // "가장 최근 충돌로부터 25초 뒤" rule applies to every life-loss, not just the first).
    for (var bi = obstacles.length - 1; bi >= 0; bi--){
      if (obstacles[bi].type === 'bonus'){
        obstacles[bi].el.remove();
        obstacles.splice(bi, 1);
      }
    }
    bonusSpawned = false;
    bonusDueAt = gameTime + LIFE_RECOVERY_DELAY;
  }

  function doJump(){
    if (state !== 'playing' || jumpsUsed >= MAX_JUMPS) return;
    jumpsUsed++;
    isJumping = true;
    // deterministic apex: whenever the 2nd jump is pressed (early or late), it always
    // gives you enough velocity to reach JUMP_PEAK_2 from wherever you currently are -
    // no more "pressed it too early and barely went any higher" luck.
    var targetPeak = jumpsUsed >= 2 ? JUMP_PEAK_2 : JUMP_PEAK_1;
    var neededHeight = Math.max(0, targetPeak - jumpY);
    vy = Math.sqrt(2 * GRAVITY * neededHeight);
    character.classList.remove('run');
    setCharImage(true);
    playJumpSfx();
  }

  // picks an obstacle type, gradually mixing in tougher variety as the run gets harder.
  // obstacle roster:
  // 💩 poop - flat & small, ground-based, always has to be jumped, lethal
  // 🐶 dog(now 🐭 mouse art) - ground-based, also has to be jumped, but closes in
  // faster than the scroll speed so its timing feels different from poop
  // ⭐ star - flies at head height in the air lane; a pure +100 bonus pickup now, not a
  // hazard, so it's totally fine for it to line up with a ground obstacle -
  // no adjacency restriction needed the way the old crow hazard required.
  var lastSpawnType = null;
  var DOG_COMBO_CHANCE = 0.38; // chance a poop gets a dog paired tightly right behind it
    // (one jump clears both) instead of the dog ever showing up
    // at its own random distance from a poop that's still on screen

  function pickObstacleType(){
    var diff = Math.min(1, (speedMultiplier - 1) / 1.6);
    // the bonus star shows up at a steady, generous rate once the run gets going - no ramp
    // needed since grabbing (or missing) it never affects difficulty or safety.
    var wStar = (gameTime > 4) ? 0.24 : 0;
    // a standalone dog (its own random spacing) is only offered when the previous obstacle
    // was NOT a poop, so it never lands at an unpredictable distance from one; when it
    // should follow a poop, that's handled as a tightly-paired "combo" inside
    // spawnGroundObstacle instead, so the dog is always either combined with a poop
    // (one jump) or fully on its own.
    var wDog = (gameTime > 5 && lastSpawnType !== 'poop' && lastSpawnType !== 'dog') ? (0.14 + 0.08 * diff) : 0;
    // crow: a real ground-level hazard (taller than the dog, forces an actual jump) mixed
    // into the same pool as everything else, so it automatically gets the same safe-gap
    // spacing as poop/dog - never back-to-back with another crow.
    var wCrow = (gameTime > 10 && lastSpawnType !== 'crow') ? (0.16 + 0.06 * diff) : 0;
    var wPoop = Math.max(0.2, 1 - wStar - wDog - wCrow);
    var total = wStar + wDog + wCrow + wPoop;
    var r = Math.random() * total;
    var type;
    if ((r -= wStar) < 0) type = 'star';
    else if ((r -= wDog) < 0) type = 'dog';
    else if ((r -= wCrow) < 0) type = 'crow';
    else type = 'poop';
    return type;
  }

  // 개모차 gauge: fills a little on every clean dodge; once it's full it auto-activates
  // invincibility (see activateInvincibility) and resets to empty. Replaces the old
  // ground-spawned pickup entirely - the reward is now earned through play, not luck.
  function updateGaugeUI(){
    if (!gaugeFill) return;
    var gaugeMax = currentGaugeMax();
    var pct = Math.min(100, (dodgeGauge / gaugeMax) * 100);
    gaugeFill.style.width = pct + '%';
    gaugeFill.classList.toggle('full', dodgeGauge >= gaugeMax);
    // rider rides right along the leading edge of the fill - clamped a little inside the
    // 0-100 range so it never sits half-off the end of the bar.
    if (gaugeRider) gaugeRider.style.left = Math.max(3, Math.min(97, pct)) + '%';
  }

  function addGaugeDodge(){
    if (invincible) return; // already active, no point stacking
    dodgeGauge++;
    if (dodgeGauge >= currentGaugeMax()){
      dodgeGauge = 0;
      activateInvincibility();
      app.classList.remove('gauge-burst');
      void app.offsetWidth; // restart the flash animation
      app.classList.add('gauge-burst');
    }
    updateGaugeUI();
  }

  // kicks off an obstacle's fly-off-and-spin KO animation with a randomized direction
  // (left/right AND up/down) and a fast randomized spin, via CSS custom properties that
  // the .obstacle-ko keyframes read (see stylesheet) - so every KO flings a different way
  // instead of always the same fixed straight-up pop. Removes the element once the
  // animation has finished playing; takes the element itself, not the obstacle record,
  // since the record is already spliced out of `obstacles` by the caller.
  function triggerObstacleKO(el){
    var angle = Math.random() * Math.PI * 2; // full 360: left/right AND up/down, randomized
    var dist = 130 + Math.random() * 90;
    var dx = Math.cos(angle) * dist;
    var dy = Math.sin(angle) * dist - 60; // bias upward a bit so it still reads as "launched"
    var spinDeg = (720 + Math.random() * 540) * (Math.random() < 0.5 ? -1 : 1);
    el.style.setProperty('--dx', dx.toFixed(1) + 'px');
    el.style.setProperty('--dy', dy.toFixed(1) + 'px');
    el.style.setProperty('--spin', spinDeg.toFixed(0) + 'deg');
    el.classList.add('obstacle-ko');
    playObstacleKoSfx();
    setTimeout(function(){ el.remove(); }, 570);
  }

  function activateInvincibility(){
    invincible = true;
    invincibleTimer = INVINCIBLE_DURATION;
    character.classList.add('invincible');
    character.classList.remove('invincible-warning');
    charImg.src = IMG_INVINCIBLE_CHAR;
    if (invincibleHud){
      invincibleHud.hidden = false;
      invincibleTimeEl.textContent = INVINCIBLE_DURATION;
    }
    if (charCountdown){
      charCountdown.hidden = false;
      if (charCountdownNum) charCountdownNum.textContent = INVINCIBLE_DURATION;
    }
    playPickupSfx();
  }

  // 유모차 아이템(최종 보스 직전)으로 발동하는 무적: 시간 제한이 없다. 기존 게이지 무적의
  // 카운트다운 로직과 섞이지 않게 별도 플래그(infiniteInvincible)로 관리하고, 남은 초 대신
  // 무한 기호를 띄운다.
  function activateInfiniteInvincibility(){
    invincible = true;
    infiniteInvincible = true;
    invincibleTimer = 0;
    character.classList.add('invincible');
    character.classList.remove('invincible-warning');
    charImg.src = IMG_INVINCIBLE_CHAR;
    if (invincibleHud){
      invincibleHud.hidden = false;
      invincibleTimeEl.textContent = '∞';
    }
    if (charCountdown){
      charCountdown.hidden = false;
      if (charCountdownNum) charCountdownNum.textContent = '∞';
    }
    playPickupSfx();
    playMilestoneSfx();
  }

  // spawns the bonus item (크림이네 트릿 jar art) directly in the air lane (no warning delay
  // needed - it's not a hazard, so there's nothing to telegraph), with the CSS
  // bob/twinkle/pop-in animations. Randomly picks between a "sky" and a "mid-air" flight
  // height each time so it doesn't always fly in at the same spot - just never on the ground.
  function spawnStarNow(){
    var rect = app.getBoundingClientRect();
    var x = rect.width + 20;
    var sh = STAR_H;
    var sw = sh * STAR_ASPECT;
    var elev = Math.random() < 0.5 ? STAR_ELEV_HIGH : STAR_ELEV_MID;
    var el = document.createElement('div');
    el.className = 'obstacle star';
    el.style.left = x + 'px';
    el.style.width = sw + 'px';
    el.style.height = sh + 'px';
    el.style.bottom = (GROUND_H + elev) + 'px';
    el.innerHTML =
      '<div class="star-behind"></div>' +
      '<img class="star-img" src="' + IMG_STAR_ITEM + '" alt="">';
    obstaclesLayer.appendChild(el);
    obstacles.push({ el: el, x: x, w: sw, h: sh, elevation: elev, type: 'star' });
    lastSpawnType = 'star';
  }

  // recovery bonus item: floats in the air lane exactly like the treat-jar star (same
  // bob/twinkle/pop-in visuals, reused via the 'obstacle star' CSS class) but carries the
  // missing family member's art and, on pickup, restores them instead of just scoring.
  function spawnBonusItemNow(target){
    var rect = app.getBoundingClientRect();
    var x = rect.width + 20;
    var sh = BONUS_ITEM_H;
    var sw = sh; // item_woman/item_man art sits on a square canvas
    var elev = Math.random() < 0.5 ? STAR_ELEV_HIGH : STAR_ELEV_MID;
    var el = document.createElement('div');
    el.className = 'obstacle star';
    el.style.left = x + 'px';
    el.style.width = sw + 'px';
    el.style.height = sh + 'px';
    el.style.bottom = (GROUND_H + elev) + 'px';
    var src = target === 'woman' ? ITEM_IMG_WOMAN : ITEM_IMG_MAN;
    el.innerHTML =
      '<div class="star-behind"></div>' +
      '<img class="star-img" src="' + src + '" alt="">';
    obstaclesLayer.appendChild(el);
    obstacles.push({ el: el, x: x, w: sw, h: sh, elevation: elev, type: 'bonus', target: target });
    lastSpawnType = 'bonus';
    bonusSpawned = true;
  }

  // 오빠!/엄마! call message: a purely cosmetic pop-up above the current character's head,
  // celebrating the reunion - never added to `obstacles`, so it can never be hit, block a
  // jump, or factor into gameover/collision detection in any way.
  function spawnCallMessageFx(target){
    if (!effectsLayer) return;
    var rect = app.getBoundingClientRect();
    var appH = rect.height;
    var w = appH * 0.26;
    var h = w * 0.53; // matches the call-message banner art's ~260x137 aspect ratio
    // "여자 보너스"(엄마 복귀, 강아지 혼자 -> 여자+강아지) -> 엄마! shown over the dog's head;
    // "남자 보너스"(오빠 복귀, 여자+강아지 -> 온가족) -> 오빠! shown over the woman's head.
    var src = target === 'woman' ? CALL_IMG_MOM : CALL_IMG_OPPA;
    var cx = charLeftPx + charOffsetX + character.offsetWidth * 0.5;
    var cy = groundTop - jumpY - character.offsetHeight * 0.92;
    var el = document.createElement('div');
    el.className = 'call-message-fx';
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.innerHTML = '<img src="' + src + '" alt="" style="width:100%;height:100%;object-fit:contain;">';
    effectsLayer.appendChild(el);
    setTimeout(function(){ el.remove(); }, 1600);
  }

  // 점수 구간 돌파 축하 이미지: 플레이 화면(#app) 왼쪽 상단, 캐릭터 뒷편(달려온 쪽)에 1초간
  // 떴다 사라진다. 오빠!/엄마! 문구와 마찬가지로 effectsLayer 안의 순수 연출이라 obstacles에
  // 들어가지 않고 충돌/판정에 전혀 영향이 없다. 폭만 지정하고 높이는 원본 비율(auto)로 두기
  // 때문에 이미지 비율이 어떻든 찌그러지거나 잘리지 않으며, 팝업 확대/상승 애니메이션까지
  // 감안한 위치라서 화면 밖으로 삐져나가지도 않는다.
  function spawnMilestoneFx(src){
    if (!effectsLayer) return;
    var rect = app.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'milestone-fx';
    el.style.left = (rect.width * MILESTONE_LEFT_FRAC) + 'px';
    el.style.top = (rect.height * MILESTONE_TOP_FRAC) + 'px';
    el.style.width = (rect.height * MILESTONE_SIZE_FRAC) + 'px';
    el.innerHTML = '<img src="' + src + '" alt="">';
    effectsLayer.appendChild(el);
    setTimeout(function(){ el.remove(); }, MILESTONE_FX_MS + 120);
  }

  // ---- 마지막 곡의 남은 시간에 맞춰 진행되는 엔딩 시퀀스 ----
  // bgmCheckCrossfade에서 마지막 곡의 timeupdate마다 호출된다 (초당 4회쯤).
  function checkFinalSequence(remain){
    if (state !== 'playing') return;
    // 1) 음악 줄이기 (예고보다 먼저 시작해서, 예고 시간을 줄여도 페이드는 길게 유지된다)
    if (!finalFadeStarted && remain <= FINAL_FADE_LEAD){
      finalFadeStarted = true;
      beginFinalMusicFade(remain);
    }
    // 2) 예고 + 일반 장애물 중단
    if (!finalNoticeShown && remain <= FINAL_NOTICE_LEAD){
      finalNoticeShown = true;
      beginFinalPhase();
    }
    if (finalNoticeShown && !finalItemSpawned && remain <= FINAL_ITEM_LEAD){
      finalItemSpawned = true;
      hideStrollerNotice();
      spawnFinalStroller();
    }
  }

  // 마지막 곡을 서서히 줄인다. 곡이 끝나는 순간(= 보스 음악이 시작되는 순간)에 이미 거의
  // 무음이 되어 있어야 보스 음악이 갑툭튀로 들리지 않는다. 곡 자체는 끝까지 재생되어야
  // 'ended'로 보스전이 시작되므로 pause()는 절대 부르지 않고 볼륨만 내린다. 페이드 길이는
  // 남은 시간에서 자동으로 계산하므로 FINAL_FADE_LEAD를 바꿔도 알아서 맞춰진다.
  function beginFinalMusicFade(remain){
    var lastEl = bgmEls[bgmActive];
    if (lastEl && !lastEl.paused){
      var outMs = Math.max(500, ((remain || FINAL_FADE_LEAD) - 0.3) * 1000);
      bgmFade(lastEl, lastEl.volume, 0, outMs);
    }
  }

  function beginFinalPhase(){
    finalPhase = true;
    // 진행 중인 까마귀 예고는 취소한다 - 2초 뒤에 까마귀가 유모차와 겹쳐 나오면 안 된다.
    if (crowWarnTimer){ clearTimeout(crowWarnTimer); crowWarnTimer = null; }
    if (crowWarningEl) crowWarningEl.hidden = true;
    crowPending = false;
    // 아직 안 나온 가족 복귀 보너스도 이 구간에서는 나오지 않게 막는다 (유모차와 혼동 방지).
    bonusDueAt = null;
    showStrollerNotice();
  }

  // 까마귀의 빨간 경고와 달리 "위험"이 아니라 "먹어야 한다"는 신호라서, 아이템 뒤에 깔리는
  // 금색 별과 같은 톤으로 만든다.
  function showStrollerNotice(){
    if (!effectsLayer || strollerNoticeEl) return;
    var rect = app.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'stroller-notice';
    el.style.fontSize = (rect.height * 0.085).toFixed(1) + 'px';
    el.innerHTML = '<span class="sn-star">★</span><span class="sn-text">유모차를 먹어라!</span>';
    effectsLayer.appendChild(el);
    strollerNoticeEl = el;
    playPickupSfx();
  }
  function hideStrollerNotice(){
    if (strollerNoticeEl){ strollerNoticeEl.remove(); strollerNoticeEl = null; }
  }

  // 게이지 왼쪽에 있는 그 유모차 이미지 그대로. FINAL_STROLLER_LANES 중 한 곳에 무작위로,
  // 한 판에 단 한 번만 등장한다 (공중이면 2단 점프, 바닥이면 뛰지 말고 달려가야 먹는다).
  function spawnFinalStroller(){
    var rect = app.getBoundingClientRect();
    var x = rect.width + 20;
    var sh = rect.height * FINAL_STROLLER_FRAC;
    var sw = sh;
    var lanes = FINAL_STROLLER_LANES;
    var elev = rect.height * lanes[Math.floor(Math.random() * lanes.length)];
    var el = document.createElement('div');
    el.className = 'obstacle star final-stroller';
    el.style.left = x + 'px';
    el.style.width = sw + 'px';
    el.style.height = sh + 'px';
    el.style.bottom = (GROUND_H + elev) + 'px';
    el.innerHTML =
      '<div class="star-behind"></div>' +
      '<img class="star-img" src="' + IMG_STROLLER + '" alt="">';
    obstaclesLayer.appendChild(el);
    obstacles.push({ el: el, x: x, w: sw, h: sh, elevation: elev, type: 'finalstroller' });
  }

  // 보스 음원이 시작되는 순간(= 마지막 곡이 완전히 끝난 순간) 호출된다.
  function beginFinalBoss(){
    if (bossMusicOn) return;
    bossMusicOn = true;
    // instant: 앞 곡과 겹치지 않고 바로 시작, loop 없음 -> 한 번만 재생되고 끝난다.
    // fadeIn: 0에서 BOSS_FADE_IN_MS 동안 볼륨을 올린다 (앞 곡은 이미 페이드 아웃으로
    // 거의 무음이므로, 무음 -> 보스 음악으로 자연스럽게 이어진다).
    bgmPlayTrack(window.BGM_FINAL_BOSS || window.BGM_END, { instant: true, fadeIn: BOSS_FADE_IN_MS });
    bossProgSet(100);
    if (bossProgWrapEl) bossProgWrapEl.classList.add('arrived');
    if (state === 'playing') spawnBoss();
  }

  // 일반 똥처럼 바닥에 붙어 있지만, 2단 점프 최고점보다 높아서 넘어갈 수 없는 벽이다.
  function spawnBoss(){
    if (bossSpawned) return;
    bossSpawned = true;
    finalPhase = true; // 보스전 동안에도 일반 장애물은 나오지 않는다
    var rect = app.getBoundingClientRect();
    var bh = rect.height * BOSS_H_FRAC;
    var bw = bh * bossAspect();
    var x = rect.width + 20;
    var el = document.createElement('div');
    el.className = 'obstacle boss';
    el.style.left = x + 'px';
    el.style.bottom = GROUND_H + 'px';
    el.style.width = bw + 'px';
    el.style.height = bh + 'px';
    el.innerHTML = '<img class="boss-img" src="' + BOSS_IMG + '" alt="">';
    obstaclesLayer.appendChild(el);
    obstacles.push({ el: el, x: x, w: bw, h: bh, elevation: 0, type: 'boss' });
  }

  // 무적 상태로 보스에 부딪혔을 때: 일반 장애물처럼 날아가지 않고 제자리에서 다운 이미지로
  // 바뀐 뒤 그대로 멈춘다. 동시에 축하 메시지가 뜨고 게임이 클리어로 끝난다.
  function defeatBoss(o, idx){
    obstacles.splice(idx, 1);
    var img = o.el.querySelector('.boss-img');
    if (img) img.src = BOSS_DOWN_IMG;
    o.el.classList.add('downed');
    score += KO_SCORE;
    spawnKoPopFx(o.x + o.w / 2, groundTop - o.h * 0.6);
    spawnImpactEffect(o.x + o.w / 2, groundTop - o.h * 0.45);
    playObstacleKoSfx();
    playMilestoneSfx();
    // 축하 메시지가 화면 가운데를 크게 덮어서 다운된 보스를 가린다. 다운된 모습을 먼저
    // 잠깐 보여준 뒤에 메시지가 터지도록 살짝 늦춘다.
    setTimeout(spawnClearMessage, CLEAR_MSG_DELAY_MS);
    triggerClear();
  }

  // 10,000점 돌파 연출과 같은 자리(화면 X축 가운데)에 50% 더 크게. 돌파 연출과 달리
  // 사라지지 않고 그대로 남는다.
  function spawnClearMessage(){
    if (!effectsLayer) return;
    var rect = app.getBoundingClientRect();
    var w = rect.height * CLEAR_MSG_FRAC;
    var el = document.createElement('div');
    el.className = 'clear-msg-fx';
    el.style.left = (rect.width / 2 - w / 2) + 'px';
    el.style.top = (rect.height * CLEAR_MSG_TOP_FRAC) + 'px';
    el.style.width = w + 'px';
    el.innerHTML = '<img src="' + CLEAR_MSG_IMG + '" alt="">';
    effectsLayer.appendChild(el);
  }

  // 클리어: 화면을 그 상태로 멈춰 다운된 보스와 축하 메시지를 보여준 뒤 점수 화면으로 넘어간다.
  // 게임오버와 달리 stopMusic()을 부르지 않는다 - 보스 음원이 끝까지 재생된 뒤 자연히 멈춘다.
  function triggerClear(){
    if (state !== 'playing') return;
    state = 'cleared';
    cleared = true;
    character.classList.remove('run');
    app.classList.remove('gauge-burst');
    void app.offsetWidth;
    app.classList.add('gauge-burst');
    setTimeout(function(){ endGame(true); }, CLEAR_HOLD_MS);
  }

  function spawnGroundObstacle(type, skipCombo, xOffset){
    var rect = app.getBoundingClientRect();
    var x = rect.width + 20 + (xOffset || 0);
    var el = document.createElement('div');
    el.style.left = x + 'px';
    el.style.bottom = GROUND_H + 'px';

    if (type === 'dog'){
      var dh = DOG_H;
      var dw = dh * DOG_ASPECT;
      el.className = 'obstacle dog';
      el.style.width = dw + 'px';
      el.style.height = dh + 'px';
      el.innerHTML =
        '<img class="dog-frame frame-a" src="' + IMG_DOG_A + '" alt="">' +
        '<img class="dog-frame frame-b" src="' + IMG_DOG_B + '" alt="">';
      obstaclesLayer.appendChild(el);
      obstacles.push({ el: el, x: x, w: dw, h: dh, elevation: 0, type: type, extraSpeed: DOG_EXTRA_SPEED, hop: 0, hops: hardMode() });
      lastSpawnType = 'dog';
      return;
    }

    if (type === 'crow'){
      var crh = CROW_H;
      var crw = crh * CROW_ASPECT;
      el.className = 'obstacle crow';
      el.style.width = crw + 'px';
      el.style.height = crh + 'px';
      el.innerHTML =
        '<img class="crow-frame crow-frame-up" src="' + IMG_CROW_UP + '" alt="">' +
        '<img class="crow-frame crow-frame-down" src="' + IMG_CROW_DOWN + '" alt="">';
      obstaclesLayer.appendChild(el);
      obstacles.push({ el: el, x: x, w: crw, h: crh, elevation: 0, type: type });
      lastSpawnType = 'crow';
      return;
    }

    // default: poop
    var prevType = lastSpawnType;
    var ph = OBST_POOP_H * (hardMode() ? POOP_HARD_SCALE : 1);
    var pw = ph * 1.14; // matches the poop artwork's aspect ratio
    el.className = 'obstacle poop';
    el.style.width = pw + 'px';
    el.style.height = ph + 'px';
    el.innerHTML = '<img class="poop-img" src="' + IMG_POOP + '" alt="">';
    obstaclesLayer.appendChild(el);
    obstacles.push({ el: el, x: x, w: pw, h: ph, elevation: 0, type: type,
      hitTop: POOP_HIT_TOP_FRAC, hitSide: POOP_HIT_SIDE_FRAC });
    lastSpawnType = 'poop';

    // occasionally pair a dog tightly behind this poop so the two form a single combined
    // hurdle ("겹쳐서 한번에 피하기"), always sized to be single-jump clearable - the earlier
    // "wide" double-jump variant was tried with a warning badge, but playtesting found it
    // added confusion without adding fun, so every combo is now the same single-jump gap.
    // the combo dog has NO extra closing speed of its own - it just rides at a fixed pixel
    // gap behind the poop - so the pair's on-screen spacing never changes after it spawns,
    // however the scroll speed drifts afterward (the speed wave can dip up to
    // SPEED_WAVE_AMPLITUDE below its value at spawn time by the time the player reaches it).
    // To guarantee the gap is always actually clearable, size it off a conservative
    // worst-case-slowest speed rather than the instantaneous speed at spawn, and off a
    // safety-margined fraction of the real single-jump air time (from the same physics used
    // by doJump), not a hardcoded guess.
    // a dog can never immediately follow another dog (combo or standalone) - guarantees at
    // least one dog-free obstacle between any two dogs, so they can never chain back to back
    // into something genuinely undodgeable.
    if (!skipCombo && gameTime > 7 && prevType !== 'dog' && Math.random() < comboChance()){
      // 속도 상한(MAX_SPEED)을 반영한 "실제로 흐를 속도"를 써야 한다. 예전에는 상한을 무시한
      // BASE_SPEED*배수를 써서, 배수가 커질수록 간격이 픽셀로 계속 벌어졌다. 그 결과 같은
      // 콤보가 2분 19초에는 290ms 간격(붙어 있어 허둥지둥), 보스 앞에서는 929ms 간격(사실상
      // 별개 장애물 둘)로 완전히 다른 패턴이 되어버렸다.
      var safeSpeed = Math.min(MAX_SPEED, BASE_SPEED * speedMultiplier * (1 - SPEED_WAVE_AMPLITUDE));
      var singleHang = 2 * Math.sqrt(2 * JUMP_PEAK_1 / GRAVITY);
      // 체공시간의 COMBO_GAP_FRAC 만큼을 간격으로 쓴다. 0.40이면 "똥을 1탭으로 넘고 착지해서
      // 쥐를 2연타로 넘기"까지 타이밍 허용 오차가 ±48ms 확보된다 (모바일 터치 오차 ±30~50ms).
      var comboGap = safeSpeed * singleHang * COMBO_GAP_FRAC;
      var cx = x + pw + comboGap;
      var dh2 = DOG_H;
      var dw2 = dh2 * DOG_ASPECT;
      var del = document.createElement('div');
      del.className = 'obstacle dog';
      del.style.left = cx + 'px';
      del.style.bottom = GROUND_H + 'px';
      del.style.width = dw2 + 'px';
      del.style.height = dh2 + 'px';
      del.innerHTML =
        '<img class="dog-frame frame-a" src="' + IMG_DOG_A + '" alt="">' +
        '<img class="dog-frame frame-b" src="' + IMG_DOG_B + '" alt="">';
      obstaclesLayer.appendChild(del);
      obstacles.push({ el: del, x: cx, w: dw2, h: dh2, elevation: 0, type: 'dog', extraSpeed: 0, hop: 0, hops: hardMode() });
      lastSpawnType = 'dog';
      // give a bit of extra breathing room before the next independent obstacle after a combo pair
      nextSpawnIn = Math.max(nextSpawnIn, 1450);
    }
  }

  function loop(now){
    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (state === 'playing'){
      gameTime += dt;

      // BGM's main track gradually builds to a faster tempo toward 0:15 - smoothly ramp a
      // matching speed boost in over the same window (instead of one abrupt jump at the end)
      // so the difficulty already feels naturally sped-up by the time the tempo kicks in.
      if (musicRampProgress < 1){
        var rampT = Math.min(1, Math.max(0, (gameTime - MUSIC_RAMP_START) / (MUSIC_RAMP_END - MUSIC_RAMP_START)));
        var rampEased = rampT * rampT * (3 - 2 * rampT); // smoothstep easing
        if (rampEased > musicRampProgress){
          var rampTargetMult = 1 + (MUSIC_RAMP_FACTOR - 1) * rampEased;
          var rampAppliedMult = 1 + (MUSIC_RAMP_FACTOR - 1) * musicRampProgress;
          speedMultiplier *= rampTargetMult / rampAppliedMult;
          musicRampProgress = rampEased;
        }
      }

      // ramp is active during the first EASE_WINDOW_SECONDS (at a gentler rate), then paused
      // (plateau) until DIFFICULTY_DELAY_SECONDS have elapsed, then resumes at the normal rate -
      // see the constants above for why.
      var rampActive = (gameTime <= EASE_WINDOW_SECONDS) ||
        (gameTime > EASE_WINDOW_SECONDS + DIFFICULTY_DELAY_SECONDS);
      if (rampActive && !wasRampActive){
        // just came off the plateau - restart the level-up counters from right now so the
        // first tick afterward doesn't fire a backlog of level-ups all at once.
        lastLevelTime = gameTime;
        lastLevelCount = obstaclesPassed;
      }
      wasRampActive = rampActive;

      if (rampActive &&
          (gameTime - lastLevelTime >= LEVEL_UP_SECONDS ||
          obstaclesPassed - lastLevelCount >= LEVEL_UP_OBSTACLES)){
        lastLevelTime = gameTime;
        lastLevelCount = obstaclesPassed;
        var levelUpFactor = (gameTime <= EASE_WINDOW_SECONDS) ? EARLY_LEVEL_UP_FACTOR : LEVEL_UP_FACTOR;
        speedMultiplier *= levelUpFactor;
      }
      var waveFactor = 1 + SPEED_WAVE_AMPLITUDE * Math.sin((gameTime / SPEED_WAVE_PERIOD) * Math.PI * 2);
      speed = Math.min(MAX_SPEED, BASE_SPEED * speedMultiplier * waveFactor);

      // as the run speeds up, jumps get a bit snappier (same height, shorter time in the air)
      // instead of staying floaty forever - otherwise a jump ends up covering more and more
      // ground the faster things scroll, making later obstacles trivial to clear by accident.
      // GRAVITY_CAP_MULT 이후로는 더 커지지 않는다 (위 gravityFor 주석 참고).
      GRAVITY = gravityFor(speedMultiplier);

      bgPosX -= speed * 0.5 * dt;
      sky.style.backgroundPositionX = bgPosX + 'px';

      if (isJumping){
        vy -= GRAVITY * dt;
        jumpY += vy * dt;
        if (jumpY <= 0){
          jumpY = 0; vy = 0; isJumping = false; jumpsUsed = 0;
          character.classList.add('run');
          setCharImage(false);
        }
        applyCharTransform();
      }

      // paused while a crow's 2s warning is showing, so nothing else can spawn into that
      // window and create an unfair overlap (see beginCrowSequence).
      // 엔딩 시퀀스(유모차 예고 ~ 보스전) 동안에는 일반 장애물을 전혀 만들지 않는다.
      if (!crowPending && !finalPhase && !TEST_SAFE){
        spawnTimer += dt * 1000;
        if (spawnTimer >= nextSpawnIn){
          spawnTimer = 0;
          // the target gap itself also shrinks (up to 35%) as difficulty ramps, on top of the
          // hang-time floor below - without this, the floor alone still asymptotes toward a
          // small constant, and at high speed that constant x speed once again grows into a
          // large screen-space gap, so obstacles thin out late-game even though they're
          // spawning "fast enough" by the clock. Shrinking the target gap keeps real density
          // (obstacles per screen-width) climbing instead of flattening out.
          var gapDiff = Math.min(1, (speedMultiplier - 1) / 1.6);
          var gapMult = 1 - 0.35 * gapDiff;
          var gapPx = OBST_GAP_PX * gapMult * (0.82 + Math.random() * 0.36);
          // floor kept comfortably above a full single-jump's hang time so obstacles are
          // never physically impossible to clear - but that hang time itself shrinks as
          // GRAVITY ramps up with speed (see loop() above), so the floor now shrinks right
          // along with it instead of staying frozen at the early-game value. Without this,
          // once speed outran the old fixed 0.85s floor, obstacles actually got FARTHER
          // apart in screen-space the faster the run went (same time gap, longer distance
          // covered per spawn) - real difficulty quietly plateaued right when it should have
          // kept climbing. This keeps the safety margin (~0.21s of reaction buffer above the
          // minimum airtime) constant while letting spawn frequency keep rising for real.
          var singleHangSec = 2 * Math.sqrt(2 * JUMP_PEAK_1 / GRAVITY);
          // 하드 구간에서는 도약하는 쥐를 넘으려면 2연타가 필수다. 그래서 하한을 1단 체공이
          // 아니라 2단 점프 체공으로 잡아야 "치고 착지해서 다음 걸 칠 시간"이 실제로 생긴다
          // (1단 기준으로 두면 2연타 후 휴식이 92ms밖에 안 남아 연속 쥐가 사실상 불가능해진다).
          var airSec = hardMode() ? (2 * Math.sqrt(2 * JUMP_PEAK_2 / GRAVITY)) : singleHangSec;
          var minIntervalSec = airSec + 0.21;
          var intervalSec = Math.max(minIntervalSec, gapPx / speed);
          nextSpawnIn = intervalSec * 1000;

          var type = pickObstacleType();
          if (type === 'star'){
            // no warning/delay needed - it's a bonus pickup, not a hazard, so it can just
            // appear directly in the air lane (and safely coexist with a ground obstacle).
            spawnStarNow();
          } else if (type === 'crow'){
            beginCrowSequence();
          } else {
            spawnGroundObstacle(type);
          }
        }
      }

      if (invincible && !infiniteInvincible){
        invincibleTimer -= dt;
        if (invincibleTimer <= 1.5) character.classList.add('invincible-warning');
        if (invincibleTimer <= 0){
          invincible = false;
          invincibleTimer = 0;
          character.classList.remove('invincible', 'invincible-warning');
          invincibleHud.hidden = true;
          if (charCountdown) charCountdown.hidden = true;
          setCharImage(isJumping); // back to the normal run/jump art
        } else {
          var ceilSec = Math.ceil(invincibleTimer);
          invincibleTimeEl.textContent = ceilSec;
          if (charCountdownNum) charCountdownNum.textContent = ceilSec;
        }
      }

      if (hitInvuln){
        hitInvulnTimer -= dt;
        if (hitInvulnTimer <= 0){ hitInvuln = false; hitInvulnTimer = 0; }
      }

      // recovery bonus: appears exactly 25s after the most recent life-loss, targeting
      // whichever family member is still missing (see triggerLifeLoss) - never both at
      // once, since only one level is ever missing-and-pending at a time.
      if (!finalPhase && lifeState < 3 && !bonusSpawned && bonusDueAt !== null && gameTime >= bonusDueAt){
        spawnBonusItemNow(lifeState === 1 ? 'woman' : 'man');
      }

      // hitbox front edge (facing the direction of travel, where obstacles actually get jumped)
      // stays pinned at the same spot as before - only the REAR edge (behind, where the
      // trailing family member's back foot trails off) got pulled in further, so it's no
      // longer possible to get an "unfair-feeling" hit purely from that back foot overlapping
      // an obstacle that's already well behind where the front of the character is jumping.
      var lifeCfg = LIFE_STATE_CFG[lifeState] || LIFE_STATE_CFG[3];
      var CHAR_HITBOX_FRONT = lifeCfg.hitFront; // right edge of the hitbox, as a fraction of
        // sprite width - narrows as lives are lost
      var CHAR_HITBOX_REAR = lifeCfg.hitRear; // left/rear edge - also narrows with lifeState
      var charW = character.offsetWidth * (CHAR_HITBOX_FRONT - CHAR_HITBOX_REAR);
      var charH = character.offsetHeight * 0.55; // a bit more forgiving now that the character
        // reads visually smaller relative to obstacles
      var charLeft = charLeftPx + charOffsetX + character.offsetWidth * CHAR_HITBOX_REAR;
      var charTop = groundTop - jumpY - charH;

      for (var i = obstacles.length - 1; i >= 0; i--){
        var o = obstacles[i];
        o.x -= (speed + (o.extraSpeed || 0)) * dt;
        o.el.style.left = o.x + 'px';

        // purely visual U-curve dive: tallest right after spawning and right before exiting,
        // eased down to 0 lift exactly at the character's x - the actual hitbox (oTop below)
        // never moves, so this never changes when a jump is actually required.
        if (o.type === 'crow'){
          var crowDist = Math.abs(o.x - charLeftPx);
          var crowT = Math.min(1, crowDist / CROW_ARC_RANGE);
          var crowLift = CROW_LIFT_MAX * (crowT * crowT);
          o.el.style.transform = 'translateY(-' + crowLift.toFixed(1) + 'px)';
        }

        // 10,000점 이후 회색쥐의 깔짝 점프: 화면 가운데(MOUSE_HOP_X0)에서 떠올라 플레이어를
        // 지난 직후(MOUSE_HOP_X1)에 착지하는 포물선. 시간이 아니라 x 위치로만 계산하기 때문에
        // 스크롤 속도가 얼마나 빨라져도 뛰는 지점과 높이가 항상 똑같고, 아래 oTop에서 그대로
        // 빼주므로 눈에 보이는 높이와 판정 높이가 언제나 일치한다 (hops가 켜진 쥐만 해당,
        // 까마귀/똥/아이템은 o.hop이 없어서 0으로 취급되어 전혀 영향받지 않는다).
        if (o.hops){
          var hopP = (MOUSE_HOP_X0 - o.x) / (MOUSE_HOP_X0 - MOUSE_HOP_X1);
          hopP = Math.max(0, Math.min(1, hopP));
          o.hop = MOUSE_HOP_PEAK * 4 * hopP * (1 - hopP);
          o.el.style.transform = 'translateY(-' + o.hop.toFixed(1) + 'px)';
        }

        // 판정 박스는 그림 박스와 다를 수 있다 (o.hitTop / o.hitSide). 기본값은 예전과 같은
        // 좌우 8% 제외 / 높이 전체이고, 똥만 상단 28% + 좌우 18%를 제외한다. oTop은 그림
        // 기준이라 연출(불꽃/점수 팝업) 위치용으로 그대로 쓰고, 충돌 판정은 oHitTop을 쓴다.
        var oSide = (o.hitSide == null) ? 0.08 : o.hitSide;
        var oHitH = o.h * ((o.hitTop == null) ? 1 : o.hitTop);
        var oLeft = o.x + o.w * oSide;
        var oW = o.w * (1 - 2 * oSide);
        var oTop = groundTop - o.h - (o.elevation || 0) - (o.hop || 0);
        var oHitTop = groundTop - oHitH - (o.elevation || 0) - (o.hop || 0);

        var overlapping = charLeft < oLeft + oW && charLeft + charW > oLeft &&
          charTop < oHitTop + oHitH && charTop + charH > oHitTop;

        // the air-lane star is a pure bonus pickup now, not a hazard - collecting it
        // never hurts (jumping or not), just adds points and disappears with a little fx.
        if (overlapping && o.type === 'star'){
          score += 100;
          spawnStarPopFx(o.x + o.w / 2, oTop + o.h / 2);
          playStarSfx();
          o.el.remove();
          obstacles.splice(i, 1);
          continue;
        }

        // recovery bonus pickup: restores the missing family member one level at a time,
        // shows the (purely cosmetic, non-collidable) 오빠!/엄마! call message, and
        // reschedules the next recovery (if anyone is still missing) from right now.
        if (overlapping && o.type === 'bonus'){
          var recoveredTarget = o.target;
          bonusSpawned = false;
          bonusDueAt = null;
          lifeState = Math.min(3, lifeState + 1);
          charOffsetX = LIFE_STATE_CFG[lifeState].offsetXFrac * character.offsetWidth;
          applyCharTransform();
          setCharImage(isJumping);
          score += 150;
          spawnStarPopFx(o.x + o.w / 2, oTop + o.h / 2);
          playPickupSfx();
          spawnCallMessageFx(recoveredTarget);
          o.el.remove();
          obstacles.splice(i, 1);
          if (lifeState < 3){
            bonusDueAt = gameTime + LIFE_RECOVERY_DELAY;
          }
          continue;
        }

        // ---- 최종 유모차 아이템: 먹으면 시간 무한 무적이 발동한다 (한 판에 한 번뿐) ----
        if (overlapping && o.type === 'finalstroller'){
          strollerTaken = true;
          o.el.remove();
          obstacles.splice(i, 1);
          activateInfiniteInvincibility();
          spawnImpactEffect(o.x + o.w / 2, oTop + o.h / 2);
          app.classList.remove('gauge-burst');
          void app.offsetWidth;
          app.classList.add('gauge-burst');
          continue;
        }

        // ---- 최종 보스 ----
        // 무적이면 격파(클리어), 아니면 목숨이 남아 있어도 즉시 게임오버. 보스는 넘을 수
        // 없는 벽이라 "피했는데 아무 일도 없는" 애매한 상태가 생기지 않는다.
        if (overlapping && o.type === 'boss'){
          var bx1 = Math.max(charLeft, oLeft);
          var bx2 = Math.min(charLeft + charW, oLeft + oW);
          var by1 = Math.max(charTop, oTop);
          var by2 = Math.min(charTop + charH, oTop + o.h);
          if (invincible) defeatBoss(o, i);
          else triggerHit((bx1 + bx2) / 2, (by1 + by2) / 2);
          break;
        }

        if (overlapping && invincible){
          // plow straight through instead of dying - the obstacle is the one that "dies"
          // here: it flies off spinning (randomized direction/spin) and fades out, instead
          // of just vanishing instantly. Worth a flat +50 combat bonus with its own
          // neon-colored popup, on top of the impact fx/sfx.
          spawnImpactEffect(o.x + o.w / 2, oTop + o.h / 2);
          spawnKoPopFx(o.x + o.w / 2, oTop - 10);
          playPlowSfx();
          score += KO_SCORE;
          triggerObstacleKO(o.el);
          obstacles.splice(i, 1);
          continue;
        }

        if (overlapping && hitInvuln){
          // brief grace period right after a life-loss hit - a hazard passes through
          // harmlessly instead of costing a second life a split-second later.
          continue;
        }

        if (overlapping){
          var ix1 = Math.max(charLeft, oLeft);
          var ix2 = Math.min(charLeft + charW, oLeft + oW);
          var iy1 = Math.max(charTop, oTop);
          var iy2 = Math.min(charTop + charH, oTop + o.h);
          var hitCx = (ix1 + ix2) / 2, hitCy = (iy1 + iy2) / 2;
          if (lifeState > 1){
            triggerLifeLoss(hitCx, hitCy);
            o.el.remove();
            obstacles.splice(i, 1);
            continue;
          }
          triggerHit(hitCx, hitCy);
          break;
        }

        // reward a clean dodge right when a ground hazard (poop/dog) fully clears the
        // character while you were airborne over it. the air-lane star isn't a hazard
        // (it's handled separately above, the instant it's collected), so a missed star
        // just passes by with no penalty and no dodge reward.
        if (!o.rewarded && o.type !== 'star' && o.type !== 'bonus' &&
            o.type !== 'finalstroller' && o.type !== 'boss' && (oLeft + oW) < charLeft){
          o.rewarded = true;
          if (isJumping){
            spawnNearMissEffect(o.x + o.w / 2, oTop - 14);
            playNearMissSfx();
            score += 8;
            addGaugeDodge();
          }
        }

        if (o.x + o.w < -20){
          if (o.type === 'bonus'){
            bonusSpawned = false;
            if (lifeState < 3) bonusDueAt = gameTime + LIFE_RECOVERY_DELAY;
          }
          o.el.remove();
          obstacles.splice(i, 1);
          obstaclesPassed++;
        }
      }

      score += dt * 12;
      scoreVal.textContent = String(Math.floor(score));

      // 구간 돌파 연출: 각 구간 점수를 처음 넘어서는 프레임에 이미지 + 축하음이 딱 한 번.
      // milestoneIdx가 앞으로만 움직이므로 한 판에서 같은 구간이 두 번 터지는 일은 없고,
      // reset()에서 0으로 돌아가니 다시하기를 하면 1,000점부터 새로 축하해준다.
      while (milestoneIdx < SCORE_MILESTONES.length && score >= SCORE_MILESTONES[milestoneIdx].score){
        spawnMilestoneFx(SCORE_MILESTONES[milestoneIdx].img);
        playMilestoneSfx();
        milestoneIdx++;
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);

  window.addEventListener('keydown', function(e){
    if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp'){
      e.preventDefault();
      if (e.repeat) return;
      if (state === 'playing') doJump();
    }
  });

  var jumpBtn = document.getElementById('jumpBtn');
  var bottomSpace = document.getElementById('bottomSpace');
  jumpBtn.addEventListener('pointerdown', function(e){
    e.preventDefault();
    jumpBtn.classList.add('pressed');
    if (bottomSpace){
      bottomSpace.classList.remove('burst');
      void bottomSpace.offsetWidth;
      bottomSpace.classList.add('burst');
    }
    if (state === 'playing') doJump();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(evt){
    jumpBtn.addEventListener(evt, function(){ jumpBtn.classList.remove('pressed'); });
  });

  setCharImage(false);
  layout();

  rafId = requestAnimationFrame(function keepAlive(now){
    lastTime = now;
    rafId = requestAnimationFrame(keepAlive);
  });
})();
