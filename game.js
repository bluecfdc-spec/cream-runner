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
  var bannerImg = document.getElementById('bannerImg');
  var startBannerImg = document.getElementById('startBannerImg');

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

  // ---- BGM: play the uploaded compilation once in full, then loop the wav file forever until game over ----
  var BGM_VOLUME = 0.55;
  var bgmMain = document.getElementById('bgm-main');
  var bgmLoop = document.getElementById('bgm-loop');
  if (bgmMain) bgmMain.volume = BGM_VOLUME;
  if (bgmLoop){ bgmLoop.loop = true; bgmLoop.volume = BGM_VOLUME; }
  // kick off buffering the (large) main BGM file immediately on page load, well before the
  // player taps start - so play() at game-start is instant instead of waiting on the fetch.
  if (bgmMain){ try { bgmMain.load(); } catch (e) {} }

  function startMusic(){
    stopMusic();
    if (!bgmMain) return;
    try {
      bgmMain.currentTime = 0;
      var p = bgmMain.play();
      if (p && p.catch) p.catch(function(){});
    } catch (e) {}
    // start buffering the loop track right away so it's fully ready by the time the
    // compilation ends - avoids any audible gap/silence at the handoff
    if (bgmLoop){
      try {
        bgmLoop.currentTime = 0;
        bgmLoop.load();
      } catch (e) {}
    }
  }
  function stopMusic(){
    if (bgmMain){ try { bgmMain.pause(); } catch (e) {} }
    if (bgmLoop){ try { bgmLoop.pause(); } catch (e) {} }
  }
  if (bgmMain){
    bgmMain.addEventListener('ended', function(){
      if (state !== 'playing' || !bgmLoop) return;
      try {
        bgmLoop.currentTime = 0;
        var p = bgmLoop.play();
        if (p && p.catch) p.catch(function(){});
      } catch (e) {}
    });
  }

  /* ---------------- game state & physics (all scaled to the 16:9 box) ---------------- */
  var SPRITE_ASPECT = 230 / 172;
  var GRAVITY = 2300;
  var JUMP_PEAK_1 = 200; // guaranteed apex height of a single jump
  var JUMP_PEAK_2 = 320; // guaranteed apex height once you double-jump, no matter the timing
  var GROUND_H = 64;
  var OBST_POOP_H = 26;    // 💩 flat & small, always has to be jumped
  var STAR_H = 45;         // treat-jar bonus item size (50% bigger than the original size so
                           // it actually reads as something worth grabbing) - air lane, no
                           // longer a hazard, so it's fine to line up with a ground obstacle
  var STAR_ELEV_HIGH = 40; // "sky" flight lane - the original, higher pop-up height
  var STAR_ELEV_MID = 20;  // "mid-air" flight lane - noticeably lower than the sky lane, but
                            // still clearly off the ground so it never reads as a ground hazard
  var STAR_ASPECT = 200 / 435; // treat-jar art's width/height ratio (tall bottle shape)
  var DOG_H = 34;          // dog obstacle height, jumpable like poop
  var DOG_ASPECT = 1.48;   // dog sprite box width/height ratio
  var CROW_H = 40;         // real hazard again - taller than the dog, so it forces a proper
                            // jump, but still ground-level (jump to clear, exactly like every
                            // other obstacle - no "duck" mechanic exists in this game, so an
                            // aerial-only hazard would be undodgeable/unfair)
  var CROW_ASPECT = 325 / 300; // box sized off the wings-up frame's aspect
  var CROW_LIFT_MAX = 200; // how high above its ground-level hitbox the crow visually swoops
                            // at the top of its dive (purely cosmetic - see loop())
  var CROW_ARC_RANGE = 400; // horizontal distance (px) over which the lift eases from 0 (right
                            // at the character's x, the actual jump-it moment) up to max
  var DOG_EXTRA_SPEED = 0; // dog closes in faster than the scroll speed (set in layout)
  var BASE_SPEED = 260;
  var MAX_SPEED = 560;
  var OBST_GAP_PX = 340; // target pixel gap between obstacles, kept ~constant as speed rises
  var SPEED_WAVE_AMPLITUDE = 0.14; // +/-14% gentle speed-up/slow-down wave layered on top
  var SPEED_WAVE_PERIOD = 7;       // seconds per full wave cycle

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
  var BASE_GRAVITY = 2300;      // set for real in layout(), scaled to box height
  var GRAVITY_SPEED_SCALE = 0.35; // e.g. speedMultiplier 2.0 -> ~35% more gravity -> snappier, shorter jumps

  // ---- 개모차 gauge: every clean dodge fills the gauge a little; full gauge auto-triggers
  // invincibility instead of the old dodge-streak that just visually reset (and felt
  // pointless) whenever you died. This way every clean dodge is banked toward something
  // concrete you keep working on, and dying only costs you the current partial fill.
  var dodgeGauge = 0;
  var GAUGE_MAX_BASE = 10;  // clean dodges needed to fill the gauge early on
  var GAUGE_MAX_LATE = 15;  // ...rising to this many later, once obstacles come in faster
                             // (see currentGaugeMax) - keeps invincibility from becoming a
                             // free crutch once the higher spawn rate makes clean dodges easy
                             // to rack up quickly.
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
  var SCORES_COLLECTION = 'scores';
  var lastFinalScore = null;
  var lastFinalDate = null;

  function formatToday(){
    var d = new Date();
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '.' + m + '.' + day;
  }

  function sortedTop(list, n){
    return list.slice().sort(function(a, b){ return (b.score || 0) - (a.score || 0); }).slice(0, n);
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
      name.textContent = e.name;
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
  var FETCH_TIMEOUT_MS = 8000;

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

  function loadLeaderboard(){
    return withTimeout(
      db.collection(SCORES_COLLECTION).get().then(function(snapshot){
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
    return loadLeaderboard().then(function(full){
      if (full === null){
        top3Status.hidden = false;
        top3Status.textContent = '순위를 불러오지 못했어요.';
        return;
      }
      renderLeaderboard(top3List, top3Status, sortedTop(full, 3), false);
    });
  }

  function loadTop10AndCheckRecord(finalScore, finalDate){
    top10Status.hidden = false;
    top10Status.textContent = '불러오는 중...';
    newRecordBox.hidden = true;
    return loadLeaderboard().then(function(full){
      if (full === null){
        top10Status.hidden = false;
        top10Status.textContent = '순위를 불러오지 못했어요.';
        return;
      }
      var top10 = sortedTop(full, 10);
      renderLeaderboard(top10List, top10Status, top10, true);

      var qualifies = top10.length < 10 || finalScore > (top10[9] ? top10[9].score : -Infinity);
      if (qualifies){
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
    name = name.slice(0, 8);
    submitNameBtn.disabled = true;
    nameInput.disabled = true;
    submitNameBtn.textContent = '등록 중...';
    withTimeout(
      db.collection(SCORES_COLLECTION).add({ name: name, score: lastFinalScore, date: lastFinalDate }),
      10000
    ).then(function(ref){
      if (ref === null){
        throw new Error('timeout');
      }
      return loadLeaderboard();
    }).then(function(full){
      var arr = full || [];
      renderLeaderboard(top10List, top10Status, sortedTop(arr, 10), true);
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

  // start screen stays hidden (see index.html) until the initial TOP3 fetch has fully
  // settled - the spinner overlay is what's visible in the meantime.
  showLoading();
  loadTop3().then(function(){
    hideLoading();
    startScreen.hidden = false;
  });

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

    ground.style.height = GROUND_H + 'px';

    OBST_POOP_H = appH * 0.10;
    STAR_H = appH * 0.195; // 50% bigger than the original 0.13 - easier to see and grab
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
    GRAVITY = BASE_GRAVITY * (1 + GRAVITY_SPEED_SCALE * (speedMultiplier - 1));
    JUMP_PEAK_1 = appH * 0.40;
    JUMP_PEAK_2 = appH * 0.64;

    BASE_SPEED = Math.max(150, appW * 0.368 * 1.05);
    MAX_SPEED = Math.max(360, appW * 0.9 * 1.05);
  }
  window.addEventListener('resize', layout);

  function setCharImage(jumping){
    // while invincible, the whole family+dog art takes over instead of the normal run/jump
    // frames - the run-loop keeps calling this on every landing, so it has to keep winning
    // out over jumping/not-jumping for the whole duration of the power-up.
    charImg.src = invincible ? IMG_INVINCIBLE_CHAR : (jumping ? IMG_JUMP : IMG_RUN);
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
    character.classList.remove('invincible', 'invincible-warning');
    if (invincibleHud) invincibleHud.hidden = true;
    if (charCountdown) charCountdown.hidden = true;
    updateGaugeUI();
    character.classList.add('run');
    character.style.transform = 'translateY(0)';
    setCharImage(false);
    scoreVal.textContent = '0';
    app.classList.remove('hit-shake');
    if (hitFlashEl) hitFlashEl.classList.remove('flash');
    if (effectsLayer) effectsLayer.innerHTML = '';
    if (crowWarningEl) crowWarningEl.hidden = true;
    if (crowWarnTimer) { clearTimeout(crowWarnTimer); crowWarnTimer = null; }
    crowPending = false;
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
  function endGame(){
    state = 'over';
    playGameOverSfx();

    var finalScore = Math.floor(score);
    finalScoreEl.textContent = String(finalScore);

    lastFinalScore = finalScore;
    lastFinalDate = formatToday();
    newRecordBox.hidden = true;
    nameInput.hidden = false;
    submitNameBtn.hidden = false;

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
    el.textContent = '+50';
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
  //   💩 poop  - flat & small, ground-based, always has to be jumped, lethal
  //   🐶 dog(now 🐭 mouse art) - ground-based, also has to be jumped, but closes in
  //              faster than the scroll speed so its timing feels different from poop
  //   ⭐ star  - flies at head height in the air lane; a pure +100 bonus pickup now, not a
  //              hazard, so it's totally fine for it to line up with a ground obstacle -
  //              no adjacency restriction needed the way the old crow hazard required.
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
      obstacles.push({ el: el, x: x, w: dw, h: dh, elevation: 0, type: type, extraSpeed: DOG_EXTRA_SPEED });
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
    var ph = OBST_POOP_H;
    var pw = ph * 1.14; // matches the poop artwork's aspect ratio
    el.className = 'obstacle poop';
    el.style.width = pw + 'px';
    el.style.height = ph + 'px';
    el.innerHTML = '<img class="poop-img" src="' + IMG_POOP + '" alt="">';
    obstaclesLayer.appendChild(el);
    obstacles.push({ el: el, x: x, w: pw, h: ph, elevation: 0, type: type });
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
    if (!skipCombo && gameTime > 7 && prevType !== 'dog' && Math.random() < DOG_COMBO_CHANCE){
      var safeSpeed = BASE_SPEED * speedMultiplier * (1 - SPEED_WAVE_AMPLITUDE);
      var singleHang = 2 * Math.sqrt(2 * JUMP_PEAK_1 / GRAVITY);
      // 62% of the true hang time leaves real reaction margin instead of cutting it exactly,
      // and the extra *0.8 pulls the whole gap in another 20% per direct feedback that it
      // was landing too wide to clear.
      var comboGap = safeSpeed * singleHang * 0.62 * 0.8;
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
      obstacles.push({ el: del, x: cx, w: dw2, h: dh2, elevation: 0, type: 'dog', extraSpeed: 0 });
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
      // ground the faster things scroll, making later obstacles trivial to clear by accident
      GRAVITY = BASE_GRAVITY * (1 + GRAVITY_SPEED_SCALE * (speedMultiplier - 1));

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
        character.style.transform = 'translateY(' + (-jumpY) + 'px)';
      }

      // paused while a crow's 2s warning is showing, so nothing else can spawn into that
      // window and create an unfair overlap (see beginCrowSequence).
      if (!crowPending){
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
          var minIntervalSec = singleHangSec + 0.21;
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

      if (invincible){
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

      var charW = character.offsetWidth * 0.42;
      var charH = character.offsetHeight * 0.55; // a bit more forgiving now that the character
                                                  // reads visually smaller relative to obstacles
      var charLeft = charLeftPx + character.offsetWidth * 0.3;
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

        var oLeft = o.x + o.w * 0.08;
        var oW = o.w * 0.84;
        var oTop = groundTop - o.h - (o.elevation || 0);

        var overlapping = charLeft < oLeft + oW && charLeft + charW > oLeft &&
                           charTop < oTop + o.h && charTop + charH > oTop;

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

        if (overlapping && invincible){
          // plow straight through instead of dying - the obstacle is the one that "dies"
          // here: it flies off spinning (randomized direction/spin) and fades out, instead
          // of just vanishing instantly. Worth a flat +50 combat bonus with its own
          // neon-colored popup, on top of the impact fx/sfx.
          spawnImpactEffect(o.x + o.w / 2, oTop + o.h / 2);
          spawnKoPopFx(o.x + o.w / 2, oTop - 10);
          playPlowSfx();
          score += 50;
          triggerObstacleKO(o.el);
          obstacles.splice(i, 1);
          continue;
        }

        if (overlapping){
          var ix1 = Math.max(charLeft, oLeft);
          var ix2 = Math.min(charLeft + charW, oLeft + oW);
          var iy1 = Math.max(charTop, oTop);
          var iy2 = Math.min(charTop + charH, oTop + o.h);
          triggerHit((ix1 + ix2) / 2, (iy1 + iy2) / 2);
          break;
        }

        // reward a clean dodge right when a ground hazard (poop/dog) fully clears the
        // character while you were airborne over it. the air-lane star isn't a hazard
        // (it's handled separately above, the instant it's collected), so a missed star
        // just passes by with no penalty and no dodge reward.
        if (!o.rewarded && o.type !== 'star' && (oLeft + oW) < charLeft){
          o.rewarded = true;
          if (isJumping){
            spawnNearMissEffect(o.x + o.w / 2, oTop - 14);
            playNearMissSfx();
            score += 8;
            addGaugeDodge();
          }
        }

        if (o.x + o.w < -20){
          o.el.remove();
          obstacles.splice(i, 1);
          obstaclesPassed++;
        }
      }

      score += dt * 12;
      scoreVal.textContent = String(Math.floor(score));
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
