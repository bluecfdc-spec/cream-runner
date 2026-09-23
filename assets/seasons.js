// ============================================================================
//  명예의 전당 - 시즌 1위 칸
// ============================================================================
//  시작 화면의 명예의 전당(#top3Board) 아래에 "👑 시즌 1위" 칸을 붙인다.
//  목록은 assets/seasons_data.js 의 window.SEASON_WINNERS 를 읽는다.
//
//  - 일반 랜딩(index.html)에서는 walk 쪽만, 무한질주(endless.html)에서는 endless
//    쪽만 보여준다. 어느 쪽인지는 window.ENDLESS_MODE 로 판단한다 (무한질주에서만
//    endless_tune.js 가 true 로 켜둔다).
//  - 처음에는 가장 최근 시즌 한 줄만 보이고, 그 아래 "지난 시즌 더보기"를 누르면
//    나머지가 스크롤되는 칸으로 펼쳐진다. 시즌이 하나뿐이면 버튼이 아예 안 생긴다.
//  - 스타일은 이 파일이 직접 심는다. style.css 와 index.html 의 <style> 을 건드리지
//    않기 위해서다 (두 페이지가 같은 파일을 공유하므로 여기 한 곳에 두는 게 맞다).
//  - 이름과 점수는 textContent 로만 넣는다. 목록에 무슨 문자가 들어와도 태그로
//    해석되지 않는다.
//  - SEASON_WINNERS 가 비어 있으면 칸을 아예 만들지 않는다. 그래서 기록이 없을 때
//    빈 상자가 덩그러니 남지 않는다.
// ============================================================================
(function(){
  "use strict";

  var list = window.SEASON_WINNERS;
  if (!list || !list.length) return;

  var board = document.getElementById('top3Board');
  if (!board) return;
  if (document.getElementById('seasonPart')) return;   // 두 번 붙는 것 방지

  var night = !!window.ENDLESS_MODE;
  var mode  = night ? 'endless' : 'walk';

  // ---- 스타일 ----------------------------------------------------------------
  var css = document.createElement('style');
  css.id = 'seasonCss';
  css.textContent =
    '#seasonPart{margin-top:10px;padding-top:9px;border-top:2px dashed ' +
      (night ? 'rgba(90,110,170,.45)' : 'rgba(0,0,0,.12)') + ';}' +
    '#seasonPart .season-title{font-family:"Baloo 2",sans-serif;font-size:11.5px;' +
      'font-weight:800;letter-spacing:.02em;margin:0 0 5px;color:' +
      (night ? '#8fa2d8' : '#8a6a2a') + ';}' +
    '#seasonPart .season-row{display:flex;align-items:baseline;gap:6px;' +
      'padding:3px 0;font-family:"Nunito",sans-serif;font-size:11.5px;font-weight:700;}' +
    '#seasonPart .season-when{flex:0 0 auto;font-size:10px;font-weight:700;opacity:.62;' +
      'white-space:nowrap;}' +
    '#seasonPart .season-who{flex:1 1 auto;text-align:right;min-width:0;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:' +
      (night ? '#ffe9b0' : '#1d63c8') + ';font-weight:800;}' +
    '#seasonPart .season-none{opacity:.5;font-weight:700;color:inherit;}' +
    '#seasonPart .season-rest{display:none;margin-top:2px;max-height:108px;' +
      'overflow-y:auto;-webkit-overflow-scrolling:touch;}' +
    '#seasonPart.open .season-rest{display:block;}' +
    '#seasonPart .season-more{display:block;width:100%;margin-top:6px;padding:5px 0;' +
      'border:0;border-radius:9px;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
      'font-family:"Nunito",sans-serif;font-size:10.5px;font-weight:800;' +
      'letter-spacing:.02em;background:' +
      (night ? 'rgba(90,110,170,.20)' : 'rgba(0,0,0,.055)') + ';color:' +
      (night ? '#9fb1d4' : '#6b7280') + ';}';
  document.head.appendChild(css);

  // ---- 한 시즌 한 줄 ---------------------------------------------------------
  function rowOf(s){
    var w = s ? s[mode] : null;
    var row = document.createElement('div');
    row.className = 'season-row';

    var when = document.createElement('span');
    when.className = 'season-when';
    when.textContent = (s.season || '') + (s.period ? ' · ' + s.period : '');
    row.appendChild(when);

    var who = document.createElement('span');
    who.className = 'season-who';
    if (w && w.name){
      var sc = (typeof w.score === 'number') ? w.score.toLocaleString() : String(w.score || '');
      who.textContent = (w.clear ? '👑 ' : '') + w.name + (sc ? '  ' + sc : '');
    } else {
      who.className = 'season-who season-none';
      who.textContent = '기록 없음';
    }
    row.appendChild(who);
    return row;
  }

  // ---- 칸 만들기 -------------------------------------------------------------
  var part = document.createElement('div');
  part.id = 'seasonPart';

  var title = document.createElement('div');
  title.className = 'season-title';
  title.textContent = '👑 시즌 1위';
  part.appendChild(title);

  part.appendChild(rowOf(list[0]));     // 가장 최근 시즌

  if (list.length > 1){
    var rest = document.createElement('div');
    rest.className = 'season-rest';
    for (var i = 1; i < list.length; i++) rest.appendChild(rowOf(list[i]));
    part.appendChild(rest);

    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'season-more';
    more.textContent = '지난 시즌 더보기 (' + (list.length - 1) + ')';
    more.addEventListener('click', function(){
      var open = part.classList.toggle('open');
      more.textContent = open ? '접기' : '지난 시즌 더보기 (' + (list.length - 1) + ')';
    });
    part.appendChild(more);
  }

  board.appendChild(part);
})();
