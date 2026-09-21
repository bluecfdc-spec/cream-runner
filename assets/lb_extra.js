/* ---- 순위표 추가 기능 (game.js 뒤에 로드되어야 한다) --------------------------------
   원래는 game.js에 들어가야 할 기능들이다. game.js가 114KB라 도구로 통째로 올릴 수
   없어서 이 파일로 분리했다. 나중에 PC에서 game.js를 교체할 때 이 파일을 지우고
   game.js 쪽으로 옮기면 동작은 같다. index.html에서 이 파일 참조 한 줄을 지우면
   예전 동작(TOP 10만 보기 / TOP 10만 등록)으로 그대로 돌아간다.

   1) 전체 순위 보기 버튼      - TOP 10 아래 버튼으로 100위까지 펼친다
   2) 등수 통지 + 노네임 기록  - 10위 밖이면 이름 없이 점수만 남기고 등수를 알려준다
   3) 오판정 보정              - 아래 "왜 보정이 필요한가" 참고

   ---- 왜 보정이 필요한가 -----------------------------------------------------------
   game.js는 Firebase SDK의 get() 으로 순위표를 읽는다. SDK는 서버 연결이 순간적으로
   끊기면 에러를 내지 않고 기기 캐시로 대체하는데, 캐시가 비어 있으면 "기록 0건"을
   정상 응답처럼 돌려준다. 그러면 game.js는 "기록이 10건 미만이면 누구나 TOP 10"이라는
   판정 때문에 6,000점짜리 판에도 이름 입력창을 띄우고, 목록에는 "아직 기록이 없어요"가
   뜬다 (2026-09-21 카톡 인앱 브라우저에서 실제로 발생).

   이 파일은 등수를 REST로 직접 물어본다. REST는 실패하면 확실히 실패해서 캐시에
   속지 않는다. 그래서 그 숫자를 최종 근거로 삼아,
     - 목록이 비어 있으면 REST로 다시 읽어 채우고
     - 실제 등수가 10위 밖이면 game.js가 열어둔 입력창을 닫고 등수 안내로 바꾼다.
   REST 조회까지 실패하면 (정말로 오프라인) 아무것도 건드리지 않는다.
   ----------------------------------------------------------------------------------- */

(function(){
  "use strict";

  var LIMIT = 100;        // "전체 순위 보기"로 펼칠 줄 수
  var HALL  = 10;         // 이름을 남길 수 있는 등수 (명예의 전당)
  var CLEAR = '클리어';

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

  var title = board.querySelector('.leaderboard-title');
  var titleBase = title ? title.textContent : '';

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
      var n = null, i;
      for (i = 0; i < j.length; i++){
        if (j[i] && j[i].result && j[i].result.aggregateFields && j[i].result.aggregateFields.n){
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

  // 10위 밖 판을 이름 없이 남긴다. 다음 사람들의 등수 계산에 쓰인다.
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

  // ---- 1) 전체 순위 보기 버튼 ------------------------------------------------------

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = 'display:block;width:100%;margin:6px 0 2px;padding:7px 10px;' +
    "font-family:'Baloo 2',sans-serif;font-size:12.5px;font-weight:700;color:#3d6fa8;" +
    'background:#f6f9fd;border:2px solid #f0dfb8;border-radius:10px;cursor:pointer;' +
    '-webkit-tap-highlight-color:transparent;';
  board.appendChild(btn);

  var expanded = false, savedHtml = null, cached = null;

  function paint(){
    if (title) title.textContent = expanded ? titleBase.replace('TOP 10', 'TOP ' + LIMIT) : titleBase;
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
      fetchTop(HALL).then(function(rows){
        if (over.hidden || !rows || !rows.length) return;
        if (list.children.length !== 0) return;
        render(rows);
        if (status) status.hidden = true;
      });
    }

    var p = (pending && pendingScore === s) ? pending : askRank(s);
    p.then(function(rank){
      if (over.hidden || rank === null) return;
      if (rank <= HALL) return;   // 진짜 명예의 전당이면 game.js 판정을 그대로 둔다

      // 10위 밖이다. game.js가 잘못 열어둔 입력창도 여기서 닫는다.
      label.textContent = '아쉽지만 ' + rank + '등이에요! 10위 안에 들면 이름을 남길 수 있어요.';
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

  paint();
})();
