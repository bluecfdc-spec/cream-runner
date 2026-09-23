// ============================================================================
//  일반 / 하드 모드 슬라이딩 스위치
// ============================================================================
//  시작 화면의 "모드 전환" 링크를, 곡선 테두리 박스 안에서 손잡이가 좌우로 움직이는
//  스위치로 바꾼다. 예전에는 시작 버튼과 똑같은 모양이라 둘을 헷갈렸다.
//
//  - 지금 페이지의 모드에 손잡이가 붙어 있다. 일반 랜딩이면 왼쪽, 하드면 오른쪽.
//  - 누르면 손잡이가 반대쪽으로 미끄러진 뒤 그 모드 페이지로 넘어간다. 눌렀을 때
//    바로 화면이 바뀌면 스위치가 움직인 걸 못 보므로 180ms 만 기다린다.
//  - 원래 <a> 를 그대로 재활용하므로 링크 주소(href)와 접근성이 유지된다.
//  - 스타일은 이 파일이 직접 심는다. 두 페이지가 같은 파일을 쓰므로 여기 한 곳에
//    두는 게 맞다 (index.html / endless.html 의 <style> 은 건드리지 않는다).
//  - 이 파일은 각 페이지의 부트 로더가 game.js 실행 뒤에 불러온다.
// ============================================================================
(function(){
  "use strict";

  var a = document.querySelector('a.mode-switch');
  if (!a) return;
  if (a.dataset.msReady) return;   // 두 번 붙는 것 방지
  a.dataset.msReady = '1';

  var night = !!window.ENDLESS_MODE;   // 지금 페이지가 하드 모드인가
  var href  = a.getAttribute('href');

  // ---- 스타일 --------------------------------------------------------------
  //  .mode-switch 는 각 페이지 <style> 에서 버튼처럼 칠해져 있다. 스위치는 눌리는
  //  버튼이 아니라 "지금 어느 쪽인지 보여주는 틀"이라, 배경을 눌러 앉히고 테두리만
  //  남긴다. 아래 선택자는 클래스 두 개라 페이지 쪽 규칙을 이긴다.
  var css = document.createElement('style');
  css.id = 'modeSwitchCss';
  css.textContent =
    'a.mode-switch.ms{padding:6px;background:' +
      (night ? 'rgba(6,11,30,.55)' : 'rgba(31,43,61,.10)') + ';border-color:' +
      (night ? '#33447e' : '#d8c79b') + ';box-shadow:inset 0 2px 5px rgba(0,0,0,' +
      (night ? '.45' : '.13') + ');}' +
    'a.mode-switch.ms .ms-track{position:relative;display:flex;width:100%;height:100%;' +
      'min-height:38px;align-items:stretch;border-radius:11px;overflow:hidden;}' +
    'a.mode-switch.ms .ms-knob{position:absolute;top:0;bottom:0;left:0;width:50%;' +
      'border-radius:11px;background:' +
      (night ? 'linear-gradient(180deg,#4f6bb8,#32468a)' : 'linear-gradient(180deg,#ffd35c,#f0b429)') +
      ';box-shadow:0 2px 0 rgba(0,0,0,.22);transition:transform .18s cubic-bezier(.4,1.4,.5,1);}' +
    'a.mode-switch.ms.ms-right .ms-knob{transform:translateX(100%);}' +
    'a.mode-switch.ms .ms-lab{position:relative;z-index:1;flex:1 1 0;min-width:0;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:1px;font-family:"Baloo 2",sans-serif;font-size:13px;font-weight:800;' +
      'line-height:1.1;transition:color .18s ease,opacity .18s ease;}' +
    'a.mode-switch.ms .ms-lab em{font-family:"Nunito",sans-serif;font-size:8.5px;' +
      'font-weight:700;font-style:normal;letter-spacing:.02em;line-height:1.1;}' +
    'a.mode-switch.ms .ms-lab.on{color:' + (night ? '#ffffff' : '#5a3a06') + ';opacity:1;}' +
    'a.mode-switch.ms .ms-lab.off{color:' + (night ? '#9fb1d4' : '#8b7a52') + ';opacity:.72;}';
  document.head.appendChild(css);

  // ---- 뼈대 ----------------------------------------------------------------
  function label(main, sub, on){
    var s = document.createElement('span');
    s.className = 'ms-lab ' + (on ? 'on' : 'off');
    s.appendChild(document.createTextNode(main));
    var em = document.createElement('em');
    em.textContent = sub;
    s.appendChild(em);
    return s;
  }

  a.textContent = '';
  a.classList.add('ms');
  if (night) a.classList.add('ms-right');

  var track = document.createElement('span');
  track.className = 'ms-track';

  var knob = document.createElement('span');
  knob.className = 'ms-knob';
  track.appendChild(knob);
  track.appendChild(label('일반', '산책', !night));
  track.appendChild(label('하드', '무한질주', night));
  a.appendChild(track);
  a.setAttribute('aria-label', night ? '일반 모드로 바꾸기' : '하드 모드로 바꾸기');

  // ---- 누르면 손잡이가 먼저 미끄러지고, 그 다음에 넘어간다 ------------------
  var going = false;
  a.addEventListener('click', function(ev){
    ev.preventDefault();
    if (going) return;
    going = true;
    a.classList.toggle('ms-right');
    var labs = a.querySelectorAll('.ms-lab');
    for (var i = 0; i < labs.length; i++){
      labs[i].className = 'ms-lab ' + (labs[i].className.indexOf('on') >= 0 ? 'off' : 'on');
    }
    setTimeout(function(){ window.location.href = href; }, 180);
  });
})();
