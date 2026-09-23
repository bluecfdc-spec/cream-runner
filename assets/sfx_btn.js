// ============================================================================
//  효과음 음소거 버튼  (BGM 음소거 버튼과 완전히 별개)
// ============================================================================
//  왜 버튼을 둘로 나눴나
//  --------------------------------------------------------------------------
//  BGM 은 <audio> 태그 두 개(#bgm-a, #bgm-b)로, 효과음은 Web Audio 로 그 자리에서
//  만든다. game.js 를 확인해보니 효과음은 전부 sfxGain(기본 0.6) 한 노드만 지나고,
//  BGM 은 AudioContext 를 아예 지나지 않는다 (createMediaElementSource 가 한 군데도
//  없다). 그래서 이 둘은 서로를 건드리지 않고 따로 끌 수 있다.
//    BGM 음소거   = <audio>.muted           -> assets/mute_btn.js (음표 아이콘)
//    효과음 음소거 = sfxGain.gain.value = 0  -> 이 파일 (스피커 아이콘)
//
//  ★ 한 번 정한 설정은 다시 안 바뀐다 ★
//  이게 이 파일에서 제일 중요한 부분이다. 매번 다시 누르게 만들면 안 된다.
//    1) 설정을 localStorage 에 저장한다. 그래서 새로고침, 게임 다시하기, 일반<->하드
//       모드 이동, 브라우저를 껐다 켜도 그대로다 (두 페이지가 같은 주소라 저장소를
//       공유한다).
//    2) 효과음 장치(sfxGain)는 게임을 처음 시작할 때 만들어진다. 이 파일은 그보다
//       먼저 실행되므로, 값을 직접 넣는 대신 window.__creamSfxMuted 라는 표시만
//       남긴다. 부트 로더가 game.js 에 끼워넣은 "효과음 음소거 유지" 패치가 장치를
//       만드는 순간 그 표시를 보고 0 으로 시작한다. (부트 로더의 두 패치와 이 파일은
//       짝이다. 한쪽만 있으면 설정이 안 먹는다)
//    3) 그래도 혹시 어딘가에서 값이 되돌아가면 2초마다 다시 눌러 앉힌다. 음소거를
//       켜둔 동안만 감시하므로 평소에는 아무 일도 하지 않는다.
//
//  game.js 는 한 글자도 건드리지 않는다. DOM 과 window 만 만진다.
//  아이콘은 assets/sfx_icons.js 에 들어 있다 (이 파일보다 먼저 로드되어야 한다).
// ============================================================================
(function(){
  "use strict";

  var KEY = "creamRunnerSfxMuted";
  var IMG_ON  = window.SFX_ICON_ON;
  var IMG_OFF = window.SFX_ICON_OFF;

  var hud = document.getElementById("bgmHud");
  if (!hud) return;
  if (!IMG_ON || !IMG_OFF) return;                     // 아이콘 파일이 안 왔으면 붙이지 않는다
  if (document.getElementById("sfxMuteBtn")) return;   // 두 번 붙는 것 방지

  function saved(){
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function save(v){
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {}
  }

  var muted = saved();

  // 효과음 장치가 아직 없어도 표시를 먼저 남긴다. 위 주석 2) 참고.
  window.__creamSfxMuted = muted;

  // ---- 버튼 ----------------------------------------------------------------
  //  BGM 음소거 버튼과 똑같은 모양/크기로 만든다. 나란히 있어야 한 세트로 읽힌다.
  var btn = document.createElement("button");
  btn.type = "button";
  btn.id = "sfxMuteBtn";
  btn.style.cssText = [
    "flex:0 0 auto",
    "width:26px",
    "height:26px",
    "padding:0",
    "border:0",
    "border-radius:50%",
    "background:rgba(255,255,255,.82)",
    "box-shadow:0 1px 3px rgba(0,0,0,.35)",
    "cursor:pointer",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "-webkit-tap-highlight-color:transparent"
  ].join(";");

  var icon = document.createElement("img");
  icon.alt = "";
  icon.style.cssText = "width:17px;height:17px;display:block;pointer-events:none";
  btn.appendChild(icon);

  function apply(){
    window.__creamSfxMuted = muted;
    try { if (window.__creamSetSfxMuted) window.__creamSetSfxMuted(muted); } catch (e) {}
    icon.src = muted ? IMG_OFF : IMG_ON;
    btn.setAttribute("aria-label", muted ? "효과음 켜기" : "효과음 끄기");
    btn.title = muted ? "효과음 켜기" : "효과음 끄기 (배경음악은 유지)";
  }

  btn.addEventListener("click", function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    muted = !muted;
    save(muted);
    apply();
  });
  // 버튼을 눌렀을 때 그 탭이 점프로도 먹히지 않게 막는다 (BGM 버튼과 동일).
  ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(function(t){
    btn.addEventListener(t, function(ev){ ev.stopPropagation(); });
  });

  // ---- 자리 ----------------------------------------------------------------
  //  #bgmHud 는 [BGM버튼][CD][곡명] 이 오른쪽 끝에 붙어 있는 가로줄이다. 효과음
  //  버튼을 BGM 버튼 바로 오른쪽에 끼운다 -> [BGM][효과음][CD][곡명].
  //  줄이 오른쪽 끝에 고정돼 있어서 버튼이 하나 늘면 줄 전체가 왼쪽으로 밀려 점수판과
  //  붙는다. 그래서 늘어난 만큼(버튼 26 + 간격 6 = 32px) 곡명 칸의 최대 너비를
  //  150 -> 118 로 줄인다. 줄 전체 너비는 예전과 똑같이 유지되고, 곡명 칸만 오른쪽으로
  //  당겨 앉는다. 곡명은 원래 흐르는 글씨라 칸이 좁아져도 다 읽힌다.
  //  (style.css 는 건드리지 않는다. 같은 #id 규칙을 나중에 얹으면 이긴다)
  if (!document.getElementById("sfxBtnCss")){
    var css = document.createElement("style");
    css.id = "sfxBtnCss";
    css.textContent = "#bgmTitleWrap{max-width:118px;}";
    document.head.appendChild(css);
  }

  function place(){
    var first = document.getElementById("bgmMuteBtn");
    if (first && first.parentNode === hud) hud.insertBefore(btn, first.nextSibling);
    else hud.insertBefore(btn, hud.firstChild);
    apply();
  }

  //  BGM 버튼이 이 파일보다 늦게 붙는 경우를 위해 잠깐 기다려 본다. 끝내 없으면 맨
  //  앞에 넣는다 - 자리만 바뀌고 동작에는 문제가 없다.
  var tries = 0;
  (function wait(){
    if (document.getElementById("bgmMuteBtn") || tries++ > 20) return place();
    setTimeout(wait, 100);
  })();

  // ---- 설정 지킴이 ---------------------------------------------------------
  //  음소거를 켜둔 동안만, 2초마다 값을 다시 눌러 앉힌다. 이미 맞으면 아무 일도
  //  일어나지 않으므로 비용은 사실상 없다.
  setInterval(function(){
    if (!muted) return;
    try { if (window.__creamSetSfxMuted) window.__creamSetSfxMuted(true); } catch (e) {}
  }, 2000);
})();
