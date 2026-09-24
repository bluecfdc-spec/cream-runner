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
//  ★ REST 로 직접 부르는 파일도 함께 감싼다 ★  (2026-09-24 추가)
//  순위표 추가 기능(assets/lb_extra.js, assets/lb_endless.js)은 firebase SDK 를 쓰지
//  않고 Firestore REST API 를 직접 호출한다. 그래서 위의 collection() 가로채기를 타지
//  않고 게시판 이름을 그대로 서버에 보낸다. 그 파일들 안에 이름이 글자로 박혀 있어서,
//  시즌을 넘긴 뒤에도 게임오버 TOP 10 / 등수 / 노네임 기록 저장이 전부 지난 시즌
//  게시판을 계속 썼다. 랜딩 게시판만 새 시즌을 읽어서, 한 화면은 비어 있고 다른 화면은
//  지난 시즌 기록이 뜨는 상태가 됐다 (실제 증상: 새 시즌인데 TOP 10 이 시즌1 그대로,
//  등수는 625등). 그래서 아래 두 번째 블록이 REST 주소와 요청 본문의 게시판 이름까지
//  같이 바꿔준다. 이렇게 두면 앞으로 REST 를 쓰는 파일이 생겨도 자동으로 커버되고,
//  시즌을 넘길 때 고칠 파일은 여전히 이 파일 하나뿐이다.
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

// ---------------------------------------------------------------------------
//  Firestore REST 경로도 같은 규칙으로 바꿔준다
// ---------------------------------------------------------------------------
//  바꾸는 것은 딱 두 가지다.
//    1) 주소의 컬렉션 부분   .../documents/plays?key=...  ->  .../documents/plays_s2?key=...
//    2) 요청 본문의 이름     {"collectionId":"scores"}    ->  {"collectionId":"scores_s2"}
//  firestore.googleapis.com 이 아닌 요청은 손도 대지 않는다. 그래서 game.js 를 받아오는
//  부트 로더나 무음 파일 같은 다른 fetch 에는 아무 영향이 없다.
//  바꾸는 이름은 위와 똑같이 scores / endless / plays / endless_plays 넷뿐이다.
//  (visits, endless_test 같은 이름은 그대로 지나간다)
(function(){
  "use strict";
  var SUFFIX = window.SEASON_SUFFIX || '';
  if (!SUFFIX) return;                          // 시즌 1이면 아무것도 감싸지 않는다
  if (!window.fetch || window.SEASON_REST_READY) return;
  window.SEASON_REST_READY = true;

  var NAMES = 'scores|endless_plays|endless|plays';   // 긴 이름을 먼저 두어야 한다
  var urlRe  = new RegExp('(/documents/)(' + NAMES + ')(\\?|/|$)');
  var bodyRe = new RegExp('("collectionId"\\s*:\\s*")(' + NAMES + ')(")', 'g');
  var map = window.SEASON_MAP || function(n){ return n; };

  var of = window.fetch;
  window.fetch = function(input, init){
    try {
      var url = (typeof input === 'string') ? input
              : (input && typeof input.url === 'string') ? input.url : '';
      if (url && url.indexOf('firestore.googleapis.com') >= 0){
        var newUrl = url.replace(urlRe, function(m, a, name, tail){
          return a + map(name) + tail;
        });
        var body = init && init.body;
        var newInit = init;
        if (typeof body === 'string' && body.indexOf('collectionId') >= 0){
          var nb = body.replace(bodyRe, function(m, a, name, c){
            return a + map(name) + c;
          });
          if (nb !== body){
            newInit = {};
            for (var k in init){ if (Object.prototype.hasOwnProperty.call(init, k)) newInit[k] = init[k]; }
            newInit.body = nb;
          }
        }
        if (newUrl !== url){
          if (typeof input === 'string') input = newUrl;
          else { try { input = new Request(newUrl, input); } catch (e) { input = newUrl; } }
        }
        return of.call(this, input, newInit);
      }
    } catch (e) {}
    return of.call(this, input, init);
  };
})();
