// ============================================================================
//  소리 없는 오디오 (미디어 재생 등급을 놓지 않기 위한 파일)
// ============================================================================
//  왜 필요한가
//  --------------------------------------------------------------------------
//  폰이 무음 모드일 때, OS 는 진짜 <audio> 가 소리를 내고 있는 페이지만 "미디어
//  재생"으로 취급해서 무음 스위치를 무시해준다. BGM 을 음소거하면 소리 내는 <audio>
//  가 없어지므로 페이지가 일반 등급으로 떨어지고, 그때부터 효과음(Web Audio)이 OS
//  단계에서 잘린다. 프로그램 쪽은 전부 정상인데 소리만 안 나는 이유가 이것이다.
//  (2026-09-24 실측: 장치 running / 시계 정상 / 효과음 켜짐인데도 무음)
//
//  그래서 들리지 않는 오디오 파일 하나를 계속 재생해서 그 등급을 놓지 않게 한다.
//  40Hz(스피커가 거의 못 내는 낮은 음)를 -62dB 로 담은 2초짜리 mp3 이고, 무한
//  반복으로 돌린다. 24kHz / 8kbps 라 2.3KB 밖에 안 된다.
//  완전한 무음이 아니라 아주 작은 소리를 넣은 이유: 일부 기기가 "완전 무음"을
//  재생하지 않는 것으로 처리해서 등급을 안 주기 때문이다.
//
//  쓰는 쪽은 assets/audio_wake.js 다 (이 파일보다 나중에 로드되어야 한다).
//  이 파일은 그림을 텍스트로 올릴 때 쓰는 방식과 동일하게 mp3 를 base64 로 담았다.
// ============================================================================
window.CREAM_QUIET_MP3 = "data:audio/mpeg;base64,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";
