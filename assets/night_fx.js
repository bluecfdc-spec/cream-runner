// ============================================================================
//  밤하늘 별똥별 연출  (무한질주 전용)
// ============================================================================
//  상단 하늘에서 반짝이던 별 하나가 가끔 "떨어져서" 게임 화면까지 흘러내린다.
//
//  game.js를 전혀 건드리지 않는다. 화면 맨 위에 투명한 레이어 하나를 덮고
//  거기에만 그리므로, 게임 로직/판정/성능에 영향이 없다.
//    - pointer-events:none  -> 터치가 그대로 게임으로 통과한다 (점프 안 막힘)
//    - z-index 4: 하늘/구름 위, 점수판(5)/장애물(7)/캐릭터(8)/카드(10) 아래.
//      그래서 카드를 가리지 않고, 별똥별이 캐릭터 뒤로 지나간다.
//    - CSS transform 애니메이션이라 매 프레임 자바스크립트가 도는 일이 없다
//    - 탭이 백그라운드로 가면 멈춘다
//
//  #topSpace 와 #app 은 각각 overflow:hidden 이라 그 안에서는 경계를 넘지 못한다.
//  그래서 레이어를 #stage 바로 아래에 두어 하늘과 게임 화면을 가로지르게 한다.
// ============================================================================
(function(){
  "use strict";

  // ---- 점수판 글자색 (무한질주에서만) --------------------------------------
  //  밤 테마에서 상단 점수판 글자가 흰색으로 바뀌어 크림색 판 위에서 거의 안 보였다.
  //  일반 모드와 똑같이 어두운 글자로 되돌린다. 글자색만 바꾸고 판 모양/배경/위치는
  //  손대지 않는다. 무엇이 흰색으로 만들고 있든 확실히 이기도록 !important 를 쓴다
  //  (style.css 와 endless.html 은 건드리지 않는다는 원칙 유지).
  (function(){
    if (document.getElementById('scoreInkCss')) return;
    var c = document.createElement('style');
    c.id = 'scoreInkCss';
    c.textContent =
      '#scoreBox{color:#1f2b3d !important;}' +
      '#scoreBox span{color:#1f2b3d !important;}';
    document.head.appendChild(c);
  })();

  var stage = document.getElementById('stage');
  if (!stage) return;

  // 떨어지는 간격(밀리초). 너무 잦으면 산만해진다.
  var MIN_GAP = 5000;
  var MAX_GAP = 13000;
  var FALL_MS = 1100;   // 떨어지는 데 걸리는 시간

  var layer = document.createElement('div');
  layer.id = 'nightFxLayer';
  layer.style.cssText = [
    'position:absolute',
    'left:0', 'top:0', 'width:100%', 'height:100%',
    'pointer-events:none',
    'overflow:hidden',
    'z-index:4'
  ].join(';');
  stage.appendChild(layer);

  var style = document.createElement('style');
  style.textContent =
    '@keyframes shootFall{' +
      'from{ transform:translate3d(0,0,0); opacity:0; }' +
      '12%{ opacity:1; }' +
      '75%{ opacity:.85; }' +
      'to{ transform:translate3d(var(--sx),var(--sy),0); opacity:0; }' +
    '}' +
    '#nightFxLayer .shoot{' +
      'position:absolute;width:3px;height:3px;border-radius:50%;' +
      'background:#fff;' +
      'box-shadow:0 0 6px 2px rgba(255,255,255,.85);' +
      'animation:shootFall var(--dur) cubic-bezier(.25,.5,.5,1) forwards;' +
    '}' +
    '#nightFxLayer .shoot::after{' +
      'content:"";position:absolute;right:1px;top:0;' +
      'width:var(--tail);height:3px;border-radius:3px;' +
      'transform-origin:100% 50%;transform:rotate(var(--ang));' +
      'background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.4) 45%,rgba(255,255,255,.95) 100%);' +
      'box-shadow:0 0 5px rgba(255,255,255,.45);' +
    '}';
  document.head.appendChild(style);

  function rand(a, b){ return a + Math.random() * (b - a); }

  function shoot(){
    // 실제로 떠 있는 별 하나를 골라서, 그 별이 떨어지는 것처럼 보이게 한다.
    var stars = document.querySelectorAll('#topSpace .star');
    if (!stars.length) return;

    var gr = stage.getBoundingClientRect();
    if (!gr.width || !gr.height) return;

    // 왼쪽 아래로 흐르기 때문에, 화면 왼쪽에 있는 별에서 출발하면 금방 화면을 벗어난다.
    // 그래서 가로 3분의 1 지점보다 오른쪽에 있는 별들 중에서 고른다.
    var pool = [];
    for (var k = 0; k < stars.length; k++){
      if (stars[k].getBoundingClientRect().left - gr.left > gr.width * 0.32) pool.push(stars[k]);
    }
    if (!pool.length) pool = Array.prototype.slice.call(stars);

    var src = pool[(Math.random() * pool.length) | 0];
    var sr = src.getBoundingClientRect();
    if (!sr.width) return;

    var x0 = sr.left - gr.left;
    var y0 = sr.top - gr.top;

    // 아래로 충분히 내려가서 게임 화면까지 가로지르게 한다.
    var dy = gr.height * rand(0.32, 0.52);
    // 왼쪽 아래로 흐른다 (배경이 왼쪽으로 흐르는 방향과 같아 자연스럽다).
    // 단, 화면 왼쪽 끝을 넘지 않도록 잘라낸다.
    var dx = Math.max(-dy * rand(0.35, 0.65), -(x0 - gr.width * 0.05));

    var el = document.createElement('div');
    el.className = 'shoot';
    el.style.left = x0 + 'px';
    el.style.top = y0 + 'px';
    el.style.setProperty('--sx', dx.toFixed(1) + 'px');
    el.style.setProperty('--sy', dy.toFixed(1) + 'px');
    el.style.setProperty('--dur', FALL_MS + 'ms');
    // 꼬리는 진행 방향 반대쪽으로 눕는다. 꼬리 막대는 기본이 왼쪽(180도)을 향하므로
    // 진행 각도만큼 돌리면 최종 방향이 '진행 반대쪽'이 된다.
    el.style.setProperty('--tail', rand(44, 78).toFixed(0) + 'px');
    el.style.setProperty('--ang', (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1) + 'deg');
    layer.appendChild(el);

    // 떨어진 별은 잠깐 자리를 비웠다가 슬그머니 돌아온다.
    src.style.transition = 'opacity .4s';
    src.style.opacity = '0';
    setTimeout(function(){
      src.style.transition = 'opacity 1.6s';
      src.style.opacity = '';
    }, FALL_MS);

    setTimeout(function(){
      if (el.parentNode) el.parentNode.removeChild(el);
    }, FALL_MS + 120);
  }

  function schedule(){
    setTimeout(function(){
      // 탭이 뒤에 있으면 그냥 건너뛴다 (쌓이지 않게).
      if (!document.hidden) shoot();
      schedule();
    }, rand(MIN_GAP, MAX_GAP));
  }

  // 페이지가 자리를 잡은 뒤 첫 별똥별을 조금 일찍 한 번 보여준다.
  setTimeout(shoot, 2200);
  schedule();
})();
