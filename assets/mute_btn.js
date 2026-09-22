// ============================================================================
//  BGM 음소거 버튼
// ============================================================================
//  배경음악(BGM)만 껐다 켠다. 점프/획득/충돌 효과음은 그대로 살아있다.
//  BGM은 <audio> 태그 두 개(#bgm-a, #bgm-b)로 재생되고 효과음은 Web Audio로
//  합성되기 때문에, <audio> 쪽만 음소거하면 정확히 음악만 꺼진다.
//
//  game.js를 전혀 건드리지 않는다. DOM만 만지므로 본 게임에 붙여도 안전하다.
//  설정은 브라우저에 저장돼서 다음에 들어와도 유지된다.
//
//  아이콘은 홍균이 준 이미지를 56x56으로 줄여 base64로 심어둔 것이다
//  (이 프로젝트가 이미지 파일을 텍스트로 올릴 때 쓰는 방식과 동일).
// ============================================================================
(function(){
  "use strict";

  var KEY = "creamRunnerBgmMuted";
  var IMG_ON  = "data:image/webp;base64,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";
  var IMG_OFF = "data:image/webp;base64,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";

  var hud = document.getElementById("bgmHud");
  if (!hud) return;

  var els = [document.getElementById("bgm-a"), document.getElementById("bgm-b")];

  function saved(){
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function save(v){
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {}
  }

  var muted = saved();

  var btn = document.createElement("button");
  btn.type = "button";
  btn.id = "bgmMuteBtn";
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
    for (var i = 0; i < els.length; i++){
      if (els[i]) els[i].muted = muted;
    }
    icon.src = muted ? IMG_OFF : IMG_ON;
    btn.setAttribute("aria-label", muted ? "배경음악 켜기" : "배경음악 끄기");
    btn.title = muted ? "배경음악 켜기" : "배경음악 끄기 (효과음은 유지)";
  }

  btn.addEventListener("click", function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    muted = !muted;
    save(muted);
    apply();
  });
  // 버튼을 눌렀을 때 그 탭이 점프로도 먹히지 않게 막는다.
  ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(function(t){
    btn.addEventListener(t, function(ev){ ev.stopPropagation(); });
  });

  hud.insertBefore(btn, hud.firstChild);
  apply();

  // 음소거 상태는 <audio>가 새 곡을 로드해도 유지되지만, 혹시 어딘가에서 muted가
  // 풀리더라도 곧 되돌아오도록 가볍게 지켜본다 (2초마다, 비용 거의 없음).
  setInterval(function(){
    for (var i = 0; i < els.length; i++){
      if (els[i] && els[i].muted !== muted) els[i].muted = muted;
    }
  }, 2000);
})();
