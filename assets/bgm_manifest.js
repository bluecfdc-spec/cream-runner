// BGM 재생 목록 - 새 음원을 추가/삭제/교체하려면 이 파일만 수정하면 됩니다 (game.js는
// 건드릴 필요 없음). 파일들은 assets/bgm/ 폴더 안에 넣어주세요.
window.BGM_FOLDER = 'assets/bgm/';

// 게임을 시작하면 항상 고정으로 먼저 재생되는 곡
window.BGM_OPEN = { file: 'open_fix.m4a', title: 'open_fix' };

// 아래 중간 곡들이 무작위 순서로 한 번씩 모두 재생된 뒤, 무한 반복되는 마지막 곡
window.BGM_END = { file: 'end_fix.m4a', title: 'end_fix' };

// 매 게임마다 무작위 순서로 한 번씩 재생되는 중간 곡들 - 이 배열의 항목을 추가/삭제/수정하면
// 바로 반영됩니다 (title은 BGM 표시창에 그대로 나오는 이름).
window.BGM_MIDDLE = [
  { file: 'evangelion_op.m4a', title: 'evangelion_op' },
  { file: 'onepunchman_theme.m4a', title: 'onepunchman_theme' },
  { file: 'frieren_op1.m4a', title: 'frieren_op1' },
  { file: 'frieren_op2.m4a', title: 'frieren_op2' },
  { file: 'aot_op1.m4a', title: 'aot_op1' },
  { file: 'aot_op2.m4a', title: 'aot_op2' },
  { file: 'kimetsu_op1.m4a', title: 'kimetsu_op1' },
  { file: 'kimetsu_op2.m4a', title: 'kimetsu_op2' },
  { file: 'muhansung_ost.m4a', title: 'muhansung_ost' }
];
