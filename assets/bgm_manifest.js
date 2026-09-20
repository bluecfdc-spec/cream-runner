// BGM 재생 목록 - 새 음원을 추가/삭제/교체하려면 이 파일만 수정하면 됩니다 (game.js는
// 건드릴 필요 없음). 파일들은 assets/bgm/ 폴더 안에 넣어주세요.
//
//   file  = assets/bgm/ 안의 실제 파일명 (대소문자까지 똑같아야 합니다)
//   title = 게임 화면 우측 상단 BGM 표시창에 그대로 나오는 이름 (한글/띄어쓰기/길이 자유,
//           길면 잘리지 않고 오른쪽에서 왼쪽으로 흐르면서 전부 보여줍니다)
//
// file과 title은 완전히 별개라서, 파일명은 영문으로 두고 화면에는 원하는 제목을 띄울 수 있습니다.
window.BGM_FOLDER = 'assets/bgm/';

// 게임을 시작하면 항상 고정으로 먼저 재생되는 곡
window.BGM_OPEN = { file: 'open_fix.mp3', title: '오프닝곡' };

// 아래 중간 곡들이 무작위 순서로 한 번씩 모두 재생된 뒤, 무한 반복되는 마지막 곡
window.BGM_END = { file: 'end_fix.mp3', title: '마지막곡' };

// 매 게임마다 무작위 순서로 한 번씩 재생되는 중간 곡들 - 이 배열에 한 줄 추가하면 바로
// 랜덤 구간에 끼어 들어가고, 한 줄 지우면 빠집니다. 곡 수 제한은 따로 없습니다.
window.BGM_MIDDLE = [
  { file: 'evangelion_op.mp3',     title: '에반게리온 OP' },
  { file: 'onepunchman_theme.mp3', title: '원펀맨 OP' },
  { file: 'frieren_op1.mp3',       title: '장송의 프리렌 OP1' },
  { file: 'frieren_op2.mp3',       title: '장송의 프리렌 OP2' },
  { file: 'aot_op1.mp3',           title: '진격의 거인 OP1' },
  { file: 'aot_op2.mp3',           title: '진격의 거인 OP2' },
  { file: 'kimetsu_op1.mp3',       title: '귀멸의 칼날 OP1' },
  { file: 'kimetsu_op2.mp3',       title: '귀멸의 칼날 OP2' },
  { file: 'muhansung_ost.mp3',     title: '무한성 OST' }
];
