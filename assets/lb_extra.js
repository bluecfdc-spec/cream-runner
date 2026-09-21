/* ---- 순위표 추가 기능 (game.js 뒤에 로드되어야 한다) --------------------------------
   원래는 game.js에 들어가야 할 기능들이다. game.js가 114KB라 도구로 통째로 올릴 수
   없어서 이 파일로 분리했다. 나중에 PC에서 game.js를 교체할 때 이 파일을 지우고
   game.js 쪽으로 옮기면 동작은 같다. index.html에서 이 파일 참조 한 줄을 지우면
   예전 동작(TOP 10만 보기 / TOP 10만 등록)으로 그대로 돌아간다.

   1) 전체 순위 보기 버튼      - 기본은 꺼짐. 이벤트 때만 켜서 150위까지 펼친다
   2) 등수 통지 + 노네임 기록  - 등록 가능 등수 밖이면 이름 없이 점수만 남기고 등수를 알려준다
   3) 오판정 보정              - 아래 "왜 보정이 필요한가" 참고
   4) 시작화면 공지 팝업       - Firestore의 visits/notice 문서를 읽어서 띄운다
   5) 깜짝 이벤트 스위치       - 아래 HALL_EVENT / HALL_UNTIL 참고
   6) 등수 안내 위치           - 점수 바로 아래(순위표 위)로 옮겨 스크롤 없이 보이게 한다
   7) 제목 문구                - 순위표 제목 앞에 "명예의 전당"을 붙인다

   ---- 왜 보정이 필요한가 -----------------------------------------------------------
   game.js는 Firebase SDK의 get() 으로 순위표를 읽는다. SDK는 서버 연결이 순간적으로
   끊기면 에러를 내지 않고 기기 캐시로 대체하는데, 캐시가 비어 있으면 "기록 0건"을
   정상 응답처럼 돌려준다. 그러면 game.js는 "기록이 10건 미만이면 누구나 TOP 10"이라는
   판정 때문에 6,000점짜리 판에도 이름 입력창을 띄우고, 목록에는 "아직 기록이 없어요"가
   뜬다 (2026-09-21 카톡 인앱 브라우저에서 실제로 발생).

   이 파일은 등수를 REST로 직접 물어본다. REST는 실패하면 확실히 실패해서 캐시에
   속지 않는다. 그래서 그 숫자를 최종 근거로 삼아,
     - 목록이 비어 있으면 REST로 다시 읽어 채우고
     - 실제 등수가 등록 가능 등수 밖이면 game.js가 열어둔 입력창을 닫는다.
   REST 조회까지 실패하면 (정말로 오프라인) 아무것도 건드리지 않는다.
   ----------------------------------------------------------------------------------- */

(function(){
  "use strict";

  /* "전체 순위 보기" 버튼. 평소에는 10등까지만 이름을 남길 수 있어서 그 아래를
     펼쳐 봐도 의미가 없으므로 꺼둔다. 이벤트로 11등 이하 등록이 열릴 때 true 로
     바꾸면 같이 살아난다. */
  var SHOW_ALL_BTN = false;

  var LIMIT    = 150;     // 버튼을 켰을 때 펼칠 줄 수
  var RANK_MAX = 1000;    // 등수를 숫자로 알려주는 한계. 이 밖은 "1,000위 밖"으로만 표시
  var CLEAR    = '클리어';

  /* ---- 이름 등록이 허용되는 등수 -------------------------------------------------
     평소에는 HALL_BASE(10등)까지만 이름을 남길 수 있다.

     깜짝 이벤트를 발동할 때 아래 값들만 채워서 이 파일을 다시 올린다.
       SHOW_ALL_BTN = true;
       HALL_EVENT = 150;
       HALL_UNTIL = '2026-09-24T00:00:00+09:00';
     그러면 그 시각까지 150등까지 이름 등록이 열리고(그리고 전체 순위 보기 버튼이
     살아나고), 시각이 지나는 순간 자동으로 10등으로 돌아간다. HALL_EVENT 가
     null 이면 이벤트는 꺼진 상태다.

     마감 판정은 기기 시계가 아니라 Firestore 응답의 서버 시각(readTime)으로 한다.
     폰 시간을 바꿔서 마감 뒤에 등록하는 것을 막기 위해서다. 서버 시각을 아직
     못 받았으면 안전한 쪽(10등)으로 둔다.
     ------------------------------------------------------------------------------- */
  var HALL_BASE  = 10;
  var HALL_EVENT = null;
  var HALL_UNTIL = null;

  var serverNow = null;   // 서버 시각(ms). countAbove 응답에서 채워진다.

  function hallSize(){
    if (!HALL_EVENT) return HALL_BASE;
    if (!HALL_UNTIL) return HALL_EVENT;
    var until = Date.parse(HALL_UNTIL);
    if (isNaN(until)) return HALL_BASE;
    if (serverNow === null) return HALL_BASE;
    return (serverNow < until) ? HALL_EVENT : HALL_BASE;
  }

  var KEY   = 'AIzaSyAKW4uUsBQxaGOujIi4gS95TsvQnamkX_g';
  var BASE  = 'https://firestore.googleapis.com/v1/projects/cream-runner/databases/(default)/documents';
  var AGG   = BASE + ':runAggregationQuery?key=' + KEY;
  var RUNQ  = BASE + ':runQuery?key=' + KEY;
  var PLAYS = BASE + '/plays?key=' + KEY;

  var list    = document.getElementById('top10List');
  var board   = document.getElementById('top10Board');
  var status  = document.getElementById('top10Status');
  var over    = document.getElementById('gameOverScreen');
  var scoreEl = document.getElementById('finalScore');
  var box     = document.getElementById('newRecordBox');
  var label   = document.getElementById('newRecordLabel');
  var input   = document.getElementById('nameInput');
  var submit  = document.getElementById('submitNameBtn');
  if (!list || !board || !over || !scoreEl || !box || !label || !input || !submit) return;
  if (!window.MutationObserver) return;

  /* ---- 순위표 제목 문구 ----------------------------------------------------------
     index.html 에는 "TOP 3" / "TOP 10" 으로 들어 있다. 그 앞에 "명예의 전당"을
     여기서 붙인다. index.html 을 건드리지 않으려고 이 파일에서 처리한다.
     시작화면은 TOP3 조회가 끝난 뒤에 나타나므로 글자가 바뀌는 순간이 보이지 않는다.
     ------------------------------------------------------------------------------- */
  var HALL_NAME = '명예의 전당';

  var title = board.querySelector('.leaderboard-title');
  var titleBase = title ? title.textContent : '';
  if (titleBase.indexOf(HALL_NAME) < 0){
    titleBase = titleBase.replace('TOP 10', HALL_NAME + ' TOP 10');
  }

  var top3Title = document.querySelector('#top3Board .leaderboard-title');
  if (top3Title && top3Title.textContent.indexOf(HALL_NAME) < 0){
    top3Title.textContent = top3Title.textContent.replace('TOP 3', HALL_NAME + ' TOP 3');
  }

  // game.js와 같은 기준으로 테스트 모드를 걸러낸다 (?boss / ?hard). 기록도 남기지 않는다.
  var testMode = false;
  try {
    var qs = new URLSearchParams(window.location.search);
    testMode = !!(qs.get('boss') || qs.get('hard'));
  } catch (e) {}

  // ---- 공통 ----------------------------------------------------------------------

  function today(){
    var d = new Date();
    return d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) +
           '.' + ('0' + d.getDate()).slice(-2);
  }
  function currentScore(){
    var n = parseInt(String(scoreEl.textContent).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? null : n;
  }
  function numOf(f){
    if (!f) return 0;
    if (f.integerValue != null) return parseInt(f.integerValue, 10);
    if (f.doubleValue != null) return Number(f.doubleValue);
    return 0;
  }

  // 점수 내림차순 상위 n건. 실패하면 null (캐시로 대체되지 않는다).
  function fetchTop(n){
    return fetch(RUNQ, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'scores' }],
        orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
        limit: n
      } })
    }).then(function(r){
      if (!r.ok) throw new Error('q ' + r.status);
      return r.json();
    }).then(function(j){
      if (!j || !j.length) return null;
      var rows = [], i, f;
      for (i = 0; i < j.length; i++){
        if (!j[i].document) continue;
        f = j[i].document.fields || {};
        rows.push({
          name:  f.name ? f.name.stringValue : '',
          score: numOf(f.score),
          date:  f.date ? f.date.stringValue : ''
        });
      }
      return rows;
    }).catch(function(){ return null; });
  }

  // 한 컬렉션에서 내 점수보다 높은 기록 수. 실패하면 null.
  function countAbove(coll, score){
    return fetch(AGG, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredAggregationQuery: {
        structuredQuery: {
          from: [{ collectionId: coll }],
          where: { fieldFilter: {
            field: { fieldPath: 'score' },
            op: 'GREATER_THAN',
            value: { integerValue: String(score) }
          } }
        },
        aggregations: [{ alias: 'n', count: {} }]
      } })
    }).then(function(r){
      if (!r.ok) throw new Error('agg ' + r.status);
      return r.json();
    }).then(function(j){
      var n = null, i, t;
      for (i = 0; i < j.length; i++){
        if (!j[i]) continue;
        if (j[i].readTime){                       // 서버 시각 (마감 판정에 쓴다)
          t = Date.parse(j[i].readTime);
          if (!isNaN(t)) serverNow = t;
        }
        if (j[i].result && j[i].result.aggregateFields && j[i].result.aggregateFields.n){
          n = parseInt(j[i].result.aggregateFields.n.integerValue, 10);
        }
      }
      return (n === null || isNaN(n)) ? null : n;
    }).catch(function(){ return null; });
  }

  // 등수 = (이름 있는 기록 중 위) + (노네임 기록 중 위) + 1
  // plays 규칙이 아직 없으면 그쪽이 null이 되어 scores 만으로 계산한다.
  function askRank(score){
    return Promise.all([countAbove('scores', score), countAbove('plays', score)])
      .then(function(r){
        if (r[0] === null) return null;
        return r[0] + (r[1] === null ? 0 : r[1]) + 1;
      });
  }

  // 등록 가능 등수 밖의 판을 이름 없이 남긴다. 다음 사람들의 등수 계산에 쓰인다.
  function recordPlay(score){
    return fetch(PLAYS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        score: { integerValue: String(score) },
        date:  { stringValue: today() }
      } })
    }).catch(function(){});
  }

  // game.js의 renderLeaderboard와 같은 마크업으로 그린다.
  function render(rows){
    var ms = currentScore(), md = today();
    list.innerHTML = '';
    rows.forEach(function(e, i){
      var li = document.createElement('li');
      if (ms !== null && e.score === ms && e.date === md){
        li.style.background = 'rgba(240,180,41,.16)';
        li.style.borderRadius = '8px';
      }
      var rk = document.createElement('span');
      rk.className = 'lb-rank';
      rk.textContent = (i + 1) + '위';
      var nm = document.createElement('span');
      nm.className = 'lb-name';
      var raw = String(e.name == null ? '' : e.name);
      if (raw.indexOf(CLEAR) === 0){
        var bd = document.createElement('span');
        bd.className = 'lb-clear';
        bd.textContent = CLEAR;
        nm.appendChild(bd);
        nm.appendChild(document.createTextNode(raw.slice(CLEAR.length).replace(/^\s+/, '')));
      } else {
        nm.textContent = raw;
      }
      var sc = document.createElement('span');
      sc.className = 'lb-score';
      sc.textContent = e.score + '점';
      var dt = document.createElement('span');
      dt.className = 'lb-date';
      dt.textContent = e.date || '';
      li.appendChild(rk); li.appendChild(nm); li.appendChild(sc); li.appendChild(dt);
      list.appendChild(li);
    });
  }

  // ---- 1) 전체 순위 보기 버튼 (SHOW_ALL_BTN 이 true 일 때만) ------------------------

  var btn = null;
  var expanded = false, savedHtml = null, cached = null;

  function paint(){
    if (title) title.textContent = expanded ? titleBase.replace('TOP 10', 'TOP ' + LIMIT) : titleBase;
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = expanded ? 'TOP 10만 보기' : '전체 순위 보기';
  }
  function expand(rows){
    if (savedHtml === null) savedHtml = list.innerHTML;
    cached = rows;
    expanded = true;
    render(rows);
    paint();
  }

  if (SHOW_ALL_BTN){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'display:block;width:100%;margin:6px 0 2px;padding:7px 10px;' +
      "font-family:'Baloo 2',sans-serif;font-size:12.5px;font-weight:700;color:#3d6fa8;" +
      'background:#f6f9fd;border:2px solid #f0dfb8;border-radius:10px;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;';
    board.appendChild(btn);
    btn.addEventListener('click', function(){
      if (expanded){
        expanded = false;
        if (savedHtml !== null) list.innerHTML = savedHtml;
        paint();
        return;
      }
      if (cached){ expand(cached); return; }
      btn.disabled = true;
      btn.textContent = '불러오는 중...';
      fetchTop(LIMIT).then(function(rows){
        if (!rows || !rows.length){ paint(); return; }
        expand(rows);
      });
    });
  }

  // ---- 2) 등수 통지 + 노네임 기록 + 오판정 보정 ------------------------------------

  var pending = null, pendingScore = null, recordedThisRound = false;

  // 점수가 확정되는 순간 미리 등수를 물어둔다 (점수 화면은 그 뒤에 나타난다).
  new MutationObserver(function(){
    if (testMode) return;
    var s = currentScore();
    if (s === null || s === pendingScore) return;
    pendingScore = s;
    pending = askRank(s);
  }).observe(scoreEl, { childList: true, characterData: true, subtree: true });

  new MutationObserver(function(){
    if (over.hidden){
      recordedThisRound = false;
      expanded = false; savedHtml = null; cached = null;
      paint();
      return;
    }
    paint();
    if (testMode) return;

    var s = currentScore();
    if (s === null) return;

    // game.js가 캐시에서 빈 목록을 받은 경우를 되살린다.
    if (list.children.length === 0){
      fetchTop(HALL_BASE).then(function(rows){
        if (over.hidden || !rows || !rows.length) return;
        if (list.children.length !== 0) return;
        render(rows);
        if (status) status.hidden = true;
      });
    }

    var p = (pending && pendingScore === s) ? pending : askRank(s);
    p.then(function(rank){
      if (over.hidden || rank === null) return;
      var hs = hallSize();

      if (rank <= hs){
        // 이름을 남길 수 있는 등수다.
        if (box.hidden){
          // 이벤트로 열린 구간(11등 이하)은 game.js가 열어주지 않으므로 여기서 연다.
          label.textContent = '🎉 ' + rank + '위! 이름을 남겨보세요.';
          input.hidden = false;
          submit.hidden = false;
          input.value = '';
          input.disabled = false;
          submit.disabled = false;
          submit.textContent = '등록';
          box.hidden = false;
        }
        return;   // 이름으로 scores 에 들어갈 판이라 노네임 기록은 남기지 않는다
      }

      // 등록 가능 등수 밖이다. game.js가 잘못 열어둔 입력창도 여기서 닫는다.
      // 두 줄로 보이게 한다: "37등이에요!" / "10위 안에 들면 이름을 남길 수 있어요."
      var NL = String.fromCharCode(10);
      label.style.whiteSpace = 'pre-line';
      label.textContent = (rank <= RANK_MAX)
        ? (rank + '등이에요!' + NL + hs + '위 안에 들면 이름을 남길 수 있어요.')
        : (RANK_MAX + '위 밖이에요!' + NL + hs + '위 안에 들면 이름을 남길 수 있어요.');
      input.hidden = true;
      submit.hidden = true;
      box.hidden = false;
      if (!recordedThisRound){
        recordedThisRound = true;
        recordPlay(s);
      }
    });
  }).observe(over, { attributes: true, attributeFilter: ['hidden'] });

  // 이름을 등록하면 game.js가 목록을 다시 그리므로 펼친 상태를 버린다.
  submit.addEventListener('click', function(){
    expanded = false; savedHtml = null; cached = null;
    paint();
  });

  // 등수/이름 입력 안내를 점수 바로 아래(순위표 위)로 옮긴다.
  // 원래는 순위표 아래에 있어서 폰에서는 스크롤을 내려야 보였다.
  if (box.parentNode && board.parentNode === box.parentNode){
    box.parentNode.insertBefore(box, board);
  }

  paint();
})();

/* ---- 시작화면 공지 팝업 -----------------------------------------------------------
   페이지를 열어 시작화면이 나타날 때 한 번만 공지를 띄운다. "다시하기"는 game.js가
   startGame()을 직접 부르고 시작화면을 다시 띄우지 않으므로, 죽고 재시작할 때는
   자연히 뜨지 않는다 (별도 처리 없음). 한 페이지 로드에 한 번만 뜨도록 잠금도 걸어둔다.

   공지 내용은 Firestore의 visits/notice 문서에서 읽는다. 이 자리를 쓰는 이유는
   visits 컬렉션이 이미 "읽기 허용"이라 보안 규칙을 건드리지 않아도 되기 때문이다.
   game.js는 visits/total 과 visits/<날짜> 두 문서만 이름으로 읽으므로 이 문서가
   끼어들어도 방문자 집계에 영향이 없다.

   문서가 없거나 active 가 true 가 아니거나 body 가 비어 있으면 아무것도 띄우지 않는다.
   즉 기본 상태는 "공지 없음"이고, 운영자가 콘솔에서 문서를 만들면 그때부터 뜬다.

   문서 형태 (Firebase 콘솔 > Firestore > 데이터 > visits > 문서 ID: notice)
     active  부울    true            <- false 로 바꾸면 공지가 사라진다
     title   문자열  "공지"           <- 생략 가능
     body    문자열  "여러 줄 가능"    <- 줄바꿈이 그대로 반영된다
     button  문자열  "확인"           <- 생략 가능

   "오늘 하루 보지 않기"는 기기의 localStorage에만 기록한다. 공지 내용(title+body)의
   지문을 함께 저장해서, 운영자가 공지를 바꾸면 보지 않기가 저절로 풀리고 새 공지가
   다시 뜬다. localStorage를 못 쓰는 환경(시크릿 모드 등)에서는 버튼이 팝업만 닫는다.
   ----------------------------------------------------------------------------------- */

(function(){
  "use strict";

  var KEY    = 'AIzaSyAKW4uUsBQxaGOujIi4gS95TsvQnamkX_g';
  var DOC    = 'https://firestore.googleapis.com/v1/projects/cream-runner/databases/' +
               '(default)/documents/visits/notice?key=' + KEY;
  var MAXLEN = 600;   // 너무 긴 공지로 화면이 망가지지 않게 자른다

  var startScreen = document.getElementById('startScreen');
  var stage = document.getElementById('stage');
  if (!startScreen || !stage) return;
  if (!window.MutationObserver) return;

  var shown = false;
  var notice = null;      // 읽기 완료 후 {title, body, button} 또는 false

  function str(f){ return (f && typeof f.stringValue === 'string') ? f.stringValue : ''; }

  var LSKEY = 'creamRunnerNoticeHide';

  function dayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
           '-' + ('0' + d.getDate()).slice(-2);
  }
  // 공지 내용이 바뀌면 보지 않기가 풀리도록, 내용에서 짧은 지문을 만든다 (djb2).
  function stamp(n){
    var src = n.title + String.fromCharCode(0) + n.body, h = 5381, i;
    for (i = 0; i < src.length; i++){ h = ((h * 33) ^ src.charCodeAt(i)) >>> 0; }
    return h.toString(36) + '|' + dayKey();
  }
  function hiddenToday(n){
    try { return window.localStorage.getItem(LSKEY) === stamp(n); }
    catch (e) { return false; }
  }
  function hideForToday(n){
    try { window.localStorage.setItem(LSKEY, stamp(n)); } catch (e) {}
  }

  // 페이지 로드 직후 미리 읽어둔다. 실패하거나 문서가 없으면 조용히 포기한다.
  var loading = fetch(DOC).then(function(r){
    if (!r.ok) return false;              // 404 = 공지 없음
    return r.json();
  }).then(function(j){
    if (!j || !j.fields) return false;
    var f = j.fields;
    if (!f.active || f.active.booleanValue !== true) return false;
    var body = str(f.body).slice(0, MAXLEN);
    if (!body) return false;
    return {
      title:  str(f.title).slice(0, 40),
      body:   body,
      button: str(f.button).slice(0, 12)
    };
  }).catch(function(){ return false; });

  function build(n){
    // 게임의 기존 .overlay / .card / .primary 스타일을 그대로 쓴다 (CSS 추가 없음).
    var wrap = document.createElement('div');
    wrap.className = 'overlay';
    wrap.style.zIndex = '30';

    var card = document.createElement('div');
    card.className = 'card';

    if (n.title){
      var h = document.createElement('div');
      h.textContent = n.title;
      h.style.cssText = "font-family:'Baloo 2',sans-serif;font-size:19px;font-weight:800;" +
        'color:#233047;margin:0 0 10px;';
      card.appendChild(h);
    }

    var p = document.createElement('div');
    p.textContent = n.body;
    p.style.cssText = 'font-size:13.5px;line-height:1.65;color:#233047;text-align:left;' +
      'white-space:pre-line;margin:0 0 16px;max-height:46vh;overflow-y:auto;';
    card.appendChild(p);

    function close(){
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'primary';
    ok.textContent = n.button || '확인';
    ok.addEventListener('click', close);
    card.appendChild(ok);

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.textContent = '오늘 하루 보지 않기';
    skip.style.cssText = 'display:block;margin:12px auto 0;padding:4px 8px;border:none;' +
      "background:none;font-family:'Nunito',-apple-system,'Malgun Gothic',sans-serif;" +
      'font-size:12px;font-weight:700;color:#5a6a86;text-decoration:underline;' +
      'cursor:pointer;-webkit-tap-highlight-color:transparent;';
    skip.addEventListener('click', function(){
      hideForToday(n);
      close();
    });
    card.appendChild(skip);

    wrap.appendChild(card);
    return wrap;
  }

  function maybeShow(){
    if (shown || startScreen.hidden) return;
    loading.then(function(n){
      if (shown || startScreen.hidden || !n) return;
      if (hiddenToday(n)) return;
      shown = true;
      stage.appendChild(build(n));
    });
  }

  // 시작화면이 나타나는 순간에 띄운다 (게임 로딩이 끝난 뒤다).
  new MutationObserver(maybeShow).observe(startScreen, { attributes: true, attributeFilter: ['hidden'] });
  maybeShow();   // 혹시 이미 보이는 상태였다면
})();
