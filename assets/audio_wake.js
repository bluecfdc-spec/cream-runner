// ============================================================================
//  효과음 깨우기
// ============================================================================
//  증상: BGM 음소거를 껐다 켜다 하면, BGM 은 다시 나오는데 점프/획득/충돌 효과음만
//        죽어버리는 경우가 있었다.
//
//  원인: BGM 은 <audio> 태그 두 개(#bgm-a, #bgm-b)로 재생되고, 효과음은 Web Audio
//        (AudioContext)로 그 자리에서 만든다. 완전히 다른 장치라서 음소거가
//        효과음을 끄는 일은 원래 없다. 그런데 모바일(특히 iOS)은 페이지에서 나는
//        소리가 전부 멈춰 있는 동안 AudioContext 를 재워버린다(state = suspended).
//        음소거로 음악이 끊긴 사이에 잠들면, 음소거를 풀 때 <audio> 는 다시 울리지만
//        잠든 AudioContext 는 스스로 깨어나지 않는다. 그래서 "BGM 은 나오는데 효과음
//        만 죽는" 상태가 된다. game.js 는 게임을 시작할 때 한 번만 깨우기 때문에
//        그 다음부터는 아무도 깨워주지 않았다.
//
//  고침: 화면을 만진 직후에만 깨우는 것이 허용되므로(브라우저 규칙), 화면 아무 곳을
//        누를 때마다 깨운다. 이미 깨어 있으면 아무 일도 하지 않아서 비용이 없다.
//        음소거 버튼을 누른 그 순간에도 걸리고, 그냥 점프 한 번만 해도 되살아난다.
//        음소거 버튼은 자기 위에서 일어난 이벤트를 멈춰 세우므로(그 탭이 점프로도
//        먹히지 않게), 그보다 먼저 지나가는 캡처 단계에 붙인다.
//
//  깨우는 함수 자체는 game.js 안쪽(클로저)에 갇혀 있어서 밖에서 손이 닿지 않는다.
//  그래서 부트 로더가 window.__creamResumeAudio 로 내보내 준다
//  (assets/main_boot.js / assets/endless_boot.js 의 "효과음 깨우기" 패치).
//  그 함수가 아직 없거나 브라우저가 Web Audio 를 안 쓰면 이 파일은 조용히 아무 일도
//  하지 않는다. game.js 는 한 글자도 고치지 않는다.
// ============================================================================
(function(){
  "use strict";

  if (window.__creamAudioWakeReady) return;
  window.__creamAudioWakeReady = true;

  function wake(){
    try { if (window.__creamResumeAudio) window.__creamResumeAudio(); } catch (e) {}
  }

  ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(function(t){
    try { document.addEventListener(t, wake, true); } catch (e) {}
  });

  // 화면을 다시 켰을 때(다른 앱 갔다 온 뒤)도 한 번 시도해 본다. 사용자 조작이
  // 아니라 브라우저가 거절할 수도 있지만, 거절당해도 다음 탭에서 위 줄이 깨운다.
  try {
    document.addEventListener("visibilitychange", function(){
      if (!document.hidden) wake();
    });
  } catch (e) {}
})();
