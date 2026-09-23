// ============================================================================
//  효과음 살려두기  (BGM 음소거와 효과음을 완전히 끊어놓는 장치)
// ============================================================================
//  증상: BGM 음소거를 누르면 효과음까지 같이 죽는다.
//
//  원인 (2026-09-24 재진단)
//  --------------------------------------------------------------------------
//  BGM 은 <audio> 태그, 효과음은 Web Audio(AudioContext)로 서로 완전히 다른 장치다.
//  game.js 를 봐도 BGM 이 AudioContext 를 지나는 곳은 한 군데도 없다. 그런데도 같이
//  죽는 이유는 둘 위에 하나 더 있는 층 때문이다 - 모바일(특히 iOS)의 "오디오 세션".
//  페이지에서 나는 소리가 전부 멈추면 iOS 는 이 페이지의 오디오 세션을 내려버린다.
//  BGM 을 음소거하면 페이지가 완전한 무음이 되고(효과음은 점프할 때만 잠깐 난다),
//  그 순간 세션이 내려가서 효과음 장치가 소리를 못 낸다.
//
//  제일 골치 아픈 부분: 이때 장치는 state 를 'running' 이라고 보고한다. 살아있다고
//  거짓말을 한다. 그래서 "잠들었으면 깨운다"는 식의 처리로는 아무 일도 일어나지 않는다.
//  (아침에 넣은 첫 판이 정확히 그 함정에 빠졌다)
//
//  고침 - 세 겹으로 막는다
//  --------------------------------------------------------------------------
//  1) 세션이 내려가지 않게 붙잡는다 (제일 중요)
//     장치가 만들어지는 즉시, 사람 귀에 안 들리는 아주 작은 소리를 계속 흘려보낸다.
//     30Hz, -80dB. 스피커가 거의 못 내는 낮은 음이라 들리지 않지만, iOS 는 이 페이지가
//     계속 소리를 내고 있다고 보므로 세션을 내리지 않는다. BGM 을 꺼도 페이지는 완전한
//     무음이 아니게 되고, 그래서 효과음이 죽을 이유 자체가 없어진다.
//  2) 죽었는지 확실하게 알아낸다
//     진짜 돌아가는 장치는 자기 시계(currentTime)가 흐른다. 거짓 보고 상태는 시계가
//     멈춰 있다. 0.4초마다 시계를 보고, 0.8초 넘게 안 움직이면 죽은 것으로 판정한다.
//  3) 죽었으면 되살린다
//     - 잠든 상태면 깨운다 (resume).
//     - 'running' 이라고 거짓말하는 상태면 껐다 켠다 (suspend -> resume).
//     - 그래도 시계가 안 흐르면 장치를 아예 새로 만든다 (부트 로더가 내보내 준
//       __creamRebuildAudio). 새로 만드는 건 화면을 만진 직후에만 통하므로, 죽은 걸
//       미리 알아두고 사용자의 "다음 탭"에서 즉시 새로 만든다. 점프 한 번이면 된다.
//  그리고 BGM 음소거 버튼을 누른 그 순간에도 위 처리를 한 번 돌린다. 그 버튼은 자기
//  위의 이벤트를 멈춰 세우므로, 그보다 먼저 지나가는 캡처 단계에 붙는다.
//
//  game.js 는 한 글자도 고치지 않는다. 부트 로더가 끼워넣은 세 손잡이만 쓴다
//  (__creamResumeAudio / __creamRebuildAudio / __creamAudioReady).
//  손잡이가 없는 옛 버전에서도 조용히 아무 일도 하지 않으므로 안전하다.
//
//  ?audiodbg=1 을 주소 끝에 붙이면 화면 왼쪽 아래에 상태가 보인다. 증상이 또 나오면
//  그 숫자를 보면 원인이 바로 드러난다.
// ============================================================================
(function(){
  "use strict";

  if (window.__creamAudioWakeReady) return;
  window.__creamAudioWakeReady = true;

  var ctx = null, keepOsc = null;
  var clockT = -1, clockAt = 0, dead = false;
  var DBG = /[?&]audiodbg/.test(location.search);
  var box = null;

  // ---- 1) 들리지 않는 소리로 오디오 세션을 붙잡아 둔다 ----------------------
  function keepAlive(){
    if (!ctx || keepOsc) return;
    try {
      var g = ctx.createGain();
      g.gain.value = 0.0001;          // -80dB. 사람 귀에 안 들린다.
      g.connect(ctx.destination);
      keepOsc = ctx.createOscillator();
      keepOsc.type = "sine";
      keepOsc.frequency.value = 30;   // 스피커가 거의 못 내는 낮은 음
      keepOsc.connect(g);
      keepOsc.start();
    } catch (e) { keepOsc = null; }
  }

  // 부트 로더 패치가 효과음 장치를 만든 직후 이걸 불러준다 (새로 만들 때도 다시 불린다)
  window.__creamAudioReady = function(c){
    ctx = c || null;
    keepOsc = null;
    clockT = -1; clockAt = 0; dead = false;
    keepAlive();
  };

  // ---- 2) 시계를 보고 죽었는지 판정한다 ------------------------------------
  function watch(){
    if (ctx){
      var t = ctx.currentTime, now = Date.now();
      if (t !== clockT){ clockT = t; clockAt = now; dead = false; }
      else if (clockAt && now - clockAt > 800){ dead = true; }
      if (ctx.state !== "running") dead = true;
    }
    if (DBG) render();
  }

  // ---- 3) 되살리기 ---------------------------------------------------------
  function resume(){
    try { if (window.__creamResumeAudio) window.__creamResumeAudio(); } catch (e) {}
  }
  function cycle(){          // 'running' 이라고 거짓말하는 상태를 껐다 켠다
    if (!ctx || !ctx.suspend) return;
    try {
      var p = ctx.suspend();
      if (p && p.then) p.then(function(){ try { ctx.resume(); } catch (e) {} });
      else try { ctx.resume(); } catch (e) {}
    } catch (e) {}
  }
  function rebuild(){        // 마지막 수단: 장치를 새로 만든다 (탭 안에서만 통한다)
    try { if (window.__creamRebuildAudio) window.__creamRebuildAudio(); } catch (e) {}
  }

  // 화면을 만진 그 순간에 처리한다. 이미 죽은 걸 알고 있으면 바로 새로 만든다.
  function onTap(ev){
    resume();
    if (dead) { rebuild(); dead = false; }
    var t = ev && ev.target;
    var onMute = false;
    try { onMute = !!(t && t.closest && t.closest("#bgmMuteBtn")); } catch (e) {}
    if (onMute){
      // mute_btn.js 가 muted 를 바꾼 다음에 한 번 더 손을 본다.
      setTimeout(function(){ resume(); cycle(); }, 120);
    }
  }

  ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(function(t){
    try { document.addEventListener(t, onTap, true); } catch (e) {}
  });

  try {
    document.addEventListener("visibilitychange", function(){
      if (!document.hidden) { resume(); }
    });
  } catch (e) {}

  setInterval(watch, 400);

  // ---- 상태 보기 (?audiodbg=1) --------------------------------------------
  function render(){
    if (!box){
      box = document.createElement("div");
      box.style.cssText = "position:fixed;left:6px;bottom:6px;z-index:99999;" +
        "background:rgba(0,0,0,.78);color:#9fe8b0;font:600 10px/1.45 monospace;" +
        "padding:6px 8px;border-radius:6px;white-space:pre;pointer-events:none;";
      (document.body || document.documentElement).appendChild(box);
    }
    var a = document.getElementById("bgm-a");
    box.textContent =
      "장치   : " + (ctx ? ctx.state : "아직 없음") + "\n" +
      "시계   : " + (ctx ? ctx.currentTime.toFixed(2) : "-") + (dead ? "  <-- 죽음" : "  (정상)") + "\n" +
      "붙잡기 : " + (keepOsc ? "켜짐" : "꺼짐") + "\n" +
      "효과음 : " + (window.__creamSfxMuted ? "음소거" : "켜짐") + "\n" +
      "BGM    : " + (a ? (a.muted ? "음소거" : "켜짐") : "-") + "\n" +
      "손잡이 : " + (window.__creamRebuildAudio ? "O" : "X");
  }
})();
