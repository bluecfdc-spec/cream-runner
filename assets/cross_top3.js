// ============================================================================
//  명예의 전당 - 다른 모드 TOP 3
// ============================================================================
//  시작화면의 명예의 전당은 두 칸으로 나뉘어 있다.
//    - 내가 지금 보고 있는 모드의 TOP 3 -> game.js가 채운다 (#top3List)
//    - 다른 모드의 TOP 3               -> 이 파일이 채운다 (#crossTop3List)
//
//  어느 모드를 가져올지는 페이지가 window.CROSS_COLLECTION 으로 알려준다.
//    index.html   -> 'endless'  (무한질주 순위를 보여준다)
//    endless.html -> 'scores'   (크림이 산책 순위를 보여준다)
//
//  game.js를 전혀 건드리지 않는다. 자기 칸에만 그리므로 본 게임 순위표에 영향이 없다.
//  Firestore REST로 직접 읽기 때문에 SDK 캐시에 속지 않고, 실패하면 조용히 포기한다
//  (그 칸에 "아직 기록이 없어요"가 남을 뿐, 게임은 아무 영향 없음).
//
//  서버 부담: 시작화면 1회당 읽기 3회. 게임오버 화면은 건드리지 않는다.
// ============================================================================
(function(){
  "use strict";

  var COLL   = window.CROSS_COLLECTION;
  var list   = document.getElementById('crossTop3List');
  var status = document.getElementById('crossTop3Status');
  if (!COLL || !list) return;

  var KEY   = 'AIzaSyAKW4uUsBQxaGOujIi4gS95TsvQnamkX_g';
  var RUNQ  = 'https://firestore.googleapis.com/v1/projects/cream-runner/databases/' +
              '(default)/documents:runQuery?key=' + KEY;
  var CLEAR = '클리어';

  function numOf(f){
    if (!f) return 0;
    if (f.integerValue != null) return parseInt(f.integerValue, 10);
    if (f.doubleValue != null) return Number(f.doubleValue);
    return 0;
  }

  function render(rows){
    list.innerHTML = '';
    rows.forEach(function(e, i){
      var li = document.createElement('li');

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

  fetch(RUNQ, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: COLL }],
      orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
      limit: 3
    } })
  }).then(function(r){
    if (!r.ok) throw new Error('q ' + r.status);
    return r.json();
  }).then(function(j){
    var rows = [], i, f;
    for (i = 0; i < (j || []).length; i++){
      if (!j[i] || !j[i].document) continue;
      f = j[i].document.fields || {};
      rows.push({
        name:  f.name ? f.name.stringValue : '',
        score: numOf(f.score),
        date:  f.date ? f.date.stringValue : ''
      });
    }
    if (!rows.length) return;            // 기록이 없으면 안내문을 그대로 둔다
    render(rows);
    if (status) status.hidden = true;
  }).catch(function(){
    // 조용히 포기. 안내문이 그대로 남는다.
  });
})();
