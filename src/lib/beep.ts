// 어드민 위기 경고 알림음 (TRD 16장). 브라우저는 사용자가 한 번 누른 뒤에만 소리를 허용한다.
const BEEP_HZ = 880;
const BEEP_SECONDS = 0.25;
const BEEP_VOLUME = 0.1;

let audio: AudioContext | null = null;

/** 첫 클릭에서 불러 소리를 낼 수 있게 한다 */
export function unlockBeep(): void {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // 오디오를 쓸 수 없는 브라우저에서는 화면 알림만 보인다
    audio = null;
  }
}

/** 짧은 알림음. 아직 허용되지 않았으면 아무 일도 하지 않는다 */
export function beep(): void {
  if (!audio || audio.state !== 'running') return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = BEEP_HZ;
  gain.gain.value = BEEP_VOLUME;
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + BEEP_SECONDS);
}
