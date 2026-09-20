// BGM 재생 목록 - 새 음원을 추가/삭제/교체하려면 이 파일만 수정하면 됩니다 (game.js는
// 건드릴 필요 없음). 파일들은 assets/bgm/ 폴더 안에 넣어주세요.
//
// file = assets/bgm/ 안의 실제 파일명 (대소문자까지 똑같아야 합니다)
// title = 게임 화면 우측 상단 BGM 표시창에 그대로 나오는 이름 (한글/띄어쓰기/길이 자유,
// 길면 잘리지 않고 오른쪽에서 왼쪽으로 흐르면서 전부 보여줍니다)
//
// file과 title은 완전히 별개라서, 파일명은 영문으로 두고 화면에는 원하는 제목을 띄울 수 있습니다.
//
// 재생 순서: open_fix -> 1차 사이클(무작위) -> 2차 사이클(무작위) -> Final_Boss
// 순서는 각 사이클 "안에서만" 섞입니다. 1차 사이클 곡이 전부 끝나야 2차 사이클로 넘어가고,
// 사이클끼리의 앞뒤는 절대 바뀌지 않습니다.
window.BGM_FOLDER = 'assets/bgm/';

// 게임을 시작하면 항상 고정으로 먼저 재생되는 곡
// (업로드된 실제 파일명이 확장자가 두 번 붙은 'open_fix.mp3.mp3' 이라 그대로 가리킨다.
//  나중에 파일명을 open_fix.mp3 로 고치면 이 줄도 같이 고쳐야 한다.)
window.BGM_OPEN = { file: 'open_fix.mp3.mp3', title: '동물의 숲 OST' };

// ---- 1차 사이클: open_fix 직후에 이 4곡이 무작위 순서로 한 번씩 재생된다 ----
window.BGM_CYCLE_1 = [
  { file: 'kimetsu_op1.mp3', title: '귀멸의 칼날 1기 OST - 홍련화 - LiSA' },
  { file: 'kimetsu_op2.mp3', title: '귀멸의 칼날 2기 OST - 잔향산가 - LiSA' },
  { file: 'frieren_op1.mp3', title: '장송의 프리렌 1기 OST - 용사 - YOASOBI' },
  { file: 'frieren_op2.mp3', title: '장송의 프리렌 2기 OST - SUNNY - YOASOBI' }
];

// ---- 2차 사이클: 1차 사이클이 모두 끝난 뒤 이 3곡이 무작위 순서로 한 번씩 재생된다 ----
// 이 사이클의 마지막 곡이 끝나기 5초 전부터 엔딩 시퀀스(유모차 예고 -> 유모차 -> 보스)가
// 시작되고, 곡이 완전히 끝나는 순간 아래 Final_Boss로 넘어간다.
// (에반게리온 / 원펀맨 2곡은 보스에 더 빨리 도달하도록 목록에서 제외했다. 파일 자체는
//  assets/bgm/ 에 그대로 남아 있으니, 다시 넣고 싶으면 아래에 한 줄씩 되살리면 된다.)
window.BGM_CYCLE_2 = [
  { file: 'aot_op1.mp3', title: '진격의 거인 1기 OST - 홍련의 화살 - Linked Horizon' },
  { file: 'aot_op2.mp3', title: '진격의 거인 2기 OST - 신조사사귀오 - Linked Horizon' },
  { file: 'muhansung_ost.mp3', title: '귀멸의 칼날 무한성진입 OST' }
];

// ---- 최종 보스 음원 ----
// 2차 사이클의 마지막 곡이 완전히 끝나는 순간, 겹치지 않고 바로 시작해서 딱 한 번만
// 재생된다 (반복 없음). 이 곡이 끝나면 BGM은 완전히 끝난다.
window.BGM_FINAL_BOSS = { file: 'Final_Boss.mp3', title: 'FINAL BOSS' };

// 예비용: BGM_FINAL_BOSS 파일이 없을 때만 대신 재생된다.
window.BGM_END = { file: 'end_fix.mp3', title: '무한루프' };
