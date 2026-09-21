/* ---- 순위표 추가 기능 (game.js 뒤에 로드되어야 한다) --------------------------------
   원래는 game.js에 들어가야 할 두 기능이다. game.js가 114KB라 도구로 통째로 올릴 수
   없어서 이 파일로 분리했다. 나중에 PC에서 game.js를 교체할 때 이 파일을 지우고
   game.js 쪽으로 옮기면 동작은 완전히 같다. index.html에서 이 파일을 지우면 예전
   동작(TOP 10만 보기 / TOP 10만 등록 가능)으로 그대로 돌아간다.

   1) 전체 순위 보기 버튼  - TOP 10 아래 버튼으로 100위까지 펼친다
   2) 100위 등록 허용      - 10위 밖이어도 100위 안이면 이름 입력창을 열어준다
   ----------------------------------------------------------------------------------- */

(function(){
  "use strict";
  var LIMIT = 100;
  var CLEAR = '클리어';
  var list  = document.getElementById('top10List');
  var board = document.getElementById('top10Board');
  var over  = document.getElementById('gameOverScreen');
  if (!list || !board || !over) return;
  var title = board.querySelector('.leaderboard-title');
  var titleBase = title ? title.textContent : '';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = 'display:block;width:100%;margin:6px 0 2px;padding:7px 10px;' +
    "font-family:'Baloo 2',sans-serif;font-size:12.5px;font-weight:700;color:#3d6fa8;" +
    'background:#f6f9fd;border:2px solid #f0dfb8;border-radius:10px;cursor:pointer;' +
    '-webkit-tap-highlight-color:transparent;';
  board.appendChild(btn);

  var expanded = false, savedHtml = null, cached = null;

  function today(){
    var d = new Date();
    return d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) +
           '.' + ('0' + d.getDate()).slice(-2);
  }
  function myScore(){
    var el = document.getElementById('finalScore');
    var n = el ? parseInt(String(el.textContent).replace(/[^0-9]/g, ''), 10) : NaN;
    return isNaN(n) ? null : n;
  }
  function paint(){
    if (title) title.textContent = expanded ? titleBase.replace('TOP 10', 'TOP ' + LIMIT) : titleBase;
    btn.disabled = false;
    btn.textContent = expanded ? 'TOP 10만 보기' : '전체 순위 보기';
  }
  function render(rows){
    var ms = myScore(), md = today();
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
  function expand(rows){
    if (savedHtml === null) savedHtml = list.innerHTML;
    cached = rows;
    expanded = true;
    render(rows);
    paint();
  }
  function collapse(){
    expanded = false;
    if (savedHtml !== null) list.innerHTML = savedHtml;
    paint();
  }
  function reset(){
    expanded = false; savedHtml = null; cached = null;
    paint();
  }

  btn.addEventListener('click', function(){
    if (expanded){ collapse(); return; }
    if (cached){ expand(cached); return; }
    btn.disabled = true;
    btn.textContent = '불러오는 중...';
    var db;
    try { db = firebase.firestore(); } catch (err) { paint(); return; }
    db.collection('scores').orderBy('score', 'desc').limit(LIMIT).get().then(function(snap){
      var rows = [];
      snap.forEach(function(doc){ rows.push(doc.data()); });
      expand(rows);
    }).catch(function(){ paint(); });
  });

  // 점수 화면이 새로 뜨면(= 또 죽었으면) 접힌 상태로 되돌린다.
  if (window.MutationObserver){
    new MutationObserver(function(){
      if (!over.hidden) reset();
    }).observe(over, { attributes: true, attributeFilter: ['hidden'] });
  }
  // 이름을 등록하면 game.js가 목록을 다시 그리므로, 캐시와 상태를 버린다.
  var sb = document.getElementById('submitNameBtn');
  if (sb) sb.addEventListener('click', reset);

  paint();
})();

(function(){
  "use strict";
  var TOP_N = 100;
  var AGG_URL = 'https://firestore.googleapis.com/v1/projects/cream-runner/databases/' +
                '(default)/documents:runAggregationQuery?key=' +
                'AIzaSyAKW4uUsBQxaGOujIi4gS95TsvQnamkX_g';

  var over    = document.getElementById('gameOverScreen');
  var scoreEl = document.getElementById('finalScore');
  var box     = document.getElementById('newRecordBox');
  var label   = document.getElementById('newRecordLabel');
  var input   = document.getElementById('nameInput');
  var submit  = document.getElementById('submitNameBtn');
  if (!over || !scoreEl || !box || !label || !input || !submit) return;
  if (!window.MutationObserver) return;

  var testMode = false;
  try {
    var qs = new URLSearchParams(window.location.search);
    testMode = !!(qs.get('boss') || qs.get('hard'));
  } catch (e) {}
  if (testMode) return;

  var pending = null, pendingScore = null;

  function currentScore(){
    var n = parseInt(String(scoreEl.textContent).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  // 내 점수보다 높은 기록이 몇 개인지 센다. 등수 = 그 수 + 1.
  function askRank(score){
    var body = { structuredAggregationQuery: {
      structuredQuery: {
        from: [{ collectionId: 'scores' }],
        where: { fieldFilter: {
          field: { fieldPath: 'score' },
          op: 'GREATER_THAN',
          value: { integerValue: String(score) }
        } }
      },
      aggregations: [{ alias: 'n', count: {} }]
    } };
    return fetch(AGG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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
      return (n === null || isNaN(n)) ? null : n + 1;
    }).catch(function(){ return null; });
  }

  // 점수가 확정되는 순간 미리 조회를 걸어둔다 (화면은 그 뒤에 나타난다).
  new MutationObserver(function(){
    var s = currentScore();
    if (s === null || s === pendingScore) return;
    pendingScore = s;
    pending = askRank(s);
  }).observe(scoreEl, { childList: true, characterData: true, subtree: true });

  new MutationObserver(function(){
    if (over.hidden) return;
    if (!box.hidden) return;   // game.js가 이미 TOP 10으로 열어준 판
    var s = currentScore();
    if (s === null) return;
    var p = (pending && pendingScore === s) ? pending : askRank(s);
    p.then(function(rank){
      if (over.hidden || !box.hidden) return;
      if (rank === null) return;
      if (rank <= TOP_N){
        label.textContent = '🎉 ' + rank + '위! 이름을 남겨보세요.';
        input.hidden = false;
        submit.hidden = false;
        input.value = '';
        input.disabled = false;
        submit.disabled = false;
        submit.textContent = '등록';
      } else {
        label.textContent = '아쉬워요! ' + TOP_N +
          '위 안에 들면 이름을 남길 수 있어요. (지금 ' +
          rank + '위)';
        input.hidden = true;
        submit.hidden = true;
      }
      box.hidden = false;
    });
  }).observe(over, { attributes: true, attributeFilter: ['hidden'] });
})();
