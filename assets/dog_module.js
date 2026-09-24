  /* ===================== 흑견 (무한질주 전용) =====================
     크림이 혼자 남았을 때(마지막 목숨)부터 흑견 게이지가 차기 시작한다. 그 전에는
     한 칸도 오르지 않는다. 다 차면 흑견이 우리 편으로 등장해서, 크림이 옆에서 같이
     달리다가 닿을 수 있는 장애물이 앞에 오면 총알처럼 튀어나가 물어서 없애고 다시
     돌아온다. 5마리를 잡으면 오른쪽으로 달려나가 퇴장.

     [소환 조건]
     - 마지막 목숨(lifeState 1, 크림이 혼자)이 되는 순간부터 충전 시작. 그 순간
       게이지를 0으로 맞추고 거기서부터 센다.
     - 충전 속도는 유모차의 1/3 (유모차 한 칸 찰 동안 흑견은 1/3칸).
       회피 이벤트 자체는 유모차와 같은 것을 쓰지만, 필요한 양이 3배라 속도가 1/3이 된다.
     - 유모차 무적 중에는 소환하지 않는다. 다 찼어도 무적이 끝날 때까지 기다린다.
     - 가족이 남아 있는 동안에는 흑견이 아예 안 나온다. "혼자 남았을 때 도와주러
       오는 친구"라는 규칙이다.

     - 나갈 때(dash)와 돌아올 때(back) 모두 문다. 돌진만 물게 했더니, 왕복 0.4초 동안
       나머지 장애물이 흑견 뒤로 지나가버려서 "한 마리만 잡고 가만히 있는" 일이 생겼다
       (장애물이 촘촘한 천장 속도에서 특히). 돌아오는 길에도 쓸고 오면 뭉쳐 나온
       장애물을 제대로 정해진 마리 수까지 처리한다.

     - 유모차 무적과 겹치지 않는다. 소환 직전에 무적 여부를 확인하고, 무적 중이면
       끝날 때까지 기다린다.
     - 까마귀는 "보이는 높이"가 흑견의 점프 높이 안에 들어왔을 때만 문다. 까마귀는 멀리서
       높이 떠 있다가 크림이 앞에서 급강하하므로, 자연스럽게 최저점 근처에서 잡히게 된다.
     - 까마귀를 물 때는 그 높이까지 뛰어오른다. 뛰는 동안에는 달리기 프레임 애니메이션을
       멈추고 두 번째 프레임(네 발이 다 떠서 몸이 늘어난 자세)으로 고정한다. 그림을 새로
       그리지 않고 점프 연출을 만드는 방법이다.
     - 장애물 제거는 무적 상태의 처치와 똑같은 연출/소리를 그대로 쓴다.
     - 머리 위에 남은 마리 수 배지가 붙는다 (5 -> 4 -> 3 -> 2 -> 1). 아래 dogMakeCount 참고.

     이 파일은 assets/endless_boot.js 가 game.js 안쪽(같은 클로저)에 통째로 심는다.
     그래서 obstacles / score / speed 같은 게임 내부 변수를 그대로 쓸 수 있다.
     숫자 조절은 assets/endless_tune.js 에서 한다.
     ================================================================ */
  var DOG_ALLY_ON     = !!window.ENDLESS_MODE;
  var DOG_KO_SCORE    = window.ENDLESS_DOG_SCORE || 150;
  var DOG_KILLS_MAX   = window.ENDLESS_DOG_KILLS || 5;
  //  유모차 게이지의 몇 배가 필요한지. 3 = 유모차의 1/3 속도로 찬다.
  var DOG_GAUGE_MULT  = window.ENDLESS_DOG_GAUGE_MULT || 3;
  //  이 목숨 상태부터 충전이 시작된다. 1 = 크림이 혼자 남았을 때.
  var DOG_LIFE_GATE   = window.ENDLESS_DOG_LIFE_GATE || 1;
  var DOG_REACH_MULT  = window.ENDLESS_DOG_REACH || 2.0;
  var DOG_DASH_MULT   = window.ENDLESS_DOG_DASH || 2.4;
  var DOG_BACK_MULT   = window.ENDLESS_DOG_BACK || 3.2;
  // 까마귀를 물지 여부. 기본은 true(문다). 물 때는 그 높이까지 뛰어오른다.
  // endless_tune.js 에서 false 로 두면 까마귀는 그냥 지나치고 똥/쥐만 잡는다.
  var DOG_CATCH_CROW  = (window.ENDLESS_DOG_CATCH_CROW !== false);
  //  뛰어오른 높이가 이 값을 넘으면 점프 프레임으로 고정한다 (흑견 키 대비).
  var DOG_LEAP_SHOW   = 0.12;
  //  물기 판정에 허용하는 위아래 오차 (흑견 키 대비). 너무 좁으면 스쳐 지나간다.
  var DOG_BITE_V      = 0.70;
  //  뛰어오르고 내려오는 속도. 클수록 빠르게 달라붙는다.
  var DOG_LEAP_EASE   = 12;

  var dogGauge = 0, dogActive = false, dogKills = 0;
  var dogPrevLife = null;   // 지난 프레임의 목숨 상태 (혼자 남는 순간을 잡기 위해)
  var dogPhase = 'escort';           // escort(동행) | dash(돌진) | back(복귀) | exit(퇴장)
  var dogX = 0, dogY = 0, dogEl = null;
  var dogFrameA = null, dogFrameB = null;   // 프레임 고정용
  var dogCountEl = null, dogCountNumEl = null;   // 남은 마리 수 배지

  var dogFillEl  = document.getElementById('dogFill');
  var dogRiderEl = document.getElementById('dogRider');

  function dogMax(){ return currentGaugeMax() * DOG_GAUGE_MULT; }
  function dogHeight(){ return DOG_H * 1.15; }
  function dogWidth(){ return dogHeight() * DOG_ASPECT; }
  // 크림이 '앞'(오른쪽)에 붙어서 같이 달린다. 거기서 앞으로 튀어나간다.
  function dogHome(){ return charLeftPx + (character.offsetWidth || 60) * 0.78; }
  function dogReach(){ return DOG_H * DOG_REACH_MULT; }

  function dogUI(){
    if (!dogFillEl) return;
    var pct = dogActive ? 100 : Math.min(100, (dogGauge / dogMax()) * 100);
    dogFillEl.style.width = pct + '%';
    dogFillEl.classList.toggle('full', dogActive || dogGauge >= dogMax());
    if (dogRiderEl) dogRiderEl.style.left = Math.max(3, Math.min(97, pct)) + '%';
  }

  // addGaugeDodge 에서 유모차 게이지와 같은 타이밍에 불린다. 단, 크림이 혼자
  // 남기 전에는 한 칸도 올리지 않는다. 필요한 양이 유모차의 DOG_GAUGE_MULT 배라
  // 결과적으로 충전 속도가 1/DOG_GAUGE_MULT 가 된다.
  function dogAddDodge(){
    if (!DOG_ALLY_ON || dogActive) return;
    if (lifeState > DOG_LIFE_GATE) return;
    if (dogGauge < dogMax()) dogGauge++;
    dogUI();
  }

  // ---- 남은 마리 수 배지 (5 -> 4 -> 3 -> 2 -> 1) ----------------------------
  //  흑견이 몇 마리 더 잡고 퇴장하는지 보여준다. 유모차 무적 카운트다운
  //  (style.css 의 #charCountdown)과 같은 모양이고 색만 흑견의 파란색이다.
  //
  //  왜 게이지 바에 안 붙였나: #dogBarWrap 은 style 에서 화면 높이가 600px 이하일 때
  //  숨겨진다. 폰은 거의 다 그 아래라서 게이지 바에 숫자를 넣으면 정작 폰에서 안 보인다.
  //  왜 흑견 안에 안 넣었나: 흑견 그림은 달려나갈 때 좌우가 뒤집히므로(.face-right)
  //  자식으로 넣으면 숫자도 거울처럼 뒤집힌다. 그래서 #app 에 따로 얹고 흑견 머리 위로
  //  위치만 따라가게 한다.
  function dogMakeCount(){
    if (dogCountEl || !app) return;
    if (!document.getElementById('dogCountCss')){
      var css = document.createElement('style');
      css.id = 'dogCountCss';
      css.textContent =
        '#dogCount{position:absolute;pointer-events:none;z-index:9;opacity:0;' +
          'box-sizing:border-box;' +   // 테두리 2px 을 폭에 포함시켜야 화면 끝 잘림 계산이 맞는다
          'border-radius:50%;display:flex;align-items:center;justify-content:center;' +
          'background:radial-gradient(circle at 35% 30%,#eaf4ff 0%,#8fc7ff 55%,#2f5fa8 100%);' +
          'border:2px solid #fff;' +
          'box-shadow:0 0 8px 2px rgba(140,200,255,.85),0 2px 4px rgba(0,0,0,.4);' +
          'transition:opacity .15s linear;}' +
        '#dogCountNum{font-family:"Baloo 2",sans-serif;font-weight:800;color:#fff;' +
          'line-height:1;text-shadow:0 1px 2px rgba(0,0,0,.45);}' +
        '@keyframes dogCountPop{from{transform:scale(1.4);}to{transform:scale(1);}}' +
        '#dogCount.on{opacity:1;}' +
        '#dogCount.bump{animation:dogCountPop .22s ease-out;}';
      document.head.appendChild(css);
    }
    dogCountEl = document.createElement('div');
    dogCountEl.id = 'dogCount';
    dogCountNumEl = document.createElement('span');
    dogCountNumEl.id = 'dogCountNum';
    dogCountEl.appendChild(dogCountNumEl);
    app.appendChild(dogCountEl);
  }

  function dogCountHide(){
    if (dogCountEl) dogCountEl.classList.remove('on');
  }

  function dogCountLayout(){
    if (!dogCountEl || !app) return;
    var left = DOG_KILLS_MAX - dogKills;
    if (!dogActive || left <= 0 || (dogEl && dogEl.hidden)){ dogCountHide(); return; }
    var appW = app.clientWidth || 390;
    var appH = app.clientHeight || 219;
    var size = Math.max(20, Math.min(34, appH * 0.135));
    dogCountEl.style.width = size.toFixed(1) + 'px';
    dogCountEl.style.height = size.toFixed(1) + 'px';
    dogCountNumEl.style.fontSize = (size * 0.52).toFixed(1) + 'px';
    var lx = dogX + dogWidth() / 2 - size / 2;
    if (lx < 2) lx = 2;
    if (lx > appW - size - 2) lx = appW - size - 2;
    dogCountEl.style.left = lx.toFixed(1) + 'px';
    dogCountEl.style.bottom =
      Math.min(appH - size - 2, GROUND_H + dogY + dogHeight() + 3).toFixed(1) + 'px';
    // 숫자가 줄어드는 순간에만 한 번 통 튀게 한다.
    if (dogCountNumEl.textContent !== String(left)){
      dogCountNumEl.textContent = String(left);
      dogCountEl.classList.remove('bump');
      void dogCountEl.offsetWidth;          // 애니메이션을 다시 재생시키기 위한 강제 계산
      dogCountEl.classList.add('bump');
    }
    dogCountEl.classList.add('on');
  }

  function dogMakeEl(){
    if (dogEl) return;
    dogEl = document.createElement('div');
    // 장애물 흑견과 같은 클래스를 써서 달리는 프레임 애니메이션을 그대로 물려받는다.
    dogEl.className = 'obstacle dog ally-dog';
    // 우리 편 전용 흑견 그림을 쓴다. assets/img_dog_a.png 는 지금 '장애물 쥐' 그림이라
    // 그걸 쓰면 우리 편이 쥐로 나온다. 그림 파일이 없으면 예전처럼 장애물 그림으로 돌아간다.
    dogEl.innerHTML =
      '<img class="dog-frame frame-a" src="' + (window.ALLY_DOG_A || IMG_DOG_A) + '" alt="">' +
      '<img class="dog-frame frame-b" src="' + (window.ALLY_DOG_B || IMG_DOG_B) + '" alt="">';
    obstaclesLayer.appendChild(dogEl);
    dogFrameA = dogEl.querySelector('.frame-a');
    dogFrameB = dogEl.querySelector('.frame-b');
    dogMakeCount();
  }

  // 달리기 프레임 애니메이션을 멈추고 2번 프레임(점프 자세)으로 고정한다.
  // style.css 는 건드리지 않는다 - 인라인 스타일이 스타일시트를 덮어쓴다.
  function dogSetLeapFrame(on){
    if (!dogFrameA || !dogFrameB) return;
    if (on){
      dogFrameA.style.animation = 'none';
      dogFrameA.style.opacity = '0';
      dogFrameB.style.animation = 'none';
      dogFrameB.style.opacity = '1';
    } else {
      dogFrameA.style.animation = '';
      dogFrameA.style.opacity = '';
      dogFrameB.style.animation = '';
      dogFrameB.style.opacity = '';
    }
  }

  function dogLayout(){
    if (!dogEl) return;
    var h = dogHeight();
    dogEl.style.width = (h * DOG_ASPECT) + 'px';
    dogEl.style.height = h + 'px';
    dogEl.style.left = dogX + 'px';
    dogEl.style.bottom = (GROUND_H + dogY) + 'px';
    dogSetLeapFrame(dogY > DOG_H * DOG_LEAP_SHOW);
    // 원본 그림은 왼쪽을 보고 있다. 앞으로 달려나갈 때만 좌우를 뒤집고,
    // 돌아올 때는 원래 방향이 그대로 맞다.
    dogEl.classList.toggle('face-right', dogPhase !== 'back');
    dogCountLayout();
  }

  function dogSummon(){
    dogActive = true;
    dogKills = 0;
    dogPhase = 'escort';
    dogX = dogHome();
    dogY = 0;
    dogMakeEl();
    dogEl.hidden = false;
    dogLayout();
    playPickupSfx();
    dogUI();
  }

  function dogRetire(){
    dogActive = false;
    dogKills = 0;
    dogPhase = 'escort';
    dogY = 0;
    if (dogEl){ dogSetLeapFrame(false); dogEl.hidden = true; }
    dogCountHide();
    dogUI();
  }

  function dogReset(){
    dogGauge = 0;
    dogPrevLife = null;
    dogRetire();
  }

  // 까마귀가 "화면에 보이는" 높이. game.js의 연출 계산과 똑같은 식이다.
  function dogLiftOf(o){
    if (o.type !== 'crow') return 0;
    var d = Math.abs(o.x - charLeftPx);
    var t = Math.min(1, d / CROW_ARC_RANGE);
    return CROW_LIFT_MAX * (t * t);
  }
  function dogIsHazard(o){
    if (o.type === 'crow') return DOG_CATCH_CROW;
    // 악마는 물지 않는다. 악마 패턴은 외워서 푸는 고정 패턴이라, 흑견이 중간에
    // 치워버리면 패턴이 성립하지 않는다 (똥/까마귀는 그대로 다 잡는다).
    return o.type !== 'star' && o.type !== 'bonus' &&
           o.type !== 'finalstroller' && o.type !== 'boss' && o.type !== 'demon';
  }
  function dogCanReach(o){
    return ((o.elevation || 0) + (o.hop || 0) + dogLiftOf(o)) <= dogReach();
  }

  // 앞쪽에 있는, 지금 닿을 수 있는 가장 가까운 장애물 자체를 돌려준다.
  // (x만 알면 되던 예전과 달리, 뛰어오를 높이를 알아야 해서 객체가 필요하다)
  function dogTarget(){
    var best = null;
    for (var i = 0; i < obstacles.length; i++){
      var o = obstacles[i];
      if (!dogIsHazard(o) || !dogCanReach(o)) continue;
      if (o.x + o.w < dogX) continue;
      if (best === null || o.x < best.x) best = o;
    }
    return best;
  }

  function dogHitIndex(){
    var w = dogWidth();
    for (var i = 0; i < obstacles.length; i++){
      var o = obstacles[i];
      if (!dogIsHazard(o) || !dogCanReach(o)) continue;
      if (dogX >= o.x + o.w || dogX + w <= o.x) continue;
      // 높이도 맞아야 한다. 땅에 있는 흑견이 하늘의 까마귀를 물 수는 없다.
      if (Math.abs(dogLiftOf(o) - dogY) > DOG_H * DOG_BITE_V) continue;
      return i;
    }
    return -1;
  }

  function dogBite(i){
    var o = obstacles[i];
    var top = groundTop - o.h - (o.elevation || 0) - (o.hop || 0) - dogLiftOf(o);
    spawnImpactEffect(o.x + o.w / 2, top + o.h / 2);
    spawnKoPopFx(o.x + o.w / 2, top - 10, DOG_KO_SCORE);
    playPlowSfx();
    score += DOG_KO_SCORE;
    triggerObstacleKO(o.el);
    obstacles.splice(i, 1);
    dogKills++;
  }

  function dogUpdate(dt){
    if (!DOG_ALLY_ON || state !== 'playing') return;

    // 크림이 혼자 남는 "그 순간"을 잡아서 게이지를 0에서 다시 시작한다.
    if (dogPrevLife !== null && dogPrevLife > DOG_LIFE_GATE && lifeState <= DOG_LIFE_GATE){
      dogGauge = 0;
      dogUI();
    }
    dogPrevLife = lifeState;

    if (!dogActive){
      // 다 찼어도 유모차 무적 중이면 끝날 때까지 기다린다 (겹침 방지).
      if (lifeState <= DOG_LIFE_GATE && dogGauge >= dogMax() && !invincible){
        dogGauge = 0;
        dogSummon();
      }
      return;
    }

    var home = dogHome();
    var edge = app.clientWidth;

    // 이번 프레임에 뛰어올라야 하는 높이. 돌진 중에 닿을 수 있는 까마귀가 앞에 있으면
    // 그 까마귀가 "보이는 높이"까지 뛴다. 그 외에는 땅으로 내려온다.
    var want = 0;
    var tgt = dogTarget();
    if (dogPhase === 'dash' && tgt) want = dogLiftOf(tgt);
    dogY += (want - dogY) * Math.min(1, dt * DOG_LEAP_EASE);
    if (dogY < 0.5) dogY = 0;

    if (dogPhase === 'escort'){
      dogX += (home - dogX) * Math.min(1, dt * 10);
      if (tgt && tgt.x - dogX < edge * 0.72) dogPhase = 'dash';

    } else if (dogPhase === 'dash'){
      dogX += (speed * DOG_DASH_MULT + 240) * dt;
      var hit = dogHitIndex();
      if (hit >= 0){
        dogBite(hit);
        dogPhase = (dogKills >= DOG_KILLS_MAX) ? 'exit' : 'back';
      } else if (dogX > edge * 0.88){
        dogPhase = 'back';
      }

    } else if (dogPhase === 'back'){
      dogX -= (speed * DOG_BACK_MULT + 260) * dt;
      // 돌아오는 길에도 문다. 뭉쳐 나온 장애물을 놓치지 않으려면 이게 필요하다.
      var hitBack = dogHitIndex();
      if (hitBack >= 0){
        dogBite(hitBack);
        if (dogKills >= DOG_KILLS_MAX){ dogPhase = 'exit'; }
      }
      if (dogPhase === 'back' && dogX <= home){ dogX = home; dogPhase = 'escort'; }

    } else { // exit - 임무 완수하고 오른쪽으로 달려나간다
      dogX += (speed * DOG_DASH_MULT + 420) * dt;
      if (dogX > edge + dogWidth()){ dogRetire(); return; }
    }

    dogLayout();
  }
