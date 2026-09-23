/* ============================================================================
   점수 위조 방지 - 검증값(sig)
   ----------------------------------------------------------------------------
   [왜 필요한가]
   순위표는 로그인이 없어서 API 키가 공개돼 있다. 그래서 Firestore 규칙만으로는
   "진짜 게임이 보낸 등록"과 "외부에서 API를 직접 찔러 넣은 등록"을 구별할 수
   없다. 둘 다 로그인이 없고 보내는 데이터도 똑같기 때문이다.
   (2026.09.23 실제로 42만점짜리 위조 기록이 들어왔다.)

   그래서 게임이 점수와 함께 "점수에서 계산되는 검증값"을 같이 보내고,
   Firestore 규칙이 그 값을 대조한다. 공식을 모르면 높은 점수를 넣을 수 없다.

   [game.js 는 건드리지 않는다]
   game.js 가 쓰는 공개 API 의 마지막 단계만 감싼다.
       firebase.firestore()  ->  .collection('scores')  ->  .add({...})
   이 파일은 game.js 보다 먼저 로드되어야 한다 (index.html 참고).

   [안전장치]
   - 어떤 이유로든 설치에 실패하면 조용히 원래 동작으로 돌아간다. sig 없이
     등록되고, 게임이 멈추는 일은 없다.
   - 'scores' / 'endless' 컬렉션의 add() 만 손댄다. 방문자 카운터(visits),
     plays, 순위 조회 등 나머지 호출은 전혀 건드리지 않는다.
   - firebase.firestore 에 달린 부가 속성(FieldValue 등)을 그대로 옮긴다.
     방문자 카운터가 firebase.firestore.FieldValue.increment 를 쓰기 때문에
     이게 빠지면 방문자 수가 안 올라간다.

   [끄는 방법 - 사고 시 원복]
   이 파일을 빈 내용으로 덮어쓰면 즉시 원래대로 돌아간다.
   단, 그 전에 Firestore 규칙에서 sig 필수 조건을 먼저 빼야 한다.
   (규칙이 sig 를 요구하는 상태에서 이 파일만 끄면 등록이 전부 막힌다)

   [규칙에 들어가는 같은 공식]
     int(request.resource.data.sig) ==
       (int(request.resource.data.score) * 7919) % 100000
   공식을 바꾸려면 이 파일과 규칙을 반드시 같이 바꿔야 한다.
   ============================================================================ */
(function(){
  "use strict";

  var MULT = 7919;
  var MOD  = 100000;

  // 규칙의 산술과 똑같아야 한다. game.js 는 Math.floor 한 정수만 보내지만,
  // 혹시 소수가 들어와도 규칙의 int() 와 결과가 같도록 여기서도 내림한다.
  function sigOf(score){
    return (Math.floor(score) * MULT) % MOD;
  }

  // sig 를 붙일 컬렉션. 이름 없는 기록(plays)과 방문자 수(visits)는 제외.
  function guarded(path){
    return path === 'scores' || path === 'endless';
  }

  try {
    if (!window.firebase || typeof window.firebase.firestore !== 'function') return;

    var origFirestore = window.firebase.firestore;

    // Firestore 인스턴스의 collection() 만 감싼다. settings() 등 다른 메서드는
    // 손대지 않으므로 game.js 의 db.settings(...) 호출에 영향이 없다.
    function patchInstance(inst){
      if (!inst || inst.__sigPatched) return;
      var origCollection = inst.collection;
      if (typeof origCollection !== 'function') return;
      inst.__sigPatched = true;

      inst.collection = function(path){
        var ref = origCollection.call(inst, path);
        try {
          if (ref && guarded(path) && typeof ref.add === 'function' && !ref.__sigPatched){
            var origAdd = ref.add;
            ref.__sigPatched = true;
            ref.add = function(data){
              try {
                if (data && typeof data.score === 'number' && data.sig === undefined){
                  var copy = {}, k;
                  for (k in data){
                    if (Object.prototype.hasOwnProperty.call(data, k)) copy[k] = data[k];
                  }
                  copy.sig = sigOf(data.score);
                  return origAdd.call(ref, copy);
                }
              } catch (e) {}
              return origAdd.call(ref, data);   // 실패하면 원래대로 보낸다
            };
          }
        } catch (e) {}
        return ref;
      };
    }

    function wrapped(){
      var inst;
      try {
        inst = origFirestore.apply(window.firebase, arguments);
      } catch (e1) {
        // this 바인딩 때문이라면 다르게 한 번 더 시도하고, 그래도 안 되면
        // 원래 함수를 제자리에 돌려놓는다 (게임은 원래와 똑같이 동작).
        window.firebase.firestore = origFirestore;
        return origFirestore.apply(undefined, arguments);
      }
      try { patchInstance(inst); } catch (e) {}
      return inst;
    }

    // FieldValue / Timestamp / FieldPath 같은 부가 속성을 그대로 옮긴다.
    try {
      var names = Object.getOwnPropertyNames(origFirestore);
      for (var i = 0; i < names.length; i++){
        var n = names[i];
        if (n === 'length' || n === 'name' || n === 'prototype' ||
            n === 'caller' || n === 'arguments') continue;
        try { wrapped[n] = origFirestore[n]; } catch (e) {}
      }
    } catch (e) {}

    window.firebase.firestore = wrapped;
    window.SCORE_SIG_READY = true;
  } catch (e) {
    // 설치 실패. 아무것도 하지 않고 원래 동작을 유지한다.
    if (window.console && console.warn) console.warn('[score_sig] 미설치, 원래 동작 유지');
  }
})();
