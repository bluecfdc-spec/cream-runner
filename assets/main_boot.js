// ============================================================================
//  본 게임(일반 모드) 부트 로더
// ============================================================================
//  index.html 에서 game.js 대신 이 파일을 읽는다. 하는 일은 하나다.
//  game.js 를 "글자"로 받아서 정해진 자리 몇 군데만 바꿔치기한 뒤 실행한다.
//  game.js 파일 자체는 단 한 글자도 수정되지 않는다. 읽기만 한다.
//
//  [왜 이렇게 하나]
//  game.js 는 11만 자가 넘어서 직접 고치다가 한 글자만 어긋나도 게임이 안 돌아간다.
//  무한질주(assets/endless_boot.js)는 이미 이 방식으로 돌아가고 있고, 같은 방식을
//  쓰면 두 모드의 규칙 변경이 정확히 같은 자리에 같은 모양으로 들어간다.
//
//  [바꾸는 것]  - 값은 assets/tune.js 에서 정한다
//    1) 쥐 판정 박스를 줄인다
//    2) 까마귀 판정 박스를 줄인다
//    3) 까마귀 그림과 판정의 어긋남을 없앤다
//    4) 효과음을 밖에서 깨우고/음소거할 수 있게 손잡이를 내보낸다
//    5) 효과음 장치가 만들어졌다고 알린다 (iOS 오디오 세션 붙잡기용)
//    6) 저장해둔 효과음 음소거 설정이 게임을 다시 시작해도 유지되게 한다
//    7) 추가 장애물 패턴(똥쥐똥 / 똥똥)을 장애물 생성부에 연결한다
//  무한질주 쪽 1~3번(14~16)과 완전히 같은 문장이다. 그래서 두 모드의 판정이 같다.
//
//  ★ [안전장치 - 무한질주와 다른 점] ★
//  여기는 본 게임이다. 그래서 "무슨 일이 있어도 게임은 돌아간다"가 1순위다.
//  무한질주는 패치가 곧 게임 규칙이라 하나만 실패해도 멈춰 세우지만, 여기서 바꾸는
//  건 판정을 조금 후하게 해주는 것뿐이다. 못 바꿔도 예전 게임 그대로 돌아가면 된다.
//    - 바꿀 자리를 못 찾으면: 그 패치만 건너뛰고 나머지를 적용한다 (콘솔에 경고).
//    - 바꾼 결과가 문법에 안 맞으면: 패치를 전부 버리고 받아온 원본을 실행한다.
//    - game.js 를 못 받아오면: 예전처럼 <script src="game.js"> 를 그냥 붙인다.
//    - 추가 패턴 파일을 못 받아오면: 그냥 기존 패턴만 나온다.
//  즉 최악의 경우가 "2026-09-24 이전과 똑같은 게임"이다. 게임이 안 뜨는 경우는 없다.
// ============================================================================
(function(){
  "use strict";

  // index.html 이 예전에 쓰던 것과 같은 주소/버전
  var GAME_SRC  = "game.js?v=12";
  // 추가 장애물 패턴 본체 (똥쥐똥 / 똥똥). 무한질주와 완전히 같은 파일을 쓴다.
  // game.js 안쪽(같은 클로저)에 심어야 obstacles 같은 내부 값에 손이 닿는다.
  var PAT_SRC   = "assets/pattern_module.js?v=1";
  var PAT_ANCHOR = "  function activateInvincibility(){";
  // game.js 실행이 끝난 뒤에 붙일 파일들 (game.js 보다 먼저 실행되면 안 된다)
  //   lb_extra.js    순위표 추가 기능 (전체 순위 보기 / 등록 허용 등수)
  //   mode_switch.js 시작 화면의 일반/하드 슬라이딩 스위치
  //   audio_wake.js  잠든 효과음(AudioContext) 깨우기 (아래 4번 패치와 짝)
  //   sfx_icons.js   효과음 버튼 아이콘 (sfx_btn.js 보다 먼저 와야 한다)
  //   sfx_btn.js     효과음 음소거 버튼 (아래 5번 패치와 짝)
  var AFTER_SRC = [
    "assets/lb_extra.js?v=1",
    "assets/mode_switch.js?v=1",
    "assets/audio_wake.js?v=1",
    "assets/sfx_icons.js?v=1",
    "assets/sfx_btn.js?v=1"
  ];

  var PATCHES = [
    // ---- 쥐와 까마귀의 판정 박스 -------------------------------------------
    //  game.js 는 똥에만 판정 축소값(hitTop 0.72 / hitSide 0.18)을 주고, 쥐와 까마귀는
    //  기본값(hitSide 0.08, hitTop 없음 = 세로 100%)으로 둔다. 즉 쥐/까마귀는 그림
    //  세로 전체가 판정이라 똥보다 훨씬 엄격했다. "점프하고 뒷다리가 새 날개에 걸리거나,
    //  머리에 닿지도 않았는데 죽는" 느낌의 절반이 이것이었다.
    { n: "쥐 판정 박스",
      f: "      obstacles.push({ el: el, x: x, w: dw, h: dh, elevation: 0, type: type, extraSpeed: DOG_EXTRA_SPEED, hop: 0, hops: hardMode() });",
      r: "      obstacles.push({ el: el, x: x, w: dw, h: dh, elevation: 0, type: type, extraSpeed: DOG_EXTRA_SPEED, hop: 0, hops: hardMode(),\n        hitTop: (window.MOUSE_HIT_TOP_FRAC || 1),\n        hitSide: (window.MOUSE_HIT_SIDE_FRAC == null ? 0.08 : window.MOUSE_HIT_SIDE_FRAC) });" },
    { n: "까마귀 판정 박스",
      f: "      obstacles.push({ el: el, x: x, w: crw, h: crh, elevation: 0, type: type });",
      r: "      obstacles.push({ el: el, x: x, w: crw, h: crh, elevation: 0, type: type,\n        hitTop: (window.CROW_HIT_TOP_FRAC || 1),\n        hitSide: (window.CROW_HIT_SIDE_FRAC == null ? 0.08 : window.CROW_HIT_SIDE_FRAC) });" },
    // ---- 까마귀 연출과 판정의 어긋남 ---------------------------------------
    //  까마귀는 그림만 위로 띄우고 판정은 땅에 고정한다 (판정이 따라 움직이면 언제
    //  눌러야 하는지 알 수 없어지므로 의도된 설계다). 문제는 그림이 0으로 내려오는
    //  지점이 charLeftPx, 즉 캐릭터 판정보다 뒤쪽이라는 것이다. 그래서 겹쳐 있는 내내
    //  그림이 판정보다 위에 떠 있었다 - 실측 최대 15.1px, 까마귀 몸통의 3분의 1이다.
    //  기준점을 캐릭터 판정 쪽으로 옮기면 어긋남이 3.5px 로 줄어든다.
    { n: "까마귀 연출 기준점",
      f: "          var crowDist = Math.abs(o.x - charLeftPx);",
      r: "          var crowDist = Math.abs(o.x - (charLeftPx + (window.CROW_ARC_ANCHOR_CW || 0) * character.offsetWidth));" },
    // ---- 효과음 깨우기 ------------------------------------------------------
    //  효과음은 Web Audio(AudioContext)로 그 자리에서 만드는데, 모바일은 페이지에서
    //  나는 소리가 전부 멈춰 있는 동안 그 장치를 재워버린다. game.js 는 게임을 시작할
    //  때 한 번만 깨우기 때문에, 음소거로 음악이 끊긴 사이에 잠들면 아무도 다시
    //  깨워주지 않는다. 그게 "껐다 켜면 BGM 은 나오는데 효과음만 죽는" 상태의 원인이다.
    //  깨우는 손잡이가 game.js 안쪽(클로저)에 갇혀 있어서 밖에서 손이 닿지 않으므로,
    //  window 로 내보내기만 한다. 실제로 부르는 쪽은 assets/audio_wake.js 다.
    { n: "효과음 손잡이 내보내기",
      f: "  var audioCtx = null, masterGain = null, sfxGain = null;",
      r: "  var audioCtx = null, masterGain = null, sfxGain = null;\n" +
         "  window.__creamResumeAudio = function(){\n" +
         "    try {\n" +
         "      if (audioCtx && audioCtx.state !== 'running' && audioCtx.resume) audioCtx.resume();\n" +
         "    } catch (e) {}\n" +
         "  };\n" +
         "  window.__creamSetSfxMuted = function(m){\n" +
         "    window.__creamSfxMuted = !!m;\n" +
         "    try {\n" +
         "      if (!sfxGain || !sfxGain.gain) return;\n" +
         "      if (m){\n" +
         "        if (sfxGain.gain.value > 0) window.__creamSfxVol = sfxGain.gain.value;\n" +
         "        sfxGain.gain.value = 0;\n" +
         "      } else {\n" +
         "        sfxGain.gain.value = (window.__creamSfxVol == null ? 0.6 : window.__creamSfxVol);\n" +
         "      }\n" +
         "    } catch (e) {}\n" +
         "  };\n" +
         "  window.__creamRebuildAudio = function(){\n" +
         "    try {\n" +
         "      if (audioCtx && audioCtx.close){ try { audioCtx.close(); } catch (e) {} }\n" +
         "      audioCtx = null; masterGain = null; sfxGain = null;\n" +
         "      ensureAudio();\n" +
         "    } catch (e) {}\n" +
         "  };" },
    // ---- 효과음 장치가 만들어졌다고 알린다 -----------------------------------
    //  assets/audio_wake.js 가 이 알림을 받아서, 들리지 않는 아주 작은 소리를 계속
    //  흘려보내 iOS 의 오디오 세션이 내려가지 않게 붙잡는다. 그게 "BGM 을 끄면 효과음도
    //  같이 죽는" 문제의 진짜 해결책이다 (자세한 설명은 그 파일 머리주석 참고).
    //  장치를 새로 만들 때도 다시 불리므로, 그때 붙잡기도 새 장치에 다시 걸린다.
    { n: "효과음 장치 알림",
      f: "      sfxGain.connect(masterGain);",
      r: "      sfxGain.connect(masterGain);\n" +
         "      try { if (window.__creamAudioReady) window.__creamAudioReady(audioCtx, masterGain, sfxGain); } catch (e) {}" },
    // ---- 효과음 음소거를 계속 유지 -------------------------------------------
    //  효과음 장치(sfxGain)는 게임을 처음 시작할 때 만들어지고, game.js 는 만들면서
    //  0.6 을 넣는다. 그때 사용자가 저장해둔 음소거 설정을 보게 해야, 페이지를 새로
    //  열거나 게임을 다시 시작해도 효과음 음소거가 풀리지 않는다.
    //  (assets/sfx_btn.js 가 표시를 남기고, 여기서 그 표시를 읽는다. 둘은 짝이다)
    { n: "효과음 음소거 유지",
      f: "      sfxGain.gain.value = 0.6;",
      r: "      sfxGain.gain.value = 0.6;\n      if (window.__creamSfxMuted) sfxGain.gain.value = 0;" },
    // ---- 추가 패턴 연결 (똥쥐똥 / 똥똥) ------------------------------------
    //  기존 콤보(똥+쥐)가 나온 경우에는 그 뒤에 똥 하나를 더 붙일지 물어보고,
    //  콤보가 안 나온 평범한 똥에는 바짝 붙는 똥 하나를 붙일지 물어본다.
    //  실제 판단과 간격 계산은 assets/pattern_module.js 가 한다.
    //  모듈이 없으면 typeof 검사에서 걸러져 예전과 똑같이 동작한다.
    { n: "추가 패턴 연결",
      f: "      nextSpawnIn = Math.max(nextSpawnIn, 1450);\n    }\n  }\n",
      r: "      nextSpawnIn = Math.max(nextSpawnIn, 1450);\n" +
         "      if (typeof patAfterCombo === 'function') patAfterCombo(x, pw, ph);\n" +
         "    } else if (!skipCombo && typeof patPoopPair === 'function'){\n" +
         "      patPoopPair(x, pw, ph);\n" +
         "    }\n  }\n" }
  ];

  function note(msg){
    try { if (window.console && console.warn) console.warn("[main_boot] " + msg); } catch (e) {}
  }

  function runAfter(){
    for (var i = 0; i < AFTER_SRC.length; i++){
      var s = document.createElement("script");
      // 코드에서 만든 <script> 는 기본이 async 라 순서가 보장되지 않는다. false 로
      // 두면 위 목록에 적은 순서대로 실행된다 (아이콘 파일이 버튼 파일보다 먼저).
      s.async = false;
      s.src = AFTER_SRC[i];
      document.body.appendChild(s);
    }
  }

  // 마지막 방어선: 예전 index.html 과 똑같이 <script src="game.js"> 를 붙인다.
  // 이 길로 들어오면 판정 패치만 없는 2026-09-24 이전 게임이 된다.
  var started = false;
  function plainScript(why){
    if (started) return;
    started = true;
    note(why + " -> 원본 game.js 를 그대로 붙입니다.");
    var s = document.createElement("script");
    s.src = GAME_SRC;
    s.onload = runAfter;
    s.onerror = function(){ note("원본 game.js 로드도 실패했습니다."); };
    document.body.appendChild(s);
  }

  // 한 군데가 아니면(0군데 또는 2군데 이상) 그 패치만 건너뛴다.
  function applyOne(src, p){
    var parts = src.split(p.f);
    if (parts.length !== 2){
      note("패치 건너뜀: " + p.n + " (" + (parts.length - 1) + "군데 발견, 1군데여야 함)");
      return src;
    }
    return parts[0] + p.r + parts[1];
  }

  // 실행하지 않고 문법만 본다. 통과하면 그 글자로 게임을 돌려도 안전하다.
  function parses(src){
    try { new Function(src); return true; }
    catch (e) { note("문법 검사 실패: " + (e && e.message)); return false; }
  }

  // 추가 패턴 파일은 없어도 게임이 돌아가야 하므로, 실패하면 null 로 넘긴다.
  function grabSoft(url, minLen, label){
    return fetch(url).then(function(res){
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    }).then(function(t){
      if (!t || t.length < minLen) throw new Error("내용이 이상합니다");
      return t;
    }).catch(function(e){
      note(label + " 를 못 받았습니다 (" + ((e && e.message) || e) + ") -> 기존 패턴만 나옵니다.");
      return null;
    });
  }

  if (!window.fetch || !window.Promise){ plainScript("이 브라우저에는 fetch 가 없습니다"); return; }

  Promise.all([
    fetch(GAME_SRC).then(function(res){
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    }),
    grabSoft(PAT_SRC, 500, "추가 패턴(pattern_module.js)")
  ]).then(function(got){
    var src = got[0], pat = got[1];
    if (!src || src.length < 50000) throw new Error("내용이 이상합니다 (" + (src ? src.length : 0) + "자)");
    if (started) return;

    var out = src, i;
    for (i = 0; i < PATCHES.length; i++) out = applyOne(out, PATCHES[i]);
    // 추가 패턴 본체를 game.js 안쪽에 심는다. 자리를 못 찾으면 안 심고 넘어간다
    // (위 "추가 패턴 연결" 패치가 typeof 로 확인하므로 예전 동작이 된다).
    if (pat){
      var ps = out.split(PAT_ANCHOR);
      if (ps.length === 2) out = ps[0] + pat + "\n" + PAT_ANCHOR + ps[1];
      else note("추가 패턴을 심을 자리를 못 찾았습니다 (" + (ps.length - 1) + "군데) -> 기존 패턴만 나옵니다.");
    }
    if (out !== src && !parses(out)){
      note("패치를 모두 버리고 원본을 실행합니다.");
      out = src;
    }

    started = true;
    // 개발자 도구에서 이 코드가 어느 파일인지 알아볼 수 있게 이름을 붙인다.
    out += "\n//# sourceURL=cream-game.js\n";
    (0, eval)(out);
    runAfter();
  }).catch(function(err){
    // eval 까지 갔다가 터진 경우에는 이미 game.js 가 반쯤 실행됐을 수 있으므로,
    // 다시 붙이면 리스너가 두 번 달린다. started 로 그 경우를 막는다.
    if (started){
      note("게임 실행 중 오류: " + ((err && err.message) ? err.message : String(err)));
      try { runAfter(); } catch (e) {}
      return;
    }
    plainScript("game.js 를 받지 못했습니다 (" + ((err && err.message) ? err.message : String(err)) + ")");
  });
})();
