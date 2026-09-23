  /* ===================== 악마 패턴 (무한질주 전용) =====================
     최고 속도(난이도 천장)에 도달한 뒤에만, 무작위 간격으로 딱 하나의 고정 패턴이
     나온다. 순서는 항상 같다.

         똥1   ->   똥2   ->   악마(제자리 높은 점프)   ->   까마귀

     정답:
       똥1     1단 점프
       똥2     착지한 뒤 다시 1단 점프
       악마     점프하지 말고 그냥 통과. 악마가 공중에 떠 있는 동안 그 아래로 지나간다.
       까마귀   악마를 지난 직후 점프

     ★ 숫자를 손으로 박아두지 않는다 ★
     이 패턴에서 사람이 손으로 정해서는 안 되는 값이 두 개 있다. 간격과 도약 구간이다.
     둘 다 게임이 스스로 정한 기준에서 매번 계산한다.

     1) 간격 - game.js 의 스폰 하한을 그대로 쓴다
          airSec = 2*sqrt(2*JUMP_PEAK/GRAVITY)     (하드구간은 2단 점프 체공)
          minIntervalSec = airSec + 0.21           (체공 + 반응 여유 0.21초)
        게임은 어디서든 "완전히 체공하고 착지한 뒤 0.21초 여유"를 보장한다.
        천장(배수 8.0)에서는 0.775초 = 화면높이의 1.30배다.
        2026-09-23 밤에 이 값을 무시하고 0.78~0.90배로 직접 넣었다가, 게임이 보장하는
        간격보다 40% 좁아서 실제로 플레이가 불가능했다.
        ※ 단, 이 하한이 필요한 건 "점프로 넘어야 하는" 사이뿐이다. 아래 demonGaps 참고.

     2) 도약 구간 - 악마 크기에서 역산한다
        이 패턴의 핵심은 "악마가 떠 있는 동안 그 아래로 지나간다"는 것이다. 그래서
        악마가 캐릭터와 가로로 겹쳐 있는 내내 판정 박스가 캐릭터 키보다 높이 떠
        있어야 한다. 악마를 키우면 겹치는 구간이 길어지므로 도약 구간도 같이 늘어나야
        하는데, 이걸 사람이 맞추면 크기를 바꿀 때마다 죽는 패턴이 된다.
        그래서 겹침 구간(캐릭터 판정폭 + 악마 판정폭)을 먼저 구하고, 그보다
        DEMON_HOP_MARGIN 만큼 넉넉한 구간에서 "캐릭터 키를 넘는 높이"가 유지되도록
        포물선의 폭을 역산한다. 크기를 1.0배로 두든 2.6배로 두든 겹침 양끝에서의
        판정 높이는 항상 같다.
        구간은 소환 순간의 목숨 상태로 한 번만 계산해서 그 악마에 박아둔다. 도중에
        바뀌면 화면에서 높이가 튀기 때문이다.

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

  //  테스트 주소(?demontest=1)에서만, 주소창에서 숫자를 바로 바꿔볼 수 있게 해둔다.
  //    dh   = 악마 크기 (흑견 키 배수)     dhop = 점프 높이 (화면높이 배수)
  //    dgap = 간격 전체 배수               dmar = 도약 구간 여유
  //    dg1  = 똥1-똥2 간격 배수            dg2  = 똥2-악마 간격 배수
  //    dg3  = 악마-까마귀 간격 배수
  //  예)  endless.html?demontest=1&dh=2.2&dhop=0.5&dg2=0.8
  //  demontest 가 없으면 이 함수는 주소를 아예 보지 않는다. 즉 운영 주소에서는
  //  주소에 무엇을 붙여도 숫자가 바뀌지 않는다 (난이도 조작 방지).
  function demonQ(name, fallback){
    try {
      var q = new URLSearchParams(window.location.search);
      if (!q.has('demontest')) return fallback;
      var v = q.get(name);
      if (v === null || v === '') return fallback;
      var n = parseFloat(v);
      return isFinite(n) ? n : fallback;
    } catch (e) { return fallback; }
  }

  //  간격 배수. 1.0 = game.js 가 보장하는 최소 간격과 똑같다. 1.2 로 올리면 20% 넉넉.
  var DEMON_GAP_MULT = demonQ('dgap', window.ENDLESS_DEMON_GAP_MULT || 1.0);
  var DEMON_TAIL     = window.ENDLESS_DEMON_TAIL || 1.0;    // 까마귀 뒤 빈 구간 (간격 배수)
  var DEMON_HOP      = demonQ('dhop', window.ENDLESS_DEMON_HOP || 0.36);
  var DEMON_H_MULT   = demonQ('dh',   window.ENDLESS_DEMON_H || 1.8);
  //  겹침 구간보다 도약 구간을 얼마나 넉넉하게 잡을지. 0.8 = 80% 여유.
  var DEMON_HOP_MARGIN = demonQ('dmar',
      (window.ENDLESS_DEMON_HOP_MARGIN == null) ? 0.8 : window.ENDLESS_DEMON_HOP_MARGIN);
  var DEMON_WAIT_MIN = window.ENDLESS_DEMON_WAIT_MIN || 16;
  var DEMON_WAIT_MAX = window.ENDLESS_DEMON_WAIT_MAX || 40;
  //  한 판에서 첫 패턴까지만 따로 쓰는 대기 시간(초). 시작부터 천장인 설정에서는
  //  16~40초를 기다리면 "바로 나온다"는 느낌이 안 나기 때문에 첫 번째만 짧게 준다.
  //  두 번째부터는 위의 WAIT_MIN ~ WAIT_MAX 를 그대로 쓴다.
  var DEMON_FIRST_WAIT = (window.ENDLESS_DEMON_FIRST_WAIT == null)
                       ? 6 : window.ENDLESS_DEMON_FIRST_WAIT;

  var demonNextAt = 0;
  var demonPieces = null;
  var demonBody   = null;
  var demonArming = false;   // 일반 스폰을 멈추고 화면이 비기를 기다리는 중
  var demonFirstDone = false;  // 이 판에서 첫 패턴이 이미 나왔는지

  function demonPickWait(){
    if (!demonFirstDone) return DEMON_FIRST_WAIT;
    return DEMON_WAIT_MIN + Math.random() * Math.max(0, DEMON_WAIT_MAX - DEMON_WAIT_MIN);
  }

  function demonReset(){
    demonPieces = null;
    demonBody = null;
    demonArming = false;
    demonFirstDone = false;   // demonPickWait 보다 먼저 꺼야 첫 대기시간이 적용된다
    demonNextAt = gameTime + demonPickWait();
  }

  // 체공 시간. game.js 와 같은 식이다.
  function demonAirSec(peak){ return 2 * Math.sqrt(2 * peak / GRAVITY); }

  // game.js 의 스폰 하한. "2단 점프까지 완전히 체공하고 착지한 뒤 0.21초 여유".
  // 점프로 넘어야 하는 장애물 사이에는 이만큼이 필요하다.
  function demonGapPx(){
    return (demonAirSec(hardMode() ? JUMP_PEAK_2 : JUMP_PEAK_1) + 0.21)
           * speed * DEMON_GAP_MULT;
  }

  // ★ 세 간격은 역할이 달라서 기준이 다르다 ★
  //   g1  똥1 -> 똥2    : 점프하고 착지해서 또 점프한다. game.js 의 하한 그대로.
  //   g2  똥2 -> 악마    : 악마는 점프해서 넘는 게 아니라 밑으로 지나간다. 그러니
  //                       "착지만 해 있으면" 된다. 2단 점프까지 다 쓴 사람도 착지할
  //                       시간(체공 + 0.06초)만 주면 충분하다. 여기에 점프용 하한을
  //                       쓰면 똥 뒤가 한참 비어서 패턴으로 보이지 않는다.
  //   g3  악마 -> 까마귀 : 까마귀를 뛰려고 누르는 순간 악마가 이미 지나가 있어야 한다.
  //                       그래서 1단 점프 거리 + 악마 판정폭에서 역산한다. 악마를
  //                       키우면 이 간격이 자동으로 늘어난다.
  function demonGaps(){
    var g1 = demonGapPx();
    var dbl = demonAirSec(JUMP_PEAK_2) * speed;
    var sgl = demonAirSec(JUMP_PEAK_1) * speed;
    var g2 = (dbl + 0.06 * speed) * DEMON_GAP_MULT;
    var g3 = (sgl + 0.92 * demonSize().w + 0.06 * speed) * DEMON_GAP_MULT;
    g1 *= demonQ('dg1', 1);
    g2 *= demonQ('dg2', 1);
    g3 *= demonQ('dg3', 1);
    return [g1, g2, g3];
  }

  // 테스트 주소에서만, 방금 소환한 패턴의 실제 내용을 화면 왼쪽 위에 적어준다.
  // 조각이 빠지거나 간격이 이상하면 폰에서도 바로 보인다.
  var demonSeq = 0;
  function demonNote(txt){
    try {
      if (!new URLSearchParams(window.location.search).has('demontest')) return;
      var el = document.getElementById('demonNote');
      if (!el){
        el = document.createElement('div');
        el.id = 'demonNote';
        el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99998;' +
          'background:rgba(0,0,0,.62);color:#9fe8ff;padding:5px 7px;border-radius:7px;' +
          'font:600 11px/1.45 ui-monospace,monospace;white-space:pre;pointer-events:none;';
        document.body.appendChild(el);
      }
      el.textContent = txt;
    } catch (e) {}
  }

  function demonSize(){
    var h = DOG_H * DEMON_H_MULT;
    return { h: h, w: h * 1.018 };   // boss.webp 원본 비율 440x432
  }

  // 악마 폭과 지금 목숨 상태에서, "겹치는 내내 캐릭터 키보다 높이 떠 있는" 포물선을
  // 역산한다. 반환값은 소환된 악마에 그대로 박아둔다.
  function demonHopPlan(appH){
    var w = demonSize().w;
    var cfg = LIFE_STATE_CFG[lifeState] || LIFE_STATE_CFG[3];
    var cw = character.offsetWidth;
    var cl = charLeftPx + cfg.offsetXFrac * cw + cw * cfg.hitRear;  // 캐릭터 판정 왼쪽
    var cr = cl + cw * (cfg.hitFront - cfg.hitRear);                // 캐릭터 판정 오른쪽
    var charH = character.offsetHeight * 0.55;                      // game.js 와 같은 식
    // 악마 왼쪽 끝 x 로 본 겹침 구간. 판정은 좌우 8% 를 제외하므로 그대로 반영한다.
    var xIn  = cr - 0.08 * w;
    var xOut = cl - 0.92 * w;
    var mid  = (xIn + xOut) / 2;
    var half = (xIn - xOut) / 2 * (1 + DEMON_HOP_MARGIN);
    var peak = DEMON_HOP * appH;
    // 높이 charH 를 넘는 구간의 반폭 비율 = sqrt(0.25 - charH/(4*peak))
    var k = 0.25 - charH / (4 * peak);
    if (k < 0.0025) k = 0.0025;   // 점프 높이를 너무 낮게 설정한 경우의 보호
    var L = half / Math.sqrt(k);
    return { peak: peak, x0: mid + L / 2, x1: mid - L / 2 };
  }

  // 악마가 지금 x 에서 떠 있는 높이. 위치만의 함수라 속도와 무관하다.
  function demonHopAt(o, x){
    var p = (o.hopX0 - x) / (o.hopX0 - o.hopX1);
    if (p < 0) p = 0; else if (p > 1) p = 1;
    return o.hopPeak * 4 * p * (1 - p);
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

  function demonMakeBody(x, appH){
    var sz = demonSize();
    var plan = demonHopPlan(appH);
    var el = document.createElement('div');
    // 'boss' 클래스는 그림 스타일만 물려받기 위한 것이고, 판정/처치 로직은 type 으로
    // 갈리므로 보스전과 전혀 섞이지 않는다.
    el.className = 'obstacle boss demon';
    el.style.left = x + 'px';
    el.style.bottom = GROUND_H + 'px';
    el.style.width = sz.w + 'px';
    el.style.height = sz.h + 'px';
    el.innerHTML = '<img class="boss-img" src="' + BOSS_IMG + '" alt="">';
    obstaclesLayer.appendChild(el);
    var o = { el: el, x: x, w: sz.w, h: sz.h, elevation: 0, type: 'demon',
              hopPeak: plan.peak, hopX0: plan.x0, hopX1: plan.x1 };
    obstacles.push(o);
    return o;
  }

  // 똥1이 나올 자리(appW+20) 앞으로 한 간격이 비어 있는지.
  function demonSpaceReady(appW){
    var clearX = appW + 20 - demonGaps()[0];
    for (var i = 0; i < obstacles.length; i++){
      if (obstacles[i].x + obstacles[i].w > clearX) return false;
    }
    return true;
  }

  function demonSpawn(appH){
    var rect = app.getBoundingClientRect();
    var x0 = rect.width + 20;
    var g = demonGaps();
    var p1 = demonMakePoop(x0);
    var p2 = demonMakePoop(x0 + g[0]);
    demonBody = demonMakeBody(x0 + g[0] + g[1], appH);
    var cr = demonMakeCrow(x0 + g[0] + g[1] + g[2]);
    demonPieces = [p1, p2, demonBody, cr];
    // 패턴이 흐르는 동안 일반 장애물이 끼어들면 설계가 무너진다.
    crowPending = true;
    demonArming = false;
    demonFirstDone = true;
    demonSeq++;
    var got = 0;
    for (var i = 0; i < demonPieces.length; i++){
      if (obstacles.indexOf(demonPieces[i]) >= 0) got++;
    }
    demonNote('악마패턴 #' + demonSeq + '  조각 ' + got + '/4\n' +
              '간격 ' + g[0].toFixed(0) + ' / ' + g[1].toFixed(0) + ' / ' + g[2].toFixed(0) + 'px\n' +
              '악마 x' + DEMON_H_MULT + '  점프 ' + DEMON_HOP + '  화면폭 ' + rect.width.toFixed(0));
  }

  function demonRelease(){
    crowPending = false;
    spawnTimer = 0;
    // 까마귀를 넘은 사람이 착지할 시간을 벌어준다. 게임 자체의 최소 간격을 한 번 더 준다.
    nextSpawnIn = (demonGapPx() / Math.max(1, speed)) * 1000;   // 착지할 시간
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
        var lift = demonHopAt(demonBody, demonBody.x);
        demonBody.elevation = lift;
        demonBody.el.style.bottom = (GROUND_H + lift) + 'px';
      }
      // 마지막 조각(까마귀)이 캐릭터를 충분히 지나가면 일반 스폰을 다시 켠다.
      var cr = demonPieces[3];
      var gone = (obstacles.indexOf(cr) < 0) || (cr.x < charLeftPx - DEMON_TAIL * demonGapPx());
      if (gone) demonRelease();
      return;
    }

    // ---- 시작 자리 만들기 ----------------------------------------------------
    //  패턴의 똥1은 화면 오른쪽 바깥(appW+20)에서 나온다. 그 앞에 일반 장애물이
    //  너무 가까이 있으면 똥1과 겹쳐서 피할 수 없는 배치가 된다. 그래서 "똥1 자리
    //  앞으로 한 간격(g1)이 비어 있을 때"만 시작한다.
    //
    //  ★ 그냥 기다리기만 하면 영원히 안 나온다 ★
    //  천장 속도에서 일반 장애물은 646ms마다 나오고, 그 구간을 빠져나가는 데는
    //  837ms가 걸린다. 즉 가만히 두면 비는 순간이 아예 생기지 않는다. 실제로
    //  2026-09-23 밤에 이 조건 때문에 악마가 한 번도 나오지 않았다.
    //  그래서 순서를 뒤집었다. 시간이 되면 먼저 일반 스폰을 멈춰놓고(crowPending),
    //  앞의 장애물들이 흘러 지나가기를 기다린 뒤에 패턴을 낸다. 스폰이 멈춰 있으니
    //  1초 안에 반드시 자리가 생긴다.
    if (demonArming){
      if (demonSpaceReady(appW)) demonSpawn(appH);
      return;
    }
    // 아직 천장에 도달하지 않았으면 내지 않는다.
    if (!window.ENDLESS_MAX_MULT || speedMultiplier < window.ENDLESS_MAX_MULT - 0.001) return;
    // 까마귀 경고가 떠 있으면 다음 기회로 넘긴다 (경고가 끝나면 다시 들어온다).
    if (crowPending) return;
    if (gameTime < demonNextAt) return;
    demonArming = true;
    crowPending = true;   // 여기서부터 일반 장애물은 나오지 않는다
  }
