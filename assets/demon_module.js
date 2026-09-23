  /* ===================== 악마 패턴 (무한질주 전용) =====================
     최고 속도(난이도 천장)에 도달한 뒤에만, 무작위 간격으로 딱 하나의 고정 패턴이
     나온다. 순서는 항상 같다.

         똥1   ->   똥2   ->   악마(제자리 높은 점프)   ->   까마귀

     정답:
       똥1     1단 점프
       똥2     착지한 뒤 다시 1단 점프
       악마     점프하지 말고 그냥 통과. 악마가 공중에 떠 있는 동안 그 아래로 지나간다.
       까마귀   악마를 지난 직후 점프

     ★ 간격은 game.js 가 스스로 정한 최소 간격을 그대로 쓴다 ★
     game.js 의 스폰 스케줄러는 이렇게 하한을 둔다:
         airSec = 2*sqrt(2*JUMP_PEAK/GRAVITY)     (하드구간은 2단 점프 체공)
         minIntervalSec = airSec + 0.21           (체공 + 반응 여유 0.21초)
     즉 게임은 어디서든 "완전히 체공하고 착지한 뒤 0.21초 여유"를 보장한다.
     천장(배수 8.0)에서는 0.775초 = 화면높이의 1.30배다.

     2026-09-23 밤에 이 값을 무시하고 0.78~0.90배로 직접 계산해 넣었다가, 게임이
     보장하는 간격보다 40% 좁아서 실제로 플레이가 불가능했다. 그래서 지금은 간격을
     상수로 두지 않고 매번 게임의 공식에서 계산한다. 물리(중력/점프높이/속도)가
     바뀌어도 자동으로 따라간다.

     [game.js 를 건드리지 않고 되는 이유]
     - 장애물 4개를 이 파일이 직접 만들어 obstacles 배열에 넣는다.
     - 악마의 높이는 매 프레임 o.elevation 에 써넣는다. game.js 의 충돌 계산이
       (o.elevation || 0) 을 그대로 빼주므로 판정 박스가 같이 올라간다. 화면 위치는
       이 파일이 직접 옮기고 같은 값을 쓰므로, 보이는 높이와 판정 높이가 항상 일치한다.
     - 패턴이 흐르는 동안에는 crowPending 을 켜서 일반 장애물 스폰을 멈춘다 (까마귀
       경고가 쓰는 것과 같은 장치다).
     - 기본값은 꺼짐(ENDLESS_DEMON=false)이다. 켜지 않으면 아래 demonUpdate 가 첫 줄에서
       바로 빠져나가므로 기존 장애물 로직에 전혀 손대지 않는다.

     숫자 조절은 assets/endless_tune.js 의 8) 항목에서 한다.
     ==================================================================== */
  var DEMON_ON       = !!window.ENDLESS_MODE && (window.ENDLESS_DEMON === true);
  //  간격 배수. 1.0 = game.js 가 보장하는 최소 간격과 똑같다. 1.2 로 올리면 20% 넉넉.
  var DEMON_GAP_MULT = window.ENDLESS_DEMON_GAP_MULT || 1.0;
  var DEMON_TAIL     = window.ENDLESS_DEMON_TAIL || 1.0;    // 까마귀 뒤 빈 구간 (간격 배수)
  var DEMON_HOP      = window.ENDLESS_DEMON_HOP || 0.36;    // 악마 점프 높이 (화면높이 대비)
  var DEMON_HOP_X0   = window.ENDLESS_DEMON_HOP_X0 || 0.46; // 도약 시작 (화면폭 대비)
  var DEMON_HOP_X1   = (window.ENDLESS_DEMON_HOP_X1 == null) ? -0.02 : window.ENDLESS_DEMON_HOP_X1;
  var DEMON_H_MULT   = window.ENDLESS_DEMON_H || 1.0;       // 흑견 키 대비 악마 크기
  var DEMON_WAIT_MIN = window.ENDLESS_DEMON_WAIT_MIN || 16;
  var DEMON_WAIT_MAX = window.ENDLESS_DEMON_WAIT_MAX || 40;

  var demonNextAt = 0;
  var demonPieces = null;
  var demonBody   = null;

  function demonPickWait(){
    return DEMON_WAIT_MIN + Math.random() * Math.max(0, DEMON_WAIT_MAX - DEMON_WAIT_MIN);
  }

  function demonReset(){
    demonPieces = null;
    demonBody = null;
    demonNextAt = gameTime + demonPickWait();
  }

  // game.js 의 스폰 하한을 그대로 옮긴 것. 여기가 이 패턴의 간격 기준이다.
  function demonGapPx(){
    var peak = hardMode() ? JUMP_PEAK_2 : JUMP_PEAK_1;
    var airSec = 2 * Math.sqrt(2 * peak / GRAVITY);
    return (airSec + 0.21) * speed * DEMON_GAP_MULT;
  }

  // 악마가 지금 x 에서 떠 있는 높이. 위치만의 함수라 속도와 무관하다.
  function demonHopAt(x, appW, appH){
    var x0 = DEMON_HOP_X0 * appW, x1 = DEMON_HOP_X1 * appW;
    var p = (x0 - x) / (x0 - x1);
    if (p < 0) p = 0; else if (p > 1) p = 1;
    return DEMON_HOP * appH * 4 * p * (1 - p);
  }

  function demonMakePoop(x){
    var ph = OBST_POOP_H * (hardMode() ? POOP_HARD_SCALE : 1);
    var pw = ph * 1.14;
    var el = document.createElement('div');
    el.className = 'obstacle poop';
    el.style.left = x + 'px';
    el.style.bottom = GROUND_H + 'px';
    el.style.width = pw + 'px';
    el.style.height = ph + 'px';
    el.innerHTML = '<img class="poop-img" src="' + IMG_POOP + '" alt="">';
    obstaclesLayer.appendChild(el);
    var o = { el: el, x: x, w: pw, h: ph, elevation: 0, type: 'poop',
              hitTop: POOP_HIT_TOP_FRAC, hitSide: POOP_HIT_SIDE_FRAC };
    obstacles.push(o);
    return o;
  }

  function demonMakeCrow(x){
    var crh = CROW_H, crw = crh * CROW_ASPECT;
    var el = document.createElement('div');
    el.className = 'obstacle crow';
    el.style.left = x + 'px';
    el.style.bottom = GROUND_H + 'px';
    el.style.width = crw + 'px';
    el.style.height = crh + 'px';
    el.innerHTML =
      '<img class="crow-frame crow-frame-up" src="' + IMG_CROW_UP + '" alt="">' +
      '<img class="crow-frame crow-frame-down" src="' + IMG_CROW_DOWN + '" alt="">';
    obstaclesLayer.appendChild(el);
    var o = { el: el, x: x, w: crw, h: crh, elevation: 0, type: 'crow' };
    obstacles.push(o);
    return o;
  }

  function demonMakeBody(x){
    var dh = DOG_H * DEMON_H_MULT;
    var dw = dh * 1.018;                       // boss.webp 원본 비율에 가깝다
    var el = document.createElement('div');
    // 'boss' 클래스는 그림 스타일만 물려받기 위한 것이고, 판정/처치 로직은 type 으로
    // 갈리므로 보스전과 전혀 섞이지 않는다.
    el.className = 'obstacle boss demon';
    el.style.left = x + 'px';
    el.style.bottom = GROUND_H + 'px';
    el.style.width = dw + 'px';
    el.style.height = dh + 'px';
    el.innerHTML = '<img class="boss-img" src="' + BOSS_IMG + '" alt="">';
    obstaclesLayer.appendChild(el);
    var o = { el: el, x: x, w: dw, h: dh, elevation: 0, type: 'demon' };
    obstacles.push(o);
    return o;
  }

  function demonSpawn(){
    var rect = app.getBoundingClientRect();
    var x0 = rect.width + 20;
    var g = demonGapPx();
    var p1 = demonMakePoop(x0);
    var p2 = demonMakePoop(x0 + g);
    demonBody = demonMakeBody(x0 + 2 * g);
    var cr = demonMakeCrow(x0 + 3 * g);
    demonPieces = [p1, p2, demonBody, cr];
    // 패턴이 흐르는 동안 일반 장애물이 끼어들면 설계가 무너진다.
    crowPending = true;
  }

  function demonRelease(){
    crowPending = false;
    spawnTimer = 0;
    // 까마귀를 넘은 사람이 착지할 시간을 벌어준다. 게임 자체의 최소 간격을 한 번 더 준다.
    nextSpawnIn = (demonGapPx() / Math.max(1, speed)) * 1000;
    demonPieces = null;
    demonBody = null;
    demonNextAt = gameTime + demonPickWait();
  }

  function demonUpdate(dt){
    if (!DEMON_ON || state !== 'playing') return;
    var rect = app.getBoundingClientRect();
    var appW = rect.width, appH = rect.height;

    if (demonPieces){
      // 악마의 점프: 판정(elevation)과 화면 위치를 같은 값으로 함께 올린다.
      if (demonBody && obstacles.indexOf(demonBody) >= 0){
        var lift = demonHopAt(demonBody.x, appW, appH);
        demonBody.elevation = lift;
        demonBody.el.style.bottom = (GROUND_H + lift) + 'px';
      }
      // 마지막 조각(까마귀)이 캐릭터를 충분히 지나가면 일반 스폰을 다시 켠다.
      var cr = demonPieces[3];
      var gone = (obstacles.indexOf(cr) < 0) || (cr.x < charLeftPx - DEMON_TAIL * demonGapPx());
      if (gone) demonRelease();
      return;
    }

    // 아직 천장에 도달하지 않았으면 내지 않는다.
    if (!window.ENDLESS_MAX_MULT || speedMultiplier < window.ENDLESS_MAX_MULT - 0.001) return;
    // 까마귀 경고가 떠 있으면 다음 기회로 넘긴다.
    if (crowPending) return;
    if (gameTime < demonNextAt) return;
    // 화면 오른쪽이 한 간격 이상 비었을 때만 시작한다. 방금 생긴 일반 장애물이 남아
    // 있으면 패턴의 똥1과 겹쳐서 피할 수 없는 배치가 만들어진다.
    var clearX = appW - demonGapPx();
    for (var i = 0; i < obstacles.length; i++){
      if (obstacles[i].x + obstacles[i].w > clearX) return;
    }
    demonSpawn();
  }
