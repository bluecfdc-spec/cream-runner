// ============================================================================
//  효과음 살려두기  (BGM 음소거와 효과음을 완전히 끊어놓는 장치)
// ============================================================================
//  증상: BGM 음소거를 누르면 효과음까지 같이 죽는다.
//
//  원인 (2026-09-24, 실제 기기 화면으로 확인)
//  --------------------------------------------------------------------------
//  이 문제는 프로그램 쪽 문제가 아니었다. 실제 폰에서 상태를 띄워보니 효과음 장치는
//  running, 자기 시계도 정상으로 흐르고, 효과음 음소거도 꺼진 상태였다. 그런데도
//  소리가 안 났다. 즉 소리를 만드는 쪽은 멀쩡하고, OS 가 그 소리를 버리고 있었다.
//
//  폰이 무음(벨 꺼짐) 모드일 때, OS 는 "진짜 <audio> 가 지금 소리를 내고 있는
//  페이지"만 미디어 재생으로 대접해서 무음 스위치를 무시해준다. BGM 을 음소거하면
//  소리 내는 <audio> 가 하나도 없어지므로 페이지가 일반 등급으로 떨어지고, 그때부터
//  효과음(Web Audio)은 OS 단계에서 잘린다. BGM 을 켜면 다시 들리는 이유도 이것이다.
//  Web Audio 로 작은 소리를 흘려보내는 방식(첫 판)은 그 소리도 같이 잘리므로 소용이
//  없었다.
//
//  고침
//  --------------------------------------------------------------------------
//  들리지 않는 오디오 "파일" 하나를 <audio> 로 계속 재생한다 (assets/silence_mp3.js).
//  그러면 BGM 을 끄든 켜든 페이지에는 항상 소리를 내는 <audio> 가 있으므로 미디어
//  재생 등급이 유지되고, 효과음이 OS 에 잘리지 않는다. 사람 귀에는 아무것도 들리지
//  않는다 (40Hz, -62dB).
//  이 파일은 절대 음소거하지 않는다. BGM 음소거 버튼은 #bgm-a / #bgm-b 만 건드리므로
//  서로 간섭하지 않는다.
//
//  그 아래로 예전에 넣은 안전장치들도 그대로 둔다 (있어서 나쁠 게 없다):
//    - 장치가 잠들면 깨운다 (resume)
//    - 'running' 이라고 거짓 보고하는 상태면 껐다 켠다 (suspend -> resume)
//    - 시계가 멈춰 있으면 장치를 새로 만든다 (__creamRebuildAudio)
//    - Web Audio 쪽에도 아주 작은 소리를 계속 흘려 세션을 붙잡아 둔다
//
//  game.js 는 한 글자도 고치지 않는다. 부트 로더가 끼워넣은 세 손잡이만 쓴다.
//
//  ?audiodbg=1 을 주소 끝에 붙이면 화면 왼쪽 아래에 상태가 보인다.
// ============================================================================
(function(){
  "use strict";

  if (window.__creamAudioWakeReady) return;
  window.__creamAudioWakeReady = true;

  var ctx = null, keepOsc = null;
  var clockT = -1, clockAt = 0, dead = false;
  var quiet = null, quietTried = 0, quietOk = false;
  var DBG = /[?&]audiodbg/.test(location.search);
  var box = null;

  // ---- 1) 들리지 않는 오디오 파일을 계속 재생한다 (핵심) --------------------
  //  파일 내용(base64 mp3)은 assets/silence_mp3.js 에 들어 있다. 부트 로더의 목록을
  //  건드리지 않도록 이 파일이 직접 불러온다. 못 받아오면 아래 보조 장치만 동작한다.
  var QUIET_SRC = "assets/silence_mp3.js?v=1";
  var quietAsked = false;
  function loadQuietData(){
    if (window.CREAM_QUIET_MP3 || quietAsked) return;
    quietAsked = true;
    try {
      var s = document.createElement("script");
      s.src = QUIET_SRC;
      s.onload = function(){ makeQuiet(); playQuiet(); };
      (document.body || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  function makeQuiet(){
    if (quiet) return;
    if (!window.CREAM_QUIET_MP3){ loadQuietData(); return; }
    try {
      quiet = document.createElement("audio");
      quiet.id = "creamQuiet";
      quiet.loop = true;
      quiet.preload = "auto";
      quiet.setAttribute("playsinline", "");
      quiet.src = window.CREAM_QUIET_MP3;
      quiet.volume = 1;      // 파일 자체가 거의 무음이다. 음소거하면 의미가 없어진다.
      quiet.muted = false;
      (document.body || document.documentElement).appendChild(quiet);
    } catch (e) { quiet = null; }
  }

  function playQuiet(){
    if (!quiet) makeQuiet();
    if (!quiet) return;
    try {
      quiet.muted = false;
      if (quiet.paused){
        quietTried++;
        var p = quiet.play();
        if (p && p.then) p.then(function(){ quietOk = true; }, function(){ quietOk = false; });
        else quietOk = true;
      } else {
        quietOk = true;
      }
    } catch (e) { quietOk = false; }
  }

  // ---- 2) Web Audio 쪽 세션 붙잡기 (보조) ----------------------------------
  function keepAlive(){
    if (!ctx || keepOsc) return;
    try {
      var g = ctx.createGain();
      g.gain.value = 0.0001;          // -80dB. 사람 귀에 안 들린다.
      g.connect(ctx.destination);
      keepOsc = ctx.createOscillator();
      keepOsc.type = "sine";
      keepOsc.frequency.value = 30;
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
    playQuiet();
  };

  // ---- 3) 장치가 죽었는지 보고, 죽었으면 되살린다 --------------------------
  function watch(){
    if (ctx){
      var t = ctx.currentTime, now = Date.now();
      if (t !== clockT){ clockT = t; clockAt = now; dead = false; }
      else if (clockAt && now - clockAt > 800){ dead = true; }
      if (ctx.state !== "running") dead = true;
    }
    if (quiet && quiet.paused) quietOk = false;
    if (DBG) render();
  }

  function resume(){
    try { if (window.__creamResumeAudio) window.__creamResumeAudio(); } catch (e) {}
  }
  function cycle(){
    if (!ctx || !ctx.suspend) return;
    try {
      var p = ctx.suspend();
      if (p && p.then) p.then(function(){ try { ctx.resume(); } catch (e) {} });
      else try { ctx.resume(); } catch (e) {}
    } catch (e) {}
  }
  function rebuild(){
    try { if (window.__creamRebuildAudio) window.__creamRebuildAudio(); } catch (e) {}
  }

  // 화면을 만진 그 순간에 처리한다. 무음 파일 재생은 사용자 조작 직후에만 허용되므로
  // 매번 여기서 확인한다 (이미 재생 중이면 아무 일도 하지 않는다).
  function onTap(ev){
    playQuiet();
    resume();
    if (dead) { rebuild(); dead = false; }
    var t = ev && ev.target, onMute = false;
    try { onMute = !!(t && t.closest && t.closest("#bgmMuteBtn")); } catch (e) {}
    if (onMute){
      setTimeout(function(){ playQuiet(); resume(); cycle(); }, 120);
    }
  }

  ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(function(t){
    try { document.addEventListener(t, onTap, true); } catch (e) {}
  });

  try {
    document.addEventListener("visibilitychange", function(){
      if (!document.hidden) { playQuiet(); resume(); }
    });
  } catch (e) {}

  loadQuietData();
  makeQuiet();
  setInterval(watch, 400);

  // ---- 상태 보기 (?audiodbg=1) --------------------------------------------
  function render(){
    if (!box){
      box = document.createElement("div");
      box.style.cssText = "position:fixed;left:6px;bottom:6px;z-index:99999;" +
        "background:rgba(0,0,0,.8);color:#9fe8b0;font:600 10px/1.45 monospace;" +
        "padding:6px 8px;border-radius:6px;white-space:pre;pointer-events:none;";
      (document.body || document.documentElement).appendChild(box);
    }
    var a = document.getElementById("bgm-a");
    box.textContent =
      "무음파일: " + (!quiet ? "없음" : (quiet.paused ? "멈춤" : "재생중")) +
        "  (시도 " + quietTried + ")\n" +
      "장치   : " + (ctx ? ctx.state : "아직 없음") + "\n" +
      "시계   : " + (ctx ? ctx.currentTime.toFixed(2) : "-") + (dead ? "  <-- 죽음" : "  (정상)") + "\n" +
      "효과음 : " + (window.__creamSfxMuted ? "음소거" : "켜짐") + "\n" +
      "BGM    : " + (a ? (a.muted ? "음소거" : "켜짐") : "-");
  }
})();
