// ============================================================================
//  현재 시즌 게시판
// ============================================================================
//  ★ 시즌을 넘길 때는 아래 SEASON_SUFFIX 한 줄만 고친다 ★
//
//  게임은 원래 'scores' / 'endless' / 'plays' / 'endless_plays' 라는 이름의
//  게시판에 점수를 쌓는다. 시즌이 끝나면 그 이름 뒤에 접미사를 붙여서 새 게시판으로
//  갈아탄다. 예: '_s2' 를 넣으면 'scores' -> 'scores_s2' 가 된다.
//
//  [왜 지우지 않고 새로 파는가]
//  Firestore 규칙이 삭제를 완전히 막고 있다 (allow delete: if false). 그 줄이
//  2026-09-23 밤의 점수 조작을 막은 장치라서 절대 풀 수 없다. 그래서 초기화를
//  "지우기"가 아니라 "새 서랍 열기"로 한다.
//    - 화면상으로는 순위표가 빈 상태 = 초기화와 결과가 같다
//    - 지난 시즌 기록은 그 컬렉션에 그대로 남는다 (검증/부활 가능)
//    - 삭제 권한이 필요 없으므로 자동화할 수 있다
//    - 게임은 현재 시즌 게시판만 읽는다. 지난 시즌은 아무도 안 읽으므로
//      Firestore 읽기 횟수가 늘지 않는다
//
//  [어떻게 갈아타는가]
//  game.js 는 게시판 이름을 자기 안쪽에 들고 있어서 밖에서 바꿀 수 없다. 대신
//  firebase.firestore().collection(이름) 호출을 이 파일이 가로채서 이름만 바꿔
//  넘긴다. game.js 는 한 글자도 수정하지 않는다.
//
//  ★ 로드 순서 ★
//  firebase 다음, 그리고 각 페이지의 sig(점수 검증값) 스크립트보다 먼저 와야 한다.
//  그래야 sig 쪽이 원래 이름('scores')을 보고 검증값을 붙이고, 그 다음에 이 파일이
//  실제 이름('scores_s2')으로 바꿔서 보낸다. 순서가 뒤집히면 sig 가 붙지 않아서
//  20,000점 넘는 기록의 등록이 전부 실패한다.
//
//  ※ 방문자 수(visits)는 바꾸지 않는다. 시즌과 무관하게 계속 누적된다.
//  ※ 테스트 주소의 endless_test 도 바꾸지 않는다 (규칙이 막아서 저장 안 되는 게 정상).
// ============================================================================
window.SEASON_SUFFIX = '_s2';   // 시즌 2. 시즌 3으로 넘길 때 '_s3' 으로 바꾼다.

(function(){
  "use strict";

  var SUFFIX = window.SEASON_SUFFIX || '';
  //  접미사를 붙일 게시판 이름. 이 넷만 바꾸고 나머지는 건드리지 않는다.
  var BASES = { scores: 1, endless: 1, plays: 1, endless_plays: 1 };

  function mapName(p){
    if (!SUFFIX) return p;
    return (typeof p === 'string' && BASES[p]) ? (p + SUFFIX) : p;
  }
  window.SEASON_MAP = mapName;   // 개발자 도구에서 확인해볼 수 있게 남겨둔다

  try {
    if (!SUFFIX) return;   // 시즌 1(접미사 없음)이면 아무것도 감싸지 않는다
    if (!window.firebase || typeof window.firebase.firestore !== 'function') return;

    var of = window.firebase.firestore;

    function patch(inst){
      if (!inst || inst.__seasonPatched) return;
      var oc = inst.collection;
      if (typeof oc !== 'function') return;
      inst.__seasonPatched = true;
      inst.collection = function(path){
        return oc.call(inst, mapName(path));
      };
    }

    function wrapped(){
      var inst;
      try { inst = of.apply(window.firebase, arguments); }
      catch (e1) { window.firebase.firestore = of; return of.apply(undefined, arguments); }
      try { patch(inst); } catch (e) {}
      return inst;
    }

    //  firebase.firestore 에 붙어 있는 부속물(FieldValue 등)을 그대로 물려준다.
    try {
      var ns = Object.getOwnPropertyNames(of);
      for (var i = 0; i < ns.length; i++){
        var n = ns[i];
        if (n === 'length' || n === 'name' || n === 'prototype' ||
            n === 'caller' || n === 'arguments') continue;
        try { wrapped[n] = of[n]; } catch (e) {}
      }
    } catch (e) {}

    window.firebase.firestore = wrapped;
    window.SEASON_READY = true;
  } catch (e) {}
})();
