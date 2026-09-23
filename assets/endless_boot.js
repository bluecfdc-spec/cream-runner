// ============================================================================
//  무한질주 모드 부트 로더
// ============================================================================
//  이 파일은 endless.html 에서만 로드된다. 본 게임(index.html)은 읽지 않는다.
//
//  [왜 이런 구조인가]
//  무한질주는 본 게임과 규칙 몇 가지만 다르다. 그래서 game.js를 통째로 복사해 두 벌을
//  관리하는 대신, 원본 game.js를 그대로 받아와서 아래 몇 군데만 바꿔치기한 뒤 실행한다.
//    - 본 게임 파일(game.js)은 단 한 글자도 수정되지 않는다. 읽기만 한다.
//    - 나중에 본 게임이 수정되면 무한질주도 그 수정을 자동으로 물려받는다.
//    - 복사본이 따로 없으니 두 파일이 서로 달라지는 일도 없다.
//
//  [바꾸는 것]
//    1~5) 난이도: 처음부터 빠르게 시작, 2분에 천장 도달 후 고정
//      6) BGM 무한 반복 -> 마지막 곡이 끝나지 않으므로 왕(보스)이 등장하지 않는다
//      7) 순위표를 endless 컬렉션으로 분리
//    8~9) 흑견 연결: 회피 게이지 충전과 매 프레임 갱신을 끼워넣는다
//     10) 악마 패턴 연결: 매 프레임 갱신을 끼워넣는다
//     11) 흑견 본체(assets/dog_module.js)와 악마 패턴(assets/demon_module.js)을
//         game.js 안쪽에 통째로 심는다
//     12) 가족 복귀(라이프) 보너스를 내지 않는다
//     13) 스크롤 속도 상한을 배수로 열어준다 (중력 상한은 game.js가 window로 읽는다)
//      5) 안에서 시작 목숨 상태도 정한다 (무한질주는 크림이 혼자부터 시작)
//  14~16) 쥐/까마귀 판정 박스를 줄이고, 까마귀 그림과 판정의 어긋남을 없앤다
//  그리고 게임을 시작하기 전에 장애물 그림을 미리 받아둔다 (아래 PRELOAD 주석 참고)
//
//  [안전장치]
//  바꿔치기할 문장을 game.js에서 정확히 한 군데도 못 찾거나 두 군데 이상 찾으면,
//  게임을 실행하지 않고 화면에 오류를 띄운 뒤 멈춘다. 어중간하게 반쯤 적용된 상태로
//  돌아가는 일은 없다. (본 게임이 크게 바뀌면 여기가 먼저 걸린다 -> 그때 이 파일을
//  같이 고치면 된다.)
// ============================================================================
(function(){
  "use strict";

  // index.html과 같은 주소/버전을 쓴다. 브라우저 캐시를 공유하므로 추가 다운로드가
  // 사실상 발생하지 않는다.
  var GAME_SRC   = "game.js?v=12";
  // 흑견 본체. 따로 둔 이유는 그냥 읽고 고칠 수 있게 하기 위해서다.
  var DOG_SRC    = "assets/dog_module.js?v=1";
  // 악마 패턴 본체. 최고 속도에 도달한 뒤에만 동작한다.
  var DEMON_SRC  = "assets/demon_module.js?v=1";
  // game.js 실행이 끝난 뒤에 붙일 순위표 파일 (game.js보다 먼저 실행되면 안 된다)
  var AFTER_SRC  = "assets/lb_endless.js?v=1";
  // 흑견 본체를 끼워넣을 자리. game.js 안에서 딱 한 번 나오는 문장이어야 한다.
  var DOG_ANCHOR = "  function activateInvincibility(){";

  var PATCHES = [
    { n: "난이도 램프 계수",
      f: "  var LEVEL_UP_FACTOR = 1.04;",
      r: "  var LEVEL_UP_FACTOR = window.ENDLESS_RAMP_FACTOR || 1.04;" },
    { n: "초반 완만구간 제거",
      f: "  var EASE_WINDOW_SECONDS = 15;",
      r: "  var EASE_WINDOW_SECONDS = 0;" },
    { n: "플래토 제거",
      f: "  var DIFFICULTY_DELAY_SECONDS = 55; // 15 + 55 = 70s",
      r: "  var DIFFICULTY_DELAY_SECONDS = 0;" },
    { n: "난이도 천장",
      f: "      var waveFactor = 1 + SPEED_WAVE_AMPLITUDE * Math.sin((gameTime / SPEED_WAVE_PERIOD) * Math.PI * 2);",
      r: "      if (window.ENDLESS_MAX_MULT && speedMultiplier > window.ENDLESS_MAX_MULT) speedMultiplier = window.ENDLESS_MAX_MULT;\n      var waveFactor = 1 + SPEED_WAVE_AMPLITUDE * Math.sin((gameTime / SPEED_WAVE_PERIOD) * Math.PI * 2);" },
    { n: "시작 배수",
      f: "    if (TEST_MODE){\n      gameTime = TEST_START_SEC;\n      musicRampProgress = 1; // 음악 램프는 이미 다 적용된 상태\n      speedMultiplier = multiplierAtSecond(TEST_START_SEC);\n      lastLevelTime = gameTime;\n      lastLevelCount = 0;\n    }\n",
      r: "    // 무한질주: 중반 속도에서 바로 시작한다. gameTime까지 옮겨야 까마귀/쥐 같은\n    // 장애물 해금이 본 게임과 동일하게 이어진다.\n    gameTime = window.ENDLESS_START_SEC || 140;\n    musicRampProgress = 1; // 음악 램프는 시작 배수에 이미 포함돼 있다\n    speedMultiplier = window.ENDLESS_START_MULT || 3.6;\n    lastLevelTime = gameTime;\n    lastLevelCount = 0;\n    // 목숨 상태. 이 자리는 reset() 이 lifeState = 3 을 넣은 바로 뒤이고, 아래에서\n    // layout() 이 다시 불리므로 판정 박스 오프셋도 같이 맞춰진다.\n    lifeState = window.ENDLESS_START_LIFE || 3;\n    setCharImage(false);   // 첫 프레임부터 그 상태의 달리기 그림으로\n    dogReset();   // 흑견 상태도 초기화\n    demonReset(); // 악마 패턴 타이머도 초기화\n" },
    { n: "BGM 무한반복(=보스 제거)",
      f: "      bgmPlayTrack(bgmQueue[0], { instant: true });",
      r: "      bgmPlayTrack(bgmQueue[0], { instant: true, loop: true });" },
    { n: "순위표 컬렉션 분리",
      f: "  var SCORES_COLLECTION = 'scores';",
      r: "  var SCORES_COLLECTION = window.SCORES_COLLECTION || 'scores';" },
    { n: "흑견 게이지 충전",
      f: "    dodgeGauge++;",
      r: "    dodgeGauge++;\n    dogAddDodge();   // 흑견 게이지도 같은 회피로 함께 찬다" },
    { n: "흑견 매 프레임 갱신",
      f: "      score += dt * 12;",
      r: "      dogUpdate(dt);\n      score += dt * 12;" },
    // 아래 패치가 찾는 문장은 바로 위 패치가 만들어낸 것이다. 순서를 바꾸면 안 된다.
    { n: "악마 패턴 매 프레임 갱신",
      f: "      dogUpdate(dt);",
      r: "      dogUpdate(dt);\n      demonUpdate(dt);" },
    // 흑견을 계속 소환한다. ?demontest 와 ?dogtest 가 "둘 다" 있어야 켜진다.
    // dogtest 만으로 켜지게 두면, 운영 주소에 ?dogtest 를 붙여서 무한 흑견으로 점수를
    // 올릴 수 있다 (점수 컬렉션 우회는 demontest 에만 걸려 있다). 그래서 둘 다 요구한다.
    // 흑견은 악마 패턴의 똥과 까마귀까지 물어 없애므로, 악마만 볼 때는 dogtest 를 뺀다.
    { n: "테스트용 흑견 강제 소환",
      f: "      demonUpdate(dt);",
      r: "      if (/[?&]demontest/.test(location.search) && /[?&]dogtest/.test(location.search) && !dogActive && !invincible) dogGauge = dogMax();\n      demonUpdate(dt);" },
    // 가족 복귀(라이프) 보너스를 내지 않는다. 무한질주는 끝이 없는 버티기 모드라,
    // 잃은 목숨이 돌아오면 사실상 무한 플레이가 된다. 본 게임에는 영향이 없다
    // (이 패치는 endless.html 에서만 적용된다).
    { n: "라이프 보너스 차단",
      f: "      if (!finalPhase && lifeState < 3 && !bonusSpawned && bonusDueAt !== null && gameTime >= bonusDueAt){",
      r: "      if (!window.ENDLESS_NO_LIFE_BONUS && !finalPhase && lifeState < 3 && !bonusSpawned && bonusDueAt !== null && gameTime >= bonusDueAt){" },
    // 스크롤 속도 상한을 배수로 열어준다. 본 게임과 무한질주는 원래 같은 상한
    // (화면폭 x 0.945)에 걸리는데, 무한질주만 더 빠르게 하려면 이 값이 필요하다.
    // 상한만 올리면 "시간 간격"은 그대로라 난이도가 안 오르므로, 중력 상한
    // (GRAVITY_CAP_MULT, game.js 가 이미 window 로 읽는다)도 같이 올려야 한다.
    { n: "속도 상한 배수",
      f: "    MAX_SPEED = Math.max(360, appW * 0.9 * 1.05);",
      r: "    MAX_SPEED = Math.max(360, appW * 0.9 * 1.05) * (window.ENDLESS_SPEED_CAP_MULT || 1);" },
    // ---- 쥐와 까마귀의 판정 박스 -------------------------------------------
    //  game.js 는 똥에만 판정 축소값(hitTop 0.72 / hitSide 0.18)을 주고, 쥐와 까마귀는
    //  기본값(hitSide 0.08, hitTop 없음 = 세로 100%)으로 둔다. 즉 쥐/까마귀는 그림
    //  세로 전체가 판정이라 똥보다 훨씬 엄격했다. 그 두 개에도 조절값을 붙인다.
    //  값은 assets/tune.js 에서 정한다. 값을 안 주면 예전 그대로 동작한다.
    { n: "쥐 판정 박스",
      f: "      obstacles.push({ el: el, x: x, w: dw, h: dh, elevation: 0, type: type, extraSpeed: DOG_EXTRA_SPEED, hop: 0, hops: hardMode() });",
      r: "      obstacles.push({ el: el, x: x, w: dw, h: dh, elevation: 0, type: type, extraSpeed: DOG_EXTRA_SPEED, hop: 0, hops: hardMode(),\n        hitTop: (window.MOUSE_HIT_TOP_FRAC || 1),\n        hitSide: (window.MOUSE_HIT_SIDE_FRAC == null ? 0.08 : window.MOUSE_HIT_SIDE_FRAC) });" },
    { n: "까마귀 판정 박스",
      f: "      obstacles.push({ el: el, x: x, w: crw, h: crh, elevation: 0, type: type });",
      r: "      obstacles.push({ el: el, x: x, w: crw, h: crh, elevation: 0, type: type,\n        hitTop: (window.CROW_HIT_TOP_FRAC || 1),\n        hitSide: (window.CROW_HIT_SIDE_FRAC == null ? 0.08 : window.CROW_HIT_SIDE_FRAC) });" },
    // ---- 까마귀 연출과 판정의 어긋남 ---------------------------------------
    //  까마귀는 그림만 위로 띄우고 판정은 땅에 고정한다 (판정이 움직이면 언제 눌러야
    //  하는지 알 수 없어지므로 의도된 설계다). 문제는 그림이 0으로 내려오는 지점이
    //  charLeftPx, 즉 캐릭터 판정보다 뒤쪽이라는 것이다. 그래서 겹쳐 있는 내내 그림이
    //  판정보다 위에 떠 있었다 - 실측 최대 15.1px, 까마귀 몸통의 3분의 1이다.
    //  ("머리에 닿지도 않았는데 죽는" 느낌의 진짜 원인)
    //  기준점을 캐릭터 판정 쪽으로 옮기면 어긋남이 3.5px 로 줄어든다.
    { n: "까마귀 연출 기준점",
      f: "          var crowDist = Math.abs(o.x - charLeftPx);",
      r: "          var crowDist = Math.abs(o.x - (charLeftPx + (window.CROW_ARC_ANCHOR_CW || 0) * character.offsetWidth));" }
  ];

  function fail(why){
    try {
      var ov = document.getElementById("loadingOverlay");
      if (ov) ov.hidden = true;
      var ss = document.getElementById("startScreen");
      if (ss) ss.hidden = true;
    } catch (e) {}
    var box = document.createElement("div");
    box.style.cssText = "position:fixed;left:0;right:0;top:0;bottom:0;z-index:99999;" +
      "display:flex;align-items:center;justify-content:center;padding:24px;" +
      "background:#0e1626;color:#ffe9b0;font:600 15px/1.7 Nunito,system-ui,sans-serif;" +
      "text-align:center;white-space:pre-line;";
    box.textContent = "무한질주 모드를 불러오지 못했어요.\n\n" + why +
      "\n\n본 게임은 정상입니다. 아래 주소로 가세요.\nbluecfdc-spec.github.io/cream-runner/";
    document.body.appendChild(box);
    if (window.console && console.error) console.error("[endless] " + why);
  }

  function runAfter(){
    var s = document.createElement("script");
    s.src = AFTER_SRC;
    document.body.appendChild(s);
  }

  function grab(url, minLen, label){
    return fetch(url).then(function(res){
      if (!res.ok) throw new Error(label + " 를 받지 못했습니다 (HTTP " + res.status + ")");
      return res.text();
    }).then(function(t){
      if (!t || t.length < minLen) throw new Error(label + " 내용이 이상합니다 (" + (t ? t.length : 0) + "자)");
      return t;
    });
  }

  // ---- 장애물 그림 미리 받기 ------------------------------------------------
  //  무한질주는 시작 즉시 중반 속도라, 첫 장애물이 화면에 들어오는 시점에 브라우저가
  //  아직 그림 파일을 못 받아둔 상태일 수 있다. 그러면 판정은 살아 있는데 화면에는
  //  아무것도 안 보이는 장애물이 지나가서, 보이지 않는 것에 부딪히게 된다. 실제로
  //  "처음 시작할 때 장애물 1~3개가 깜빡이거나 안 보이다가 갑자기 나타난다"는 증상이
  //  이것이었다. 본 게임은 아주 느리게 시작하니 그 사이에 다 받아져서 안 생긴다.
  //  그래서 게임을 시작하기 전에(로딩 화면이 떠 있는 동안) 먼저 받아둔다.
  //  캐릭터 그림은 data: 문자열로 들어 있어 네트워크를 타지 않으므로 대상이 아니다.
  var PRELOAD = [
    "assets/img_poop.png",
    "assets/img_dog_a.png",
    "assets/img_dog_b.png",
    "assets/img_crow_up.png",
    "assets/img_crow_down.png",
    "assets/boss.webp",
    "assets/img_stroller.png",
    "assets/img_star_item.png"
  ];
  //  한 장이라도 느리면 게임이 안 시작되는 일이 없도록 상한 시간을 둔다. 상한을
  //  넘기면 그냥 시작한다 (예전과 같은 상태가 되는 것이므로 더 나빠지지 않는다).
  function preload(urls, capMs){
    return new Promise(function(done){
      var left = urls.length;
      var timer = setTimeout(finish, capMs);
      function finish(){
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
        done(true);
      }
      if (!left) return finish();
      for (var i = 0; i < urls.length; i++){
        var im = new Image();
        im.onload = im.onerror = function(){ if (--left <= 0) finish(); };
        im.src = urls[i];
      }
    });
  }

  function apply(src, find, rep, label){
    var parts = src.split(find);
    if (parts.length !== 2){
      throw new Error("패치 지점을 찾지 못했습니다: " + label +
                      " (" + (parts.length - 1) + "군데 발견, 1군데여야 함)");
    }
    return parts[0] + rep + parts[1];
  }

  if (!window.fetch){ fail("브라우저가 너무 오래되었습니다."); return; }

  Promise.all([
    grab(GAME_SRC, 50000, "game.js"),
    grab(DOG_SRC, 1000, "흑견 본체(dog_module.js)"),
    grab(DEMON_SRC, 1000, "악마 패턴(demon_module.js)"),
    preload(PRELOAD, 4000)
  ]).then(function(got){
    var src = got[0], dog = got[1], demon = got[2];

    for (var i = 0; i < PATCHES.length; i++){
      src = apply(src, PATCHES[i].f, PATCHES[i].r, PATCHES[i].n);
    }
    // 흑견 본체와 악마 패턴을 game.js 안쪽(같은 클로저)에 심는다. 그래야
    // obstacles/score 같은 게임 내부 변수에 접근할 수 있다.
    src = apply(src, DOG_ANCHOR, dog + "\n" + demon + "\n" + DOG_ANCHOR,
                "흑견/악마 본체 삽입 위치");

    // 개발자 도구에서 이 코드가 어느 파일인지 알아볼 수 있게 이름을 붙인다.
    src += "\n//# sourceURL=endless-game.js\n";
    (0, eval)(src);
    runAfter();
  }).catch(function(err){
    fail((err && err.message) ? err.message : String(err));
  });
})();
