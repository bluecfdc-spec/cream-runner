// ============================================================================
//  안개 (하드모드 전용)
// ============================================================================
//  무엇을 하는가
//  --------------------------------------------------------------------------
//  1,000점을 넘긴 뒤부터 1,000점마다 한 번씩, 경고 표시가 잠깐 뜨고 나서 크림이 앞쪽에
//  안개가 "갑자기" 생긴다. 안개는 8초 동안 그 자리에 머문다. 안개가 있는 동안 장애물은
//  안개에 들어가는 순간 안 보이므로, 플레이어는 화면 오른쪽에서 본 패턴을 기억해서
//  타이밍만으로 넘어야 한다.
//
//  왜 속도를 올리는 대신 이렇게 하는가
//  --------------------------------------------------------------------------
//  속도를 올려서 어렵게 만드는 길은 사람 반응한계에 부딪힌다. 지금 천장의 2배로 올리면
//  2단 점프 재입력 창이 186ms 가 되는데, 게임이 쓰는 반응 여유가 210ms 다. 즉 계산상
//  불가능한 구간이 생긴다. 안개는 점프 물리/장애물 간격/중력을 하나도 건드리지 않으므로
//  "물리적으로 못 넘는 패턴"이 생길 수가 없다. 난이도가 반응 속도에서 기억력으로 옮겨간다.
//
//  게임 코드에 손대지 않는다
//  --------------------------------------------------------------------------
//  이 파일은 game.js 도 부트 로더도 건드리지 않는다. 점수는 화면의 점수판에서 읽고,
//  안개는 그림 한 장을 얹는 것뿐이다. 그래서 판정/점수/패턴에 아무 영향이 없다.
//  안개 칸을 #obstacles 안에 넣지만, game.js 는 판을 새로 시작할 때 자기가 만든
//  장애물만 하나씩 지우고 (obstacles.forEach -> o.el.remove()) 칸 전체를 비우지는
//  않는다. 그래서 다시하기를 눌러도 안개 칸은 그대로 살아 있다.
//
//  층 순서 (크림이와 흑견은 가리지 않는다)
//  --------------------------------------------------------------------------
//  안개를 #obstacles 안에 넣고 z-index 1 을 준다. 장애물들은 z-index 가 없어서 안개
//  아래로 내려가 가려지고, 우리 편 흑견(.ally-dog)은 z-index 6 이라 안개 위에 남는다.
//  크림이(#character)는 #obstacles 보다 위층이라 원래부터 안 가려진다.
//  즉 "장애물만 사라지고 크림이와 흑견은 계속 보인다".
//
//  켜는 방법
//  --------------------------------------------------------------------------
//  기본은 꺼져 있다. 주소에 ?fogtest=1 을 붙이면 켜지고, 운영에 넣을 때는
//  assets/endless_tune.js 에 window.FOG_ON = true; 한 줄을 추가하면 된다.
//
//  시험용 손잡이 (?fogtest=1 에서만)
//    &fevery=500   몇 점마다 나올지 (기본 1000)
//    &fhold=8      머무는 시간(초) (기본 8)
//    &fwarn=1.5    경고 표시 시간(초) (기본 1.5)
//    &fwide=2.7    안개 폭 = 큰 똥 폭의 몇 배 (기본 2.7 = 약 176px)
//    &ftall=0.64   안개 높이 = 화면 높이 대비 (기본 0.64)
//    &fleft=0      안개 시작점 보정(px). 양수면 오른쪽으로 밀어 더 쉬워진다
//    &fdown=0.30   경고 표시를 새 경고보다 얼마나 내릴지 (화면 높이 대비)
//    &fwsize=1     경고 표시 크기 배수 (0.5 ~ 2)
// ============================================================================
(function(){
  "use strict";

  if (window.__fogReady) return;
  window.__fogReady = true;

  var TEST = /[?&]fogtest/.test(location.search);
  if (!TEST && window.FOG_ON !== true) return;     // 기본은 꺼져 있다
  if (!window.ENDLESS_MODE) return;                // 하드모드에서만

  var IMG_SRC = "assets/fog_img.js?v=1";

  function num(name, dflt){
    if (!TEST) return dflt;
    try {
      var v = new URLSearchParams(location.search).get(name);
      if (v === null || v === '') return dflt;
      var n = parseFloat(v);
      return isFinite(n) ? n : dflt;
    } catch (e) { return dflt; }
  }

  var EVERY = Math.max(100, num('fevery', 1000));   // 몇 점마다
  var HOLD  = Math.max(1, num('fhold', 8));         // 머무는 시간(초)
  var WARN  = Math.max(0.3, num('fwarn', 1.5));     // 경고 시간(초)
  var WIDE  = Math.max(1, num('fwide', 2.7));       // 큰 똥 폭의 몇 배
  var TALL  = Math.max(0.2, num('ftall', 0.64));    // 화면 높이 대비
  var LEFTADJ = num('fleft', 0);                    // 시작점 보정(px)
  var DOWN  = num('fdown', 0.30);                   // 경고 표시를 내리는 양
  var WSCALE = Math.min(2, Math.max(0.5, num('fwsize', 1)));  // 경고 표시 크기 배수

  // ---- 그림 파일을 직접 불러온다 -------------------------------------------
  function loadImgs(done){
    if (window.FOG_IMG_1) return done();
    var s = document.createElement('script');
    s.src = IMG_SRC;
    s.onload = done;
    s.onerror = function(){ done(); };
    (document.body || document.documentElement).appendChild(s);
  }

  loadImgs(function(){
    if (!window.FOG_IMG_1) return;   // 그림이 없으면 아무 일도 하지 않는다
    init();
  });

  function init(){
    var app  = document.getElementById('app');
    var layer= document.getElementById('obstacles');
    var scoreEl = document.getElementById('scoreVal');
    var charEl  = document.getElementById('character');
    var startS  = document.getElementById('startScreen');
    var overS   = document.getElementById('gameOverScreen');
    var crowW   = document.getElementById('crowWarning');
    if (!app || !layer || !scoreEl || !charEl) return;

    // ---- 스타일 ------------------------------------------------------------
    var css = document.createElement('style');
    css.id = 'fogCss';
    css.textContent =
      // 우리 편 흑견을 안개 위로 올린다 (안개는 z-index 1).
      // endless.html 이 이미 .ally-dog 에 6 을 주고 있어서 지금도 안개 위다. 여기서
      // 같은 6 을 id 선택자로 한 번 더 못박아 두는 것은, 나중에 그 값이 바뀌어도
      // 안개에 흑견이 먹히지 않게 하기 위한 것이다. 값을 낮추지는 않는다.
      '#obstacles .ally-dog{z-index:6;}' +
      // 좌우 끝은 마스크로 흐리게 지운다 (각진 "네모난 안개"로 보이지 않게).
      // 마스크 경계값은 layout() 에서 픽셀로 계산해 넣는다. 흐려지는 구간을 불투명
      // 구간 '밖'에 덧붙이기 때문에, 가려야 할 범위는 하나도 줄어들지 않는다.
      '#fogBank{position:absolute;pointer-events:none;z-index:1;opacity:0;' +
        'background-repeat:no-repeat;background-position:center bottom;background-size:cover;' +
        'transition:opacity .16s linear;will-change:transform;}' +
      // 제자리에서 몽글몽글. 그림 두 장을 번갈아 쓰는 것과 함께 쓴다.
      '@keyframes fogBreathe{' +
        '0%{transform:translate3d(0,0,0) scale(1.00);}' +
        '50%{transform:translate3d(-2px,-3px,0) scale(1.045);}' +
        '100%{transform:translate3d(0,0,0) scale(1.00);}' +
      '}' +
      '#fogBank.on{opacity:1;animation:fogBreathe 2.6s ease-in-out infinite;}' +
      // ---- 경고 표시 ----
      //  새 경고와 같은 X, DOWN 만큼 아래. 홍균이 준 안개 그림은 부드러운 파스텔
      //  덩어리라서 밤하늘에 그냥 얹으면 장식으로 읽히고 경고로 안 읽힌다. 그래서
      //  어두운 받침판에 올리고 빛나는 테두리 + 빨간 느낌표 배지 + "안개!" 글자를
      //  붙였다. 그림 자체는 손대지 않는다.
      //  ★ 크기 변화(scale)는 겉껍데기에, 빛번짐(box-shadow)은 받침판에만 준다.
      //    한 요소에 둘을 같이 주면 글자 뒤로 네모난 그림자가 따라 그려진다.
      '#fogWarn{position:absolute;pointer-events:none;z-index:9;opacity:0;' +
        'display:flex;flex-direction:column;align-items:center;' +
        'transition:opacity .12s linear;}' +
      '@keyframes fogWarnPop{' +
        '0%,100%{transform:scale(.94);}' +
        '50%{transform:scale(1.06);}' +
      '}' +
      '#fogWarn.on{opacity:1;animation:fogWarnPop .52s ease-in-out infinite;}' +
      '#fogWarnPlate{position:relative;width:100%;box-sizing:border-box;' +
        'display:flex;align-items:center;justify-content:center;' +
        'border-radius:16px;border:2.5px solid rgba(255,170,235,.95);' +
        'background:radial-gradient(ellipse at 50% 60%,rgba(60,30,90,.72),rgba(12,16,40,.9));' +
        'box-shadow:0 0 0 3px rgba(12,16,40,.55),0 0 18px rgba(255,140,225,.75);}' +
      '@keyframes fogWarnGlow{' +
        '0%,100%{box-shadow:0 0 0 3px rgba(12,16,40,.55),0 0 10px rgba(255,140,225,.5);}' +
        '50%{box-shadow:0 0 0 3px rgba(12,16,40,.55),0 0 24px rgba(255,150,230,1);}' +
      '}' +
      '#fogWarn.on #fogWarnPlate{animation:fogWarnGlow .52s ease-in-out infinite;}' +
      '#fogWarnPic{background-repeat:no-repeat;background-position:center;' +
        'background-size:contain;flex:0 0 auto;}' +
      '#fogWarnBang{position:absolute;border-radius:50%;box-sizing:border-box;' +
        'background:#ff4d6d;border:2.5px solid #fff;color:#fff;text-align:center;' +
        'font-family:"Baloo 2",sans-serif;font-weight:800;' +
        'box-shadow:0 2px 5px rgba(0,0,0,.5),0 0 12px rgba(255,80,120,.95);}' +
      '#fogWarnTxt{font-family:"Baloo 2",sans-serif;font-weight:800;color:#fff;' +
        'letter-spacing:.04em;line-height:1.1;white-space:nowrap;' +
        'text-shadow:0 1px 3px #000,0 0 10px rgba(255,150,230,1);}' +
      // 남은 시간
      '#fogCount{position:absolute;pointer-events:none;z-index:9;opacity:0;' +
        'font:800 13px/1 "Baloo 2",sans-serif;color:#fff;' +
        'text-shadow:0 1px 3px rgba(0,0,0,.65),0 0 8px rgba(180,120,255,.8);' +
        'transition:opacity .16s linear;}' +
      '#fogCount.on{opacity:1;}';
    document.head.appendChild(css);

    // ---- 요소 --------------------------------------------------------------
    var fog = document.createElement('div');
    fog.id = 'fogBank';
    layer.appendChild(fog);                 // #obstacles 안 (위 주석의 층 순서 참고)

    var warn = document.createElement('div');
    warn.id = 'fogWarn';
    var wPlate = document.createElement('div');
    wPlate.id = 'fogWarnPlate';
    var wBang = document.createElement('div');
    wBang.id = 'fogWarnBang';
    wBang.textContent = '!';
    var wPic = document.createElement('div');
    wPic.id = 'fogWarnPic';
    wPic.style.backgroundImage = 'url(' + window.FOG_IMG_WARN + ')';
    wPlate.appendChild(wBang);
    wPlate.appendChild(wPic);
    var wTxt = document.createElement('div');
    wTxt.id = 'fogWarnTxt';
    wTxt.textContent = '안개!';
    warn.appendChild(wPlate);
    warn.appendChild(wTxt);
    app.appendChild(warn);

    var cnt = document.createElement('div');
    cnt.id = 'fogCount';
    app.appendChild(cnt);

    var dbg = null;
    if (TEST){
      dbg = document.createElement('div');
      dbg.style.cssText = 'position:fixed;right:6px;bottom:6px;z-index:99997;' +
        'background:rgba(0,0,0,.78);color:#cfe3ff;font:600 10px/1.45 monospace;' +
        'padding:5px 7px;border-radius:6px;white-space:pre;pointer-events:none;';
      (document.body || document.documentElement).appendChild(dbg);
    }

    // ---- 자리 계산 ---------------------------------------------------------
    //  안개는 흑견이 서는 자리(= 캐릭터 왼쪽 + 캐릭터폭 x 0.78)에서 시작해서 오른쪽으로
    //  뻗는다. 흑견 앞머리에 조금 걸치는 건 의도한 것이다 (흑견이 안개 위층이라 가려지지
    //  않는다). 오른쪽 끝이 화면 끝까지 가지 않게 잘라서, 오른쪽에서 오는 패턴은 항상
    //  먼저 눈에 보이게 한다.
    var geo = { left:0, w:0, h:0, bottom:0, right:0 };
    function layout(){
      var appW = app.clientWidth, appH = app.clientHeight;
      if (!appW || !appH) return false;
      var charW = charEl.offsetWidth || appW * 0.29;
      var dogHome = appW * 0.10 + charW * 0.78;
      var poopW = appH * 0.10 * (window.POOP_HARD_SCALE || 1.15) * 1.14;
      geo.w = poopW * WIDE;
      geo.h = appH * TALL;
      geo.left = dogHome + LEFTADJ;
      // 오른쪽에 최소한 화면의 18% 는 맑게 남겨둔다 (패턴을 읽을 구간).
      var maxRight = appW * 0.82;
      if (geo.left + geo.w > maxRight) geo.w = Math.max(poopW * 1.2, maxRight - geo.left);
      geo.right = geo.left + geo.w;
      geo.bottom = appH * 0.08;
      //  흐려지는 구간(padL/padR)을 불투명 구간 밖에 덧붙인다. 그래서 실제로 가려지는
      //  범위는 geo.left ~ geo.right 그대로이고, 그 바깥으로만 안개가 풀어진다.
      var padL = geo.w * 0.07, padR = geo.w * 0.16;
      var elW = geo.w + padL + padR;
      var s1 = (padL / elW * 100).toFixed(1), s2 = ((padL + geo.w) / elW * 100).toFixed(1);
      var mask = 'linear-gradient(90deg,rgba(0,0,0,0) 0%,#000 ' + s1 + '%,#000 ' + s2 + '%,rgba(0,0,0,0) 100%)';
      fog.style.left = (geo.left - padL).toFixed(1) + 'px';
      fog.style.bottom = geo.bottom.toFixed(1) + 'px';
      fog.style.width = elW.toFixed(1) + 'px';
      fog.style.height = geo.h.toFixed(1) + 'px';
      fog.style.webkitMaskImage = mask;
      fog.style.maskImage = mask;
      cnt.style.left = (geo.left + geo.w / 2 - 12).toFixed(1) + 'px';
      cnt.style.bottom = (geo.bottom + geo.h + 2).toFixed(1) + 'px';
      // ---- 경고 표시 자리 ----
      //  받침판 폭은 화면 높이에 매되, 좁은 화면에서 가로를 다 먹지 않도록 잘라낸다.
      var ww = Math.min(appW * 0.42, Math.max(96, appH * 0.58)) * WSCALE;
      var plateH = ww * 0.485;
      var fontPx = Math.max(11, ww * 0.117);
      var bang = Math.max(18, ww * 0.203);
      var wrapH = plateH + 2 + fontPx * 1.15;
      warn.style.width = ww.toFixed(1) + 'px';
      warn.style.gap = '2px';
      wPlate.style.height = plateH.toFixed(1) + 'px';
      wPic.style.width = (ww * 0.81).toFixed(1) + 'px';
      wPic.style.height = (ww * 0.406).toFixed(1) + 'px';
      wBang.style.width = bang.toFixed(1) + 'px';
      wBang.style.height = bang.toFixed(1) + 'px';
      wBang.style.left = (-bang * 0.35).toFixed(1) + 'px';
      wBang.style.top = (-bang * 0.42).toFixed(1) + 'px';
      wBang.style.fontSize = (bang * 0.65).toFixed(1) + 'px';
      wBang.style.lineHeight = (bang - 5).toFixed(1) + 'px';
      wTxt.style.fontSize = fontPx.toFixed(1) + 'px';
      // 새 경고와 같은 X 에 두고 Y 만 내린다. 화면 밖으로 나가지 않게 양쪽 다 자른다.
      var wx = appW * 0.62 - ww / 2, wy = appH * 0.20;
      if (crowW){
        var ar = app.getBoundingClientRect(), cr = crowW.getBoundingClientRect();
        if (cr.width){ wx = cr.left - ar.left + cr.width / 2 - ww / 2; wy = cr.top - ar.top; }
      }
      warn.style.left = Math.min(appW - ww - 2, Math.max(2, wx)).toFixed(1) + 'px';
      warn.style.top = Math.min(appH - wrapH - 2, Math.max(2, wy + appH * DOWN)).toFixed(1) + 'px';
      return true;
    }
    layout();
    window.addEventListener('resize', layout);

    // ---- 몽글몽글: 그림 두 장을 번갈아 --------------------------------------
    var frame = 0;
    fog.style.backgroundImage = 'url(' + window.FOG_IMG_1 + ')';
    setInterval(function(){
      if (!fog.classList.contains('on')) return;
      frame ^= 1;
      fog.style.backgroundImage = 'url(' + (frame ? window.FOG_IMG_2 : window.FOG_IMG_1) + ')';
    }, 430);

    // ---- 진행 --------------------------------------------------------------
    var nextAt = EVERY;
    var phase = 'idle';      // idle | warn | fog
    var until = 0;
    var lastScore = 0;

    function playing(){
      var s1 = startS ? startS.hidden : true;
      var s2 = overS ? overS.hidden : true;
      return s1 && s2;
    }
    function score(){
      var n = parseInt((scoreEl.textContent || '0').replace(/[^0-9]/g, ''), 10);
      return isFinite(n) ? n : 0;
    }
    function clear(){
      phase = 'idle';
      fog.classList.remove('on');
      warn.classList.remove('on');
      cnt.classList.remove('on');
    }

    setInterval(function(){
      var s = score();
      // 새 판이 시작되면 처음부터 다시
      if (s + 50 < lastScore){ nextAt = EVERY; clear(); }
      lastScore = s;

      if (!playing()){ if (phase !== 'idle') clear(); return; }

      var now = Date.now();
      if (phase === 'idle'){
        if (s >= nextAt){
          nextAt = (Math.floor(s / EVERY) + 1) * EVERY;
          if (!layout()) return;
          phase = 'warn';
          until = now + WARN * 1000;
          warn.classList.add('on');
        }
      } else if (phase === 'warn'){
        if (now >= until){
          warn.classList.remove('on');
          phase = 'fog';
          until = now + HOLD * 1000;
          fog.classList.add('on');       // 갑자기 생긴다 (앞에서 달려오지 않는다)
          cnt.classList.add('on');
        }
      } else if (phase === 'fog'){
        var left = Math.ceil((until - now) / 1000);
        cnt.textContent = left > 0 ? left + '초' : '';
        if (now >= until) clear();
      }

      if (dbg){
        dbg.textContent =
          '안개 ' + phase + '\n' +
          '점수 ' + s + ' / 다음 ' + nextAt + '\n' +
          '폭 ' + geo.w.toFixed(0) + 'px  높이 ' + geo.h.toFixed(0) + 'px\n' +
          '구간 ' + geo.left.toFixed(0) + '~' + geo.right.toFixed(0) + 'px' +
            ' (화면 ' + (geo.right / (app.clientWidth || 1) * 100).toFixed(0) + '%)';
      }
    }, 120);
  }
})();
