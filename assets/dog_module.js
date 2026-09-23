  /* ===================== 흑견 (무한질주 전용) =====================
     회피 게이지가 유모차의 2배만큼 차면 흑견이 우리 편으로 등장한다.
     크림이 옆에서 같이 달리다가, 닿을 수 있는 장애물이 앞에 오면 총알처럼
     튀어나가 물어서 없애고 다시 돌아온다. 3마리를 잡으면 오른쪽으로 달려나가 퇴장.

     - 유모차 무적과 절대 겹치지 않는다. 게이지가 다 찼어도 무적 중이면 끝날 때까지 기다린다.
       (흑견 게이지가 유모차의 2배라 둘이 정확히 같은 순간에 차오르기 때문에 꼭 필요하다.)
     - 까마귀는 "보이는 높이"가 흑견의 점프 높이 안에 들어왔을 때만 문다. 까마귀는 멀리서
       높이 떠 있다가 크림이 앞에서 급강하하므로, 자연스럽게 최저점 근처에서 잡히게 된다.
     - 까마귀를 물 때는 그 높이까지 뛰어오른다. 뛰는 동안에는 달리기 프레임 애니메이션을
       멈추고 두 번째 프레임(네 발이 다 떠서 몸이 늘어난 자세)으로 고정한다. 그림을 새로
       그리지 않고 점프 연출을 만드는 방법이다.
     - 장애물 제거는 무적 상태의 처치와 똑같은 연출/소리를 그대로 쓴다.

     이 파일은 assets/endless_boot.js 가 game.js 안쪽(같은 클로저)에 통째로 심는다.
     그래서 obstacles / score / speed 같은 게임 내부 변수를 그대로 쓸 수 있다.
     숫자 조절은 assets/endless_tune.js 에서 한다.
     ================================================================ */
  var DOG_ALLY_ON     = !!window.ENDLESS_MODE;
  var DOG_KO_SCORE    = window.ENDLESS_DOG_SCORE || 150;
  var DOG_KILLS_MAX   = window.ENDLESS_DOG_KILLS || 3;
  var DOG_GAUGE_MULT  = window.ENDLESS_DOG_GAUGE_MULT || 2;
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
  var dogPhase = 'escort';           // escort(동행) | dash(돌진) | back(복귀) | exit(퇴장)
  var dogX = 0, dogY = 0, dogEl = null;
  var dogFrameA = null, dogFrameB = null;   // 프레임 고정용

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

  // addGaugeDodge 에서 유모차 게이지와 같은 타이밍에 불린다.
  function dogAddDodge(){
    if (!DOG_ALLY_ON || dogActive) return;
    if (dogGauge < dogMax()) dogGauge++;
    dogUI();
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
    dogUI();
  }

  function dogReset(){
    dogGauge = 0;
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
    return o.type !== 'star' && o.type !== 'bonus' &&
           o.type !== 'finalstroller' && o.type !== 'boss';
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

    if (!dogActive){
      // 게이지가 다 찼어도 유모차 무적 중이면 끝날 때까지 기다린다 (겹침 방지).
      if (dogGauge >= dogMax() && !invincible){ dogGauge = 0; dogSummon(); }
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
      if (dogX <= home){ dogX = home; dogPhase = 'escort'; }

    } else { // exit - 임무 완수하고 오른쪽으로 달려나간다
      dogX += (speed * DOG_DASH_MULT + 420) * dt;
      if (dogX > edge + dogWidth()){ dogRetire(); return; }
    }

    dogLayout();
  }
