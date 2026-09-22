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
  var GAME_SRC = "game.js?v=12";
  // game.js 실행이 끝난 뒤에 붙일 순위표 파일 (game.js보다 먼저 실행되면 안 된다)
  var AFTER_SRC = "assets/lb_endless.js?v=1";

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
      r: "    // 무한질주: 중반 속도에서 바로 시작한다. gameTime까지 옮겨야 까마귀/쥐 같은\n    // 장애물 해금이 본 게임과 동일하게 이어진다.\n    gameTime = window.ENDLESS_START_SEC || 140;\n    musicRampProgress = 1; // 음악 램프는 시작 배수에 이미 포함돼 있다\n    speedMultiplier = window.ENDLESS_START_MULT || 3.6;\n    lastLevelTime = gameTime;\n    lastLevelCount = 0;\n" },
    { n: "BGM 무한반복(=보스 제거)",
      f: "      bgmPlayTrack(bgmQueue[0], { instant: true });",
      r: "      bgmPlayTrack(bgmQueue[0], { instant: true, loop: true });" },
    { n: "순위표 컬렉션 분리",
      f: "  var SCORES_COLLECTION = 'scores';",
      r: "  var SCORES_COLLECTION = window.SCORES_COLLECTION || 'scores';" }
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

  if (!window.fetch){ fail("브라우저가 너무 오래되었습니다."); return; }

  fetch(GAME_SRC).then(function(res){
    if (!res.ok) throw new Error("game.js 를 받지 못했습니다 (HTTP " + res.status + ")");
    return res.text();
  }).then(function(src){
    if (!src || src.length < 50000) throw new Error("game.js 내용이 이상합니다 (" + (src ? src.length : 0) + "바이트)");

    for (var i = 0; i < PATCHES.length; i++){
      var p = PATCHES[i];
      // split 으로 쪼개면 일치 개수를 세는 것과 치환을 한 번에 할 수 있고,
      // 치환 문자열 안의 $ 기호가 특수문자로 해석되는 사고도 없다.
      var parts = src.split(p.f);
      if (parts.length !== 2){
        throw new Error("패치 지점을 찾지 못했습니다: " + p.n +
                        " (" + (parts.length - 1) + "군데 발견, 1군데여야 함)");
      }
      src = parts[0] + p.r + parts[1];
    }

    // 개발자 도구에서 이 코드가 어느 파일인지 알아볼 수 있게 이름을 붙인다.
    src += "\n//# sourceURL=endless-game.js\n";
    (0, eval)(src);
    runAfter();
  }).catch(function(err){
    fail((err && err.message) ? err.message : String(err));
  });
})();
