// ============================================================================
//  추가 장애물 패턴  (일반 / 하드 모드 공통)
// ============================================================================
//  이 파일은 부트 로더가 game.js 안쪽(같은 클로저)에 통째로 심는다. 그래야
//  obstacles / GRAVITY / speed 같은 게임 내부 값에 손이 닿는다.
//  game.js 는 한 글자도 고치지 않는다.
//
//  넣는 패턴 두 개 (기존 패턴은 전부 그대로 둔다)
//  --------------------------------------------------------------------------
//   2번  똥 쥐 똥   : 기존 "똥+쥐 콤보" 뒤에 똥 하나를 더 붙인다.
//                    정답 = 똥+쥐를 2단으로 넘고, 착지해서 다시 점프.
//   4번  똥 똥      : 똥 두 개가 바짝 붙어 나온다. 정답 = 2단 점프 한 번으로 둘 다.
//
//  ★ 간격을 숫자로 박지 않는 이유 ★
//  똥 크기는 하드 구간에서 2.6배가 되고, 중력과 속도는 모드/시간에 따라 달라진다.
//  그래서 간격을 픽셀로 박아두면 어떤 구간에서는 1단으로도 넘어가고(너무 쉬움) 어떤
//  구간에서는 2단으로도 못 넘는다(불가능). 매번 역산해서 그 구간의 물리에 맞춘다.
//
//  4번 간격을 정하는 방식 (실측 검산 포함)
//    - 똥 판정 높이 h = 똥높이 x 0.72
//    - 정점 P 인 점프가 높이 h 위에 머무는 시간 = 2 x sqrt(2(P-h)/중력)
//    - 두 똥을 다 지나려면 필요한 시간 = (두 똥의 판정 폭 + 간격 + 캐릭터 판정폭) / 속도
//    - 그 시간이 "2단 점프가 h 위에 머무는 시간"보다 PAT_PAIR_SLACK 만큼 짧게 되도록
//      간격을 정한다. 즉 2단으로는 여유를 두고 넘어가진다.
//    - 같은 시간이 "1단 점프가 h 위에 머무는 시간"보다는 길기 때문에 1단으로는 못 넘는다.
//      (390x844 실측: 하드 구간 1단 326ms / 2단 475ms / 통과창 388ms -> 1단 불가, 2단 가능)
//    - 하드 구간의 큰 똥은 계산상 간격이 0 이하로 나온다. 즉 딱 붙여야 넘어간다.
//      5,000점 전의 작은 똥은 82px 쯤 벌어진다. 둘 다 같은 규칙에서 자동으로 나온다.
//
//  2번 간격은 game.js 가 "서로 다른 장애물" 사이에 보장하는 최소 간격과 같은 식을 쓴다
//  (2단 체공 + 반응 여유 0.21초). 그래서 착지하고 누를 시간이 항상 실제로 생긴다.
//
//  ---- 테스트 주소 (?pattest=1) --------------------------------------------
//  패턴이 계속 나오고, 화면 왼쪽 위에 방금 나온 패턴과 실제 간격이 표시된다.
//  손잡이는 "원래보다 어렵게"만 움직인다 (쉽게 만드는 방향으로는 안 먹는다).
//  그래서 이 주소로 점수를 올려도 이득이 없다.
//    &pgap=0.8    2번의 3번째 똥 간격 배수 (1.0 이 기본, 낮을수록 촘촘)
//    &pslack=0.06 4번의 2단 여유 (초). 0.10 이 기본, 낮을수록 빡빡
// ============================================================================

  // 이 주소에서만 먹는 손잡이. 값은 "기본값보다 어려운 쪽"으로만 통과시킨다.
  var PAT_TEST = /[?&]pattest/.test(location.search);
  function patQ(name, dflt, harderIsLower){
    if (!PAT_TEST) return dflt;
    try {
      var v = new URLSearchParams(location.search).get(name);
      if (v === null || v === '') return dflt;
      var n = parseFloat(v);
      if (!isFinite(n)) return dflt;
      return harderIsLower ? Math.min(dflt, n) : Math.max(dflt, n);
    } catch (e) { return dflt; }
  }
  function patVal(name, dflt){
    var v = window[name];
    return (v == null) ? dflt : v;
  }

  // 패턴이 나오기 시작하는 점수. 기본은 하드 구간 진입 점수와 같다.
  //   일반 모드  -> 5,000점부터 (그 전 구간은 예전과 완전히 동일하다)
  //   무한질주    -> 1점부터 (HARD_MODE_SCORE 가 1 이다)
  function patActive(){
    if (PAT_TEST) return true;
    var m = patVal('PAT_MIN_SCORE', null);
    if (m == null) m = HARD_MODE_SCORE;
    return score >= m;
  }

  // 콤보와 같은 기준의 "가장 느릴 때 속도". 속도 파동이 내려간 순간에도 간격이
  // 넘어갈 수 있도록 보수적으로 잡는다.
  function patSafeSpeed(){
    return Math.min(MAX_SPEED, BASE_SPEED * speedMultiplier * (1 - SPEED_WAVE_AMPLITUDE));
  }
  // 정점 peak 인 점프가 높이 h 위에 머무는 시간(초)
  function patAbove(peak, h){
    return (peak > h) ? 2 * Math.sqrt(2 * (peak - h) / GRAVITY) : 0;
  }
  function patAir(peak){ return 2 * Math.sqrt(2 * peak / GRAVITY); }
  // 캐릭터 판정 폭 (목숨 상태에 따라 달라진다)
  function patCharHitW(){
    try {
      var c = LIFE_STATE_CFG[lifeState] || LIFE_STATE_CFG[3];
      return (c.hitFront - c.hitRear) * character.offsetWidth;
    } catch (e) { return 30; }
  }

  // 기존 똥과 똑같은 모양/판정으로 똥 하나를 더 놓는다.
  function patMakePoop(px, pw, ph){
    var el = document.createElement('div');
    el.className = 'obstacle poop';
    el.style.left = px + 'px';
    el.style.bottom = GROUND_H + 'px';
    el.style.width = pw + 'px';
    el.style.height = ph + 'px';
    el.innerHTML = '<img class="poop-img" src="' + IMG_POOP + '" alt="">';
    obstaclesLayer.appendChild(el);
    obstacles.push({ el: el, x: px, w: pw, h: ph, elevation: 0, type: 'poop',
      hitTop: POOP_HIT_TOP_FRAC, hitSide: POOP_HIT_SIDE_FRAC });
  }

  // 패턴이 차지한 길이만큼 다음 장애물을 뒤로 밀어, 패턴 위에 다른 게 겹치지 않게 한다.
  function patPushTail(spanPx){
    try {
      var s = Math.max(60, speed);
      var air = hardMode() ? patAir(JUMP_PEAK_2) : patAir(JUMP_PEAK_1);
      var need = (spanPx / s + air + 0.21) * 1000;
      if (nextSpawnIn < need) nextSpawnIn = need;
    } catch (e) {}
  }

  // ---- 4번: 똥 똥 (2단 점프 한 번으로 둘 다) --------------------------------
  //  넘을 수 없으면 -1 을 돌려준다 (그러면 이 패턴을 내지 않는다).
  //  ★ 이 안전 밸브가 꼭 필요하다 ★
  //  느린 구간에서 큰 똥이 나오면, 두 똥을 딱 붙여놔도 통과에 걸리는 시간이 2단 점프가
  //  똥 위에 머무는 시간보다 길어진다. 즉 물리적으로 못 넘는 패턴이 된다.
  //  (실측: 배수가 낮은 구간에서 여유 -66ms) 그럴 때는 그냥 안 내보낸다.
  function patPairGap(pw, ph){
    var h = ph * POOP_HIT_TOP_FRAC;
    var t2 = patAbove(JUMP_PEAK_2, h);                  // 2단 점프가 똥 위에 머무는 시간
    var s = patSafeSpeed();
    var span = pw * 2 * (1 - POOP_HIT_SIDE_FRAC) + patCharHitW();
    var slack = patQ('pslack', patVal('PAT_PAIR_SLACK', 0.10), true);
    var gap = (t2 - slack) * s - span;
    if (gap >= 0) return gap;
    // 간격을 0 으로 붙여도 원하는 여유가 안 나오는 구간. 최소 여유라도 나오면 붙여서
    // 내고, 그것도 안 되면 포기한다.
    if (t2 - span / s >= patVal('PAT_PAIR_MIN_SLACK', 0.05)) return 0;
    return -1;
  }

  function patPoopPair(x, pw, ph){
    if (!patActive()) return;
    var chance = PAT_TEST ? 1 : patVal('PAT_PAIR_CHANCE', 0.22);
    if (Math.random() >= chance) return;
    var gap = patPairGap(pw, ph);
    if (gap < 0){ patNote('똥똥  건너뜀 (이 속도에선 2단으로 못 넘음)'); return; }
    var x2 = x + pw + gap;
    patMakePoop(x2, pw, ph);
    lastSpawnType = 'poop';
    patPushTail(x2 + pw - x);
    patNote('똥똥  간격 ' + Math.round(gap) + 'px');
  }

  // ---- 2번: 똥 쥐 똥 (콤보 뒤에 똥 하나) ------------------------------------
  //  콤보 쥐의 위치를 game.js 와 똑같은 식으로 다시 구해서, 그 뒤로 정상 간격만큼
  //  띄운 자리에 똥을 놓는다.
  function patAfterCombo(x, pw, ph){
    if (!patActive()) return;
    var chance = PAT_TEST ? 1 : patVal('PAT_TRIPLE_CHANCE', 0.45);
    if (Math.random() >= chance) return;
    var s = patSafeSpeed();
    var dogX = x + pw + s * patAir(JUMP_PEAK_1) * COMBO_GAP_FRAC;
    var dogW = DOG_H * DOG_ASPECT;
    var mult = patQ('pgap', patVal('PAT_TRIPLE_GAP_MULT', 1.0), true);
    var gap3 = (patAir(JUMP_PEAK_2) + 0.21) * s * mult;
    var x3 = dogX + dogW + gap3;
    patMakePoop(x3, pw, ph);
    lastSpawnType = 'poop';
    patPushTail(x3 + pw - x);
    patNote('똥쥐똥  3번째 +' + Math.round(gap3) + 'px');
  }

  // ---- 테스트용 표시 -------------------------------------------------------
  var patBox = null;
  function patNote(txt){
    if (!PAT_TEST) return;
    try {
      if (!patBox){
        patBox = document.createElement('div');
        patBox.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99998;' +
          'background:rgba(0,0,0,.78);color:#ffd9a0;font:700 11px/1.5 monospace;' +
          'padding:5px 8px;border-radius:6px;white-space:pre;pointer-events:none;';
        (document.body || document.documentElement).appendChild(patBox);
      }
      patBox.textContent = '패턴: ' + txt + '\n속도 ' + Math.round(speed) +
        'px/s  배수 ' + speedMultiplier.toFixed(2) +
        '\n1단 ' + Math.round(patAir(JUMP_PEAK_1) * 1000) +
        'ms  2단 ' + Math.round(patAir(JUMP_PEAK_2) * 1000) + 'ms';
    } catch (e) {}
  }
