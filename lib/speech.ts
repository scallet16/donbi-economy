let voices: SpeechSynthesisVoice[] = [];

export function prepareVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const update = () => { voices = window.speechSynthesis.getVoices(); };
  update();
  window.speechSynthesis.addEventListener("voiceschanged", update, { once: true });
}

export function speakKorean(text: string, rate: number) {
  if (!("speechSynthesis" in window)) throw new Error("이 기기에서는 읽어주기 기능을 사용할 수 없어요.");
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = rate;
  utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("ko")) ?? null;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
