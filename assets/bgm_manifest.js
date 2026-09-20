// BGM 재생 목록 - 새 음원을 추가/삭제/교체하거나 순서를 바꾸려면 이 파일만 수정하면 됩니다
// (game.js는 건드릴 필요 없음). 음원 파일들은 assets/bgm/ 폴더 안에 넣어주세요.
//
// file = assets/bgm/ 안의 실제 파일명 (대소문자까지 똑같아야 합니다)
// title = 게임 화면 우측 상단 BGM 표시창에 그대로 나오는 이름 (한글/띄어쓰기/길이 자유,
// 길면 잘리지 않고 오른쪽에서 왼쪽으로 흐르면서 전부 보여줍니다)
//
// file과 title은 완전히 별개라서, 파일명은 영문으로 두고 화면에는 원하는 제목을 띄울 수 있습니다.
//
// 재생 순서: BGM_OPEN -> BGM_PLAYLIST에 적은 순서 그대로 -> Final_Boss
// 무작위 없이 항상 똑같은 순서로 나옵니다. 마지막 곡이 끝나기 5초 전부터 엔딩 시퀀스
// (유모차 예고 -> 유모차 -> 보스)가 시작되므로, BGM_PLAYLIST의 "맨 마지막 곡"이 곧
// 보스 직전 곡입니다.
window.BGM_FOLDER = 'assets/bgm/';

// 게임을 시작하면 항상 고정으로 먼저 재생되는 곡 (현재 30초)
// (업로드된 실제 파일명이 확장자가 두 번 붙은 'open_fix.mp3.mp3' 이라 그대로 가리킨다.
//  나중에 파일명을 open_fix.mp3 로 고치면 이 줄도 같이 고쳐야 한다.)
window.BGM_OPEN = { file: 'open_fix.mp3.mp3', title: '동물의 숲 OST' };

// ---- 본편 재생 목록 (이 순서 그대로, 무작위 없음) ----
// 오프닝 30초 + 87초 + 154초 + 96초 = 총 6분 7초 지점에 보스가 등장한다.
// 곡을 빼거나 짧게 자른 파일로 바꾸면 보스가 그만큼 빨라진다.
window.BGM_PLAYLIST = [
  { file: 'frieren_op2.mp3', title: '장송의 프리렌 2기 OST - SUNNY - YOASOBI' },
  { file: 'muhansung_ost.mp3', title: '귀멸의 칼날 무한성진입 OST' },
  { file: 'aot_op1.mp3', title: '진격의 거인 1기 OST - 홍련의 화살 - Linked Horizon' }
];

// ---- 예전 방식(무작위 2단 사이클) 참고용 ----
// 위의 BGM_PLAYLIST 줄을 지우면 아래 두 배열이 쓰이면서, 1차 사이클 곡들이 무작위로 전부
// 재생된 뒤 2차 사이클 곡들이 무작위로 재생되는 예전 동작으로 돌아간다. 지금은 고정 순서를
// 쓰기 때문에 아래는 주석 처리해 뒀다 (되살리려면 주석만 풀면 된다).
// window.BGM_CYCLE_1 = [
//   { file: 'kimetsu_op1.mp3', title: '귀멸의 칼날 1기 OST - 홍련화 - LiSA' },
//   { file: 'kimetsu_op2.mp3', title: '귀멸의 칼날 2기 OST - 잔향산가 - LiSA' },
//   { file: 'frieren_op1.mp3', title: '장송의 프리렌 1기 OST - 용사 - YOASOBI' },
//   { file: 'frieren_op2.mp3', title: '장송의 프리렌 2기 OST - SUNNY - YOASOBI' }
// ];
// window.BGM_CYCLE_2 = [
//   { file: 'aot_op1.mp3', title: '진격의 거인 1기 OST - 홍련의 화살 - Linked Horizon' },
//   { file: 'aot_op2.mp3', title: '진격의 거인 2기 OST - 신조사사귀오 - Linked Horizon' },
//   { file: 'evangelion_op.mp3', title: '신세기 에반게리온 OP - 잔혹한 천사의 테제 - 타카하시 요코' },
//   { file: 'muhansung_ost.mp3', title: '귀멸의 칼날 무한성진입 OST' },
//   { file: 'onepunchman_theme.mp3', title: '원펀맨 메인 Theme - 정의집행 - Makoto Miyazaki' }
// ];

// ---- 최종 보스 음원 ----
// 마지막 곡이 완전히 끝나는 순간, 겹치지 않고 바로 시작해서 딱 한 번만 재생된다
// (반복 없음). 이 곡이 끝나면 BGM은 완전히 끝난다.
window.BGM_FINAL_BOSS = { file: 'Final_Boss.mp3', title: 'FINAL BOSS' };

// 예비용: BGM_FINAL_BOSS 파일이 없을 때만 대신 재생된다.
window.BGM_END = { file: 'end_fix.mp3', title: '무한루프' };
