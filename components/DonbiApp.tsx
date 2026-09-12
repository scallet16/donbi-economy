"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { FIXED_TOPICS, allWordContents, learningSections, topics, wordsForTopic, type LearningLevel, type WordContent } from "@/data/content";
import { backupFilename, isValidBackup } from "@/lib/backup";
import { prepareVoices, speakKorean, stopSpeech } from "@/lib/speech";
import { arrangeQuizOptions, quizSpeechText } from "@/lib/quiz";
import { completedInTopic, topicUnlocked } from "@/lib/progress";
import { IndexedDbLearningStorage, normalizeAppData } from "@/lib/storage/indexedDb";
import { emptyAppData, emptyWordProgress, type AppData, type ScreenName, type StudentRecord, type WordProgress } from "@/lib/storage/types";
import { CharacterImage } from "./CharacterImage";
import { WritingCanvas } from "./WritingCanvas";

const storage = new IndexedDbLearningStorage();
const TOTAL_WORDS = allWordContents.length;

function newStudent(displayName: string): StudentRecord {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), displayName, createdAt: now, updatedAt: now, currentScreen: "home", currentTopicId: 1, currentWordId: "money", wordProgress: {}, bankbookEntries: [] };
}

export function DonbiApp() {
  const [data, setData] = useState<AppData>(emptyAppData());
  const [screen, setScreen] = useState<ScreenName>("start");
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [activityResult, setActivityResult] = useState<Record<string, boolean>>({});
  const [checkAnswers, setCheckAnswers] = useState<Record<number, number>>({});
  const [activeTopicId, setActiveTopicId] = useState(1);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [printPreview, setPrintPreview] = useState<"topic" | "bankbook" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const student = useMemo(() => data.students.find((item) => item.id === data.activeStudentId) ?? null, [data]);
  const activeWords = wordsForTopic(activeTopicId);
  const activeWord = activeWords[activeWordIndex] ?? activeWords[0];

  useEffect(() => {
    prepareVoices();
    storage.load().then((saved) => {
      setData(saved);
      const selected = saved.students.find((item) => item.id === saved.activeStudentId);
      if (selected) {
        setActiveTopicId(selected.currentTopicId);
        setActiveWordIndex(Math.max(0, wordsForTopic(selected.currentTopicId).findIndex((word) => word.id === selected.currentWordId)));
      }
      setReady(true);
    }).catch((error: Error) => { setStorageError(error.message); setReady(true); });
    return stopSpeech;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.largeText = String(data.settings.largeText);
    document.documentElement.dataset.highContrast = String(data.settings.highContrast);
    document.documentElement.dataset.reduceMotion = String(data.settings.reducedMotion);
  }, [data.settings]);

  const persist = async (next: AppData) => {
    setData(next);
    try { await storage.save(next); setStorageError(""); }
    catch (error) { setStorageError((error as Error).message); }
  };

  const updateStudent = (changes: Partial<StudentRecord>) => {
    if (!student) return;
    const updated = { ...student, ...changes, updatedAt: new Date().toISOString() };
    void persist({ ...data, students: data.students.map((item) => item.id === student.id ? updated : item) });
  };

  const updateWordProgress = (wordId: string, changes: Partial<WordProgress>) => {
    if (!student) return;
    const current = student.wordProgress[wordId] ?? emptyWordProgress();
    updateStudent({ wordProgress: { ...student.wordProgress, [wordId]: { ...current, ...changes } } });
  };

  const go = (next: ScreenName) => {
    stopSpeech();
    setScreen(next);
    if (student && next !== "start") updateStudent({ currentScreen: next });
    window.scrollTo({ top: 0, behavior: data.settings.reducedMotion ? "auto" : "smooth" });
  };

  const openTopic = (topicId: number) => {
    if (!student || !topicUnlocked(student, topicId)) return;
    const words = wordsForTopic(topicId);
    const firstIncomplete = words.findIndex((word) => !student.bankbookEntries.some((entry) => entry.wordId === word.id));
    const index = firstIncomplete < 0 ? 0 : firstIncomplete;
    setActiveTopicId(topicId);
    setActiveWordIndex(index);
    setScreen("topic");
    updateStudent({ currentScreen: "topic", currentTopicId: topicId, currentWordId: words[index].id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWord = (index: number) => {
    const word = activeWords[index];
    if (!word) return;
    stopSpeech();
    setActiveWordIndex(index);
    setActivityResult({});
    setCheckAnswers({});
    setScreen("learn");
    updateStudent({ currentScreen: "learn", currentTopicId: activeTopicId, currentWordId: word.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const printTopic = () => {
    stopSpeech();
    setPrintPreview("topic");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const printNow = (target: "topic" | "bankbook") => {
    document.documentElement.dataset.printTarget = target;
    const cleanup = () => { delete document.documentElement.dataset.printTarget; };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.requestAnimationFrame(() => window.print());
  };

  const back = () => {
    const previous: Record<ScreenName, ScreenName> = { start: "start", home: "home", topic: "home", learn: "topic", bankbook: "home", settings: "home" };
    go(previous[screen]);
  };

  const speak = (text: string) => {
    if (!data.settings.soundEnabled) return setNotice("설정에서 소리를 켜면 읽어주기를 사용할 수 있어요.");
    try { speakKorean(text, data.settings.speechRate); }
    catch (error) { setNotice((error as Error).message); }
  };

  const createStudent = () => {
    const clean = name.trim();
    if (!clean) return setNotice("이름이나 별명을 입력해 주세요.");
    const created = newStudent(clean);
    void persist({ ...data, activeStudentId: created.id, students: [...data.students, created] });
    setName(""); setScreen("home"); setNotice(`${clean} 님, 반가워요!`);
  };

  const chooseStudent = (selected: StudentRecord, resume: boolean) => {
    void persist({ ...data, activeStudentId: selected.id });
    setActiveTopicId(selected.currentTopicId);
    setActiveWordIndex(Math.max(0, wordsForTopic(selected.currentTopicId).findIndex((word) => word.id === selected.currentWordId)));
    setScreen(resume ? selected.currentScreen : "home");
  };

  const editStudent = (selected: StudentRecord) => {
    const next = window.prompt("새 이름이나 별명을 입력해 주세요.", selected.displayName)?.trim();
    if (!next) return;
    void persist({ ...data, students: data.students.map((item) => item.id === selected.id ? { ...item, displayName: next, updatedAt: new Date().toISOString() } : item) });
  };

  const deleteStudent = (selected: StudentRecord) => {
    if (!window.confirm(`‘${selected.displayName}’의 학습 기록을 모두 삭제할까요? 되돌릴 수 없어요.`)) return;
    void persist({ ...data, activeStudentId: data.activeStudentId === selected.id ? null : data.activeStudentId, students: data.students.filter((item) => item.id !== selected.id) });
    setNotice("학생 기록을 삭제했어요.");
  };

  const finishCheck = (word: WordContent) => {
    if (!student || Object.keys(checkAnswers).length < 3) return setNotice("세 문제에 모두 참여해 주세요.");
    const current = student.wordProgress[word.id] ?? emptyWordProgress();
    const correct = [0, 0, 0].filter((answer, index) => checkAnswers[index] === answer).length;
    updateWordProgress(word.id, { checkResult: { correct, total: 3, attempts: (current.checkResult?.attempts ?? 0) + 1 }, completedSections: Array.from(new Set([...current.completedSections, 4])) });
    setNotice(correct === 3 ? "확인 활동을 완료했어요!" : "참여를 완료했어요. 다시 연습하면 더 잘할 수 있어요.");
  };

  const saveBankbook = (word: WordContent) => {
    if (!student) return;
    const progress = student.wordProgress[word.id] ?? emptyWordProgress();
    if (!progress.checkResult || !progress.selectedLevel) return setNotice("수준을 선택하고 확인 활동을 먼저 완료해 주세요.");
    const previous = student.bankbookEntries.find((entry) => entry.wordId === word.id);
    const entry = { wordId: word.id, word: word.word, definition: word.easyDefinition, topicId: word.topicId, level: progress.selectedLevel, completedAt: new Date().toISOString(), status: "completed" as const, relearnCount: previous ? previous.relearnCount + 1 : 0 };
    updateStudent({ bankbookEntries: [...student.bankbookEntries.filter((item) => item.wordId !== word.id), entry] });
    const topicWillComplete = completedInTopic(student, word.topicId) + (previous ? 0 : 1) === wordsForTopic(word.topicId).length;
    setNotice(topicWillComplete && word.topicId < 6 ? `${word.topicId}주제를 모두 마쳤어요! 이제 ${word.topicId + 1}주제로 갈 수 있어요.` : `경제통장에 ‘${word.word}’이(가) 저장되었어요!`);
  };

  const downloadBackup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = backupFilename(); anchor.click(); URL.revokeObjectURL(url);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isValidBackup(parsed)) throw new Error("돈비경제 기록 파일 형식이 아니에요.");
      if (!window.confirm("현재 기록을 선택한 파일의 기록으로 바꿀까요?")) return;
      await persist(normalizeAppData(parsed)); setScreen("start"); setNotice("학습 기록을 불러왔어요.");
    } catch (error) { setNotice((error as Error).message); }
  };

  if (!ready) return <main className="loading"><span>₩</span><p>돈비가 학습장을 준비하고 있어요…</p></main>;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">본문으로 바로 가기</a>
    {screen !== "start" && <Header name={student?.displayName} screen={screen} home={() => go("home")} back={back} bankbook={() => go("bankbook")} settings={() => go("settings")} sound={data.settings.soundEnabled} toggleSound={() => void persist({ ...data, settings: { ...data.settings, soundEnabled: !data.settings.soundEnabled } })} />}
    {(notice || storageError) && <div className={`notice ${storageError ? "error" : ""}`} role="status"><span>{storageError || notice}</span><button aria-label="안내 닫기" onClick={() => { setNotice(""); setStorageError(""); }}>×</button></div>}
    <main id="main-content">
      {printPreview && student ? <PrintPreview target={printPreview} topicId={activeTopicId} student={student} close={() => setPrintPreview(null)} print={() => printNow(printPreview)} /> : <>
        {screen === "start" && <Start data={data} name={name} setName={setName} create={createStudent} choose={chooseStudent} edit={editStudent} remove={deleteStudent} />}
        {screen === "home" && student && <Home student={student} openTopic={openTopic} bankbook={() => go("bankbook")} />}
        {screen === "topic" && student && <Topic student={student} topicId={activeTopicId} learn={openWord} printTopic={printTopic} />}
        {screen === "learn" && student && activeWord && <Learn student={student} word={activeWord} wordIndex={activeWordIndex} topicWords={activeWords} moveWord={(index: number) => {
          const next = activeWords[index]; if (!next) return;
          stopSpeech(); setActiveWordIndex(index); setActivityResult({}); setCheckAnswers({}); updateStudent({ currentWordId: next.id });
        }} close={() => go("topic")} printTopic={printTopic} speak={speak} updateProgress={(changes) => updateWordProgress(activeWord.id, changes)} activityResult={activityResult} setActivityResult={setActivityResult} checkAnswers={checkAnswers} setCheckAnswers={setCheckAnswers} finishCheck={() => finishCheck(activeWord)} saveBankbook={() => saveBankbook(activeWord)} openBankbook={() => go("bankbook")} nextTopic={() => openTopic(Math.min(6, activeTopicId + 1))} />}
        {screen === "bankbook" && student && <Bankbook student={student} continueLearning={() => openTopic(student.currentTopicId)} printBankbook={() => { stopSpeech(); setPrintPreview("bankbook"); window.scrollTo({ top: 0, behavior: "auto" }); }} backup={downloadBackup} restore={() => fileInput.current?.click()} />}
        {screen === "settings" && <Settings data={data} persist={persist} backup={downloadBackup} restore={() => fileInput.current?.click()} />}
      </>}
    </main>
    <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} />
  </div>;
}

function Header({ name, screen, home, back, bankbook, settings, sound, toggleSound }: { name?: string; screen: ScreenName; home: () => void; back: () => void; bankbook: () => void; settings: () => void; sound: boolean; toggleSound: () => void }) {
  return <header className="app-header no-print"><button onClick={home}>⌂ <span>홈</span></button><div className="mini-brand"><Image src="/characters/donbi/donbi-header-face.png" alt="돈비경제 얼굴 캐릭터" width={52} height={52} priority /><span><strong>돈비경제</strong><small>{name} 님</small></span></div><nav aria-label="주요 메뉴"><button disabled={screen === "home"} onClick={back}>← <span>뒤로</span></button><button aria-pressed={!sound} onClick={toggleSound}>{sound ? "🔊" : "🔇"} <span>소리</span></button><button onClick={bankbook}>▤ <span>통장</span></button><button onClick={settings}>⚙ <span>설정</span></button></nav></header>;
}

function Start({ data, name, setName, create, choose, edit, remove }: { data: AppData; name: string; setName: (value: string) => void; create: () => void; choose: (student: StudentRecord, resume: boolean) => void; edit: (student: StudentRecord) => void; remove: (student: StudentRecord) => void }) {
  return <div className="start-screen"><section className="start-hero"><div className="brand-lockup"><Image src="/characters/donbi/donbi-header-face.png" alt="돈비경제 얼굴 캐릭터" width={104} height={104} priority /><div><p>Don’t worry, Be 경제</p><h1>돈비경제 쉬운 경제 사전 <em>1단계</em></h1><small>제작: 강수향 · 김조은 · 조연희</small></div></div></section><section className="start-card"><span className="eyebrow">배움 단어 통장</span><h2>어떤 이름으로 시작할까요?</h2><p>실명이 아니어도 괜찮아요. 나만 알아볼 수 있는 별명을 써 보세요.</p><label htmlFor="student-name">이름 또는 별명</label><div className="name-row"><input id="student-name" maxLength={20} value={name} placeholder="예: 씩씩한 다람쥐" onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && create()} /><button className="primary" onClick={create}>새 학생 시작 →</button></div>{data.students.length > 0 && <div className="existing"><h3>전에 학습한 학생</h3>{data.students.map((student) => <div className="student-row" key={student.id}><button className="student-main" onClick={() => choose(student, false)}><span>{student.displayName.slice(0, 1)}</span><b>{student.displayName}<small>{student.bankbookEntries.length}개 단어 완료</small></b></button><button onClick={() => choose(student, true)}>▶ 이어서</button><button aria-label={`${student.displayName} 이름 수정`} onClick={() => edit(student)}>✎</button><button aria-label={`${student.displayName} 기록 삭제`} onClick={() => remove(student)}>⌫</button></div>)}</div>}</section></div>;
}

function Home({ student, openTopic, bankbook }: { student: StudentRecord; openTopic: (topicId: number) => void; bankbook: () => void }) {
  return <div className="page"><p className="home-credit"><Image src="/credits/donbi-teachers.png" alt="돈비경제 선생님 세 분" width={96} height={73} priority /><span>제작: 강수향 · 김조은 · 조연희</span></p><section className="welcome"><div><span className="eyebrow">안녕하세요, {student.displayName} 님!</span><h1>오늘은 어떤 경제 단어를 배워 볼까요?</h1><p>앞 주제를 모두 마치면 다음 주제가 열려요.</p></div><button className="bank-summary" onClick={bankbook}><span>나의 경제통장</span><strong>{student.bankbookEntries.length}<small>/{TOTAL_WORDS} 단어</small></strong><span>통장 보기 →</span></button></section><div className="section-heading"><div><span className="eyebrow">6가지 배움 주제</span><h2>경제 세상으로 출발!</h2></div><p>주제마다 모든 단어의 5단계 활동을 마쳐 보세요.</p></div><section className="topic-grid" aria-label="경제 학습 주제">{topics.map((item) => { const done = completedInTopic(student, item.id); const unlocked = topicUnlocked(student, item.id); const progress = Math.round(done / item.words.length * 100); return <article className={`topic-card topic-${item.id} ${unlocked ? "" : "locked"}`} key={item.id}><div className="topic-top"><b>{item.id}주제</b><span>{unlocked ? (done === item.words.length ? "✓ 주제 완료" : done ? "✓ 학습 중" : "● 시작 가능") : "🔒 앞 주제를 완료해요"}</span></div><h3>{item.title}</h3><p>{item.words.join(" · ")}</p><div className="progress-label"><span>{done}/{item.words.length} 완료</span><span>{progress}%</span></div><div className="progress"><i style={{ width: `${progress}%` }} /></div><button disabled={!unlocked} onClick={() => openTopic(item.id)}>{unlocked ? `${item.id}주제 만나기 →` : "아직 잠겨 있어요"}</button></article>; })}</section></div>;
}

function Topic({ student, topicId, learn, printTopic }: { student: StudentRecord; topicId: number; learn: (index: number) => void; printTopic: () => void }) {
  const topic = FIXED_TOPICS[topicId - 1];
  const words = wordsForTopic(topicId);
  const completed = new Set(student.bankbookEntries.map((entry) => entry.wordId));
  return <div className="page"><section className="topic-hero"><div><span className="eyebrow">{topicId}주제</span><h1>{topic.prompt}</h1><button className="topic-print-button no-print" onClick={printTopic}>🖨 주제 단어 인쇄</button></div></section><div className="section-heading"><div><span className="eyebrow">배움 단어 {words.length}개</span><h2>단어마다 5단계 활동을 마쳐 보세요</h2></div></div><section className="word-list">{words.map((word, index) => { const progress = student.wordProgress[word.id] ?? emptyWordProgress(); return <button className="word-card active" onClick={() => learn(index)} key={word.id}><span><small>{completed.has(word.id) ? "✓ 완료" : progress.completedSections.length ? `● ${progress.completedSections.length}/5 학습 중` : "● 시작 가능"}</small><strong>{word.word}</strong><em>{word.easyDefinition}</em><i>{word.topicId}주제</i></span><b>→</b></button>; })}</section></div>;
}

type LearnProps = { student: StudentRecord; word: WordContent; wordIndex: number; topicWords: WordContent[]; moveWord: (index: number) => void; close: () => void; printTopic: () => void; speak: (text: string) => void; updateProgress: (changes: Partial<WordProgress>) => void; activityResult: Record<string, boolean>; setActivityResult: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; checkAnswers: Record<number, number>; setCheckAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>; finishCheck: () => void; saveBankbook: () => void; openBankbook: () => void; nextTopic: () => void };
function Learn({ student, word, wordIndex, topicWords, moveWord, close, printTopic, speak, updateProgress, activityResult, setActivityResult, checkAnswers, setCheckAnswers, finishCheck, saveBankbook, openBankbook, nextTopic }: LearnProps) {
  const progress = student.wordProgress[word.id] ?? emptyWordProgress();
  const section = progress.currentSection;
  const saved = student.bankbookEntries.some((entry) => entry.wordId === word.id);
  const topicComplete = completedInTopic(student, word.topicId) === topicWords.length;
  const touchStart = useRef<number | null>(null);
  const move = (next: number) => {
    if (next < 0 || next >= topicWords.length) return;
    stopSpeech(); moveWord(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : null;
      if (direction === null) return;
      const next = wordIndex + direction;
      if (next < 0 || next >= topicWords.length) return;
      event.preventDefault();
      stopSpeech();
      moveWord(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moveWord, wordIndex, topicWords.length]);
  const setSection = (next: number) => updateProgress({ currentSection: next });
  const complete = () => updateProgress({ completedSections: Array.from(new Set([...progress.completedSections, section])), currentSection: Math.min(4, section + 1) });
  return <div className="page learn-page" onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 70) move(wordIndex + (distance < 0 ? 1 : -1)); touchStart.current = null; }}>
    <section className="word-browser" aria-label={`${word.topicId}주제 ${word.word} 단어 학습`}>
      <div className="word-browser-heading"><div><span className="eyebrow">오늘의 배움 단어 · {word.topicId}주제</span><h1><small>{FIXED_TOPICS[word.topicId - 1].prompt}</small>{word.word}</h1></div><div className="word-browser-actions no-print"><button onClick={printTopic}>🖨 주제 단어 인쇄</button><button onClick={close}>× 닫기</button></div></div>
      <nav className="word-switcher no-print" aria-label="같은 주제 단어 이동"><button disabled={wordIndex === 0} onClick={() => move(wordIndex - 1)} aria-label="이전 단어">← <span>이전 단어</span></button><strong aria-live="polite">{wordIndex + 1} / {topicWords.length}</strong><button disabled={wordIndex === topicWords.length - 1} onClick={() => move(wordIndex + 1)} aria-label="다음 단어"><span>다음 단어</span> →</button></nav>
      <WordOverview word={word} speak={speak} />
    </section>
    <nav className="stepper" aria-label={`${word.word} 단어 학습 진행 단계`}>{learningSections.map((label, index) => <button key={label} className={index === section ? "current" : progress.completedSections.includes(index) ? "done" : ""} aria-current={index === section ? "step" : undefined} onClick={() => setSection(index)}><span>{progress.completedSections.includes(index) ? "✓" : index + 1}</span>{label}</button>)}</nav>
    {section === 0 && <Meet word={word} speak={speak} />}
    {section === 1 && <Meaning word={word} speak={speak} />}
    {section === 2 && <Activities word={word} topicWords={topicWords} level={progress.selectedLevel} selectLevel={(level) => updateProgress({ selectedLevel: level })} results={activityResult} setResults={setActivityResult} speak={speak} />}
    {section === 3 && <WritingCanvas word={word.word} completed={progress.writingCompleted} onComplete={() => updateProgress({ writingCompleted: true, completedSections: Array.from(new Set([...progress.completedSections, 3])) })} />}
    {section === 4 && <Check word={word} topicWords={topicWords} progress={progress} answers={checkAnswers} setAnswers={setCheckAnswers} finish={finishCheck} save={saveBankbook} saved={saved} bankbook={openBankbook} nextWord={wordIndex < topicWords.length - 1 ? () => move(wordIndex + 1) : undefined} topicComplete={topicComplete} nextTopic={word.topicId < 6 ? nextTopic : undefined} />}
    {section < 4 && <div className="learn-nav"><button className="secondary" disabled={section === 0} onClick={() => setSection(section - 1)}>← 이전 단계</button><button className="primary" onClick={complete}>이 단계 완료 · 다음 →</button></div>}
  </div>;
}

function WordOverview({ word, speak }: { word: WordContent; speak: (text: string) => void }) { return <div className="word-overview"><div className="word-overview-copy"><p className="dictionary-topic">{word.topicId}주제</p><h2>{word.easyDefinition}</h2><p className="life-sentence"><strong>생활 문장</strong>{word.examples[0]}</p><div className="word-audio no-print"><button className="sound" onClick={() => speak(word.speech.word)}>🔊 단어 듣기</button><button className="sound" onClick={() => speak(word.speech.definition)}>🔊 뜻 듣기</button><button className="sound" onClick={() => speak(word.examples[0])}>🔊 문장 듣기</button></div></div></div>; }
function Meet({ word, speak }: { word: WordContent; speak: (text: string) => void }) { return <section className="panel"><span className="eyebrow">1단계 · 만나기</span><h2>오늘 만날 단어는 ‘{word.word}’이에요</h2><p className="big-copy">{word.easyDefinition}</p><button className="sound" onClick={() => speak(`${word.word}. ${word.easyDefinition}`)}>🔊 함께 듣기</button></section>; }
function Meaning({ word, speak }: { word: WordContent; speak: (text: string) => void }) { return <section className="panel meaning"><div><span className="eyebrow">2단계 · 뜻 익히기</span><h2>{word.easyDefinition}</h2><button className="sound" onClick={() => speak(word.speech.definition)}>🔊 뜻 다시 듣기</button></div><div className="examples"><h3>생활 속 ‘{word.word}’</h3>{word.examples.map((example, index) => <button key={example} onClick={() => speak(example)}><span>{index + 1}</span>{example}<b>🔊</b></button>)}</div></section>; }

function Activities({ word, topicWords, level, selectLevel, results, setResults, speak }: { word: WordContent; topicWords: WordContent[]; level: LearningLevel | null; selectLevel: (level: LearningLevel) => void; results: Record<string, boolean>; setResults: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; speak: (text: string) => void }) {
  const alternatives = allWordContents.filter((item) => item.id !== word.id);
  const other = topicWords.find((item) => item.id !== word.id) ?? alternatives[0];
  const second = alternatives.find((item) => item.id !== other.id) ?? alternatives[0];
  const answer = (id: string, correct: boolean) => setResults((old) => ({ ...old, [`${word.id}-${id}`]: correct }));
  const currentResults = Object.fromEntries(Object.entries(results).filter(([key]) => key.startsWith(`${word.id}-`)).map(([key, value]) => [key.slice(word.id.length + 1), value]));
  const wordOrder = allWordContents.findIndex((item) => item.id === word.id);
  const quiz = (id: string, title: string, options: readonly string[], questionOrder: number) => {
    const arranged = arrangeQuizOptions(options, wordOrder, questionOrder);
    return <Quiz key={id} id={id} title={title} options={arranged.options} correct={arranged.correct} results={currentResults} answer={answer} speak={speak} />;
  };
  return <section className="panel activities"><span className="eyebrow">3단계 · 활동하기</span><h2>나에게 맞는 활동을 골라요</h2><div className="levels"><button className={level === "sprout" ? "selected" : ""} onClick={() => selectLevel("sprout")}><span>🌱</span><strong>새싹 활동</strong><small>단어와 큰 글자로 배워요</small></button><button className={level === "fruit" ? "selected" : ""} onClick={() => selectLevel("fruit")}><span>🍎</span><strong>열매 활동</strong><small>뜻과 문장을 생각해요</small></button></div>{level && <div className="quiz-list">{level === "sprout" ? <>{quiz("word", `‘${word.word}’과 같은 단어를 찾아보세요`, [word.word, other.word, second.word], 0)}{quiz("meaning", `‘${word.word}’의 뜻을 골라보세요`, [word.easyDefinition, other.easyDefinition], 1)}</> : <>{quiz("definition", `‘${word.easyDefinition}’에 맞는 단어를 골라보세요`, [word.word, other.word, second.word], 0)}{quiz("sentence", `‘${word.word}’이(가) 들어간 생활 문장을 골라보세요`, [word.examples[0], other.examples[0]], 1)}{quiz("match", "단어와 쉬운 뜻이 바르게 연결된 것을 골라보세요", [`${word.word} — ${word.easyDefinition}`, `${word.word} — ${other.easyDefinition}`], 2)}</>}</div>}</section>;
}
function Quiz({ id, title, options, correct, results, answer, speak }: { id: string; title: string; options: readonly string[]; correct: number; results: Record<string, boolean>; answer: (id: string, correct: boolean) => void; speak: (text: string) => void }) { return <fieldset className="quiz"><legend>{title}</legend><button type="button" className="sound quiz-speak" onClick={() => speak(quizSpeechText(title, options))}>🔊 문제와 보기 듣기</button><div className="options">{options.map((option, index) => <button key={option} onClick={() => answer(id, index === correct)}><span className="option-number" aria-hidden="true">{index + 1}</span>{option}</button>)}</div>{id in results && <p className={results[id] ? "correct" : "retry"} role="status">{results[id] ? "✓ 맞았어요!" : "↻ 다시 생각해 볼까요? 다시 고를 수 있어요."}</p>}</fieldset>; }

function Check({ word, topicWords, progress, answers, setAnswers, finish, save, saved, bankbook, nextWord, topicComplete, nextTopic }: { word: WordContent; topicWords: WordContent[]; progress: WordProgress; answers: Record<number, number>; setAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>; finish: () => void; save: () => void; saved: boolean; bankbook: () => void; nextWord?: () => void; topicComplete: boolean; nextTopic?: () => void }) {
  const other = allWordContents.find((item) => item.id !== word.id && item.topicId === word.topicId) ?? allWordContents.find((item) => item.id !== word.id)!;
  const questions = [{ q: `‘${word.word}’의 쉬운 뜻을 골라보세요.`, o: [word.easyDefinition, other.easyDefinition] }, { q: `‘${word.easyDefinition}’에 맞는 단어를 골라보세요.`, o: [word.word, other.word] }, { q: "단어와 뜻이 바르게 연결된 것을 골라보세요.", o: [`${word.word} — ${word.easyDefinition}`, `${word.word} — ${other.easyDefinition}`] }];
  return <section className="panel check"><span className="eyebrow">5단계 · 확인·저장</span><h2>‘{word.word}’을(를) 확인해요</h2><p>틀려도 괜찮아요. 세 문제에 참여하면 경제통장에 저장할 수 있어요.</p>{questions.map((item, index) => <fieldset className="check-question" key={item.q}><legend><span>{index + 1}</span>{item.q}</legend><div className="options">{item.o.map((option, optionIndex) => <label className={answers[index] === optionIndex ? "selected" : ""} key={`${option}-${optionIndex}`}><input type="radio" name={`check-${word.id}-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((old) => ({ ...old, [index]: optionIndex }))} />{option}</label>)}</div></fieldset>)}<button className="primary wide" onClick={finish}>✓ 확인 활동 마치기</button>{progress.checkResult && <div className={`result ${progress.checkResult.correct === 3 ? "complete" : "practice"}`}><span>{progress.checkResult.correct === 3 ? "🏅" : "🌱"}</span><div><h3>{progress.checkResult.correct === 3 ? "완료" : "조금 더 연습해요"}</h3><p>{progress.checkResult.correct === 3 ? "배운 내용을 잘 확인했어요!" : "참여를 완료했어요. 다시 연습하면 더 잘할 수 있어요."}</p></div></div>}<div className="save-card"><CharacterImage src="/characters/donbi/donbi-celebrate.webp" alt="학습 완료를 축하하는 돈비" mood="celebrate" /><div><h3>{saved ? `경제통장에 ‘${word.word}’이(가) 저장되었어요!` : "배운 단어를 경제통장에 모아요"}</h3><p>선택한 수준과 완료 날짜도 함께 기록해요.</p><div className="button-row"><button className="primary" disabled={!progress.checkResult || !progress.selectedLevel} onClick={save}>🏅 경제통장에 저장</button>{saved && nextWord && <button className="secondary" onClick={nextWord}>다음 단어 배우기 →</button>}{saved && topicComplete && nextTopic && <button className="primary" onClick={nextTopic}>다음 주제로 가기 →</button>}{saved && <button className="secondary" onClick={bankbook}>통장 보러 가기 →</button>}</div></div></div><small>{word.topicId}주제 {topicWords.findIndex((item) => item.id === word.id) + 1}/{topicWords.length} 단어</small></section>;
}

function TopicPrint({ topicId }: { topicId: number }) {
  const topic = FIXED_TOPICS[topicId - 1];
  const words = wordsForTopic(topicId);
  return <section className="topic-print" aria-label={`${topicId}주제 단어 인쇄물`}>
    <header><p>돈비경제 쉬운 경제 사전</p><h1>{topicId}주제 · {topic.prompt}</h1><small>배움 단어 {words.length}개</small></header>
    <div className="topic-print-words">{words.map((word) => <article className="topic-print-card" key={word.id}>
      <div className="topic-print-copy"><div className="topic-print-title"><h2>{word.word}</h2><span>{word.topicId}주제</span></div><dl><div><dt>쉬운 뜻</dt><dd>{word.easyDefinition}</dd></div><div><dt>생활 문장</dt><dd>{word.examples[0]}</dd></div></dl><div className="trace-box"><span>따라 쓰기</span><b>{word.word}</b><i>{word.word}</i><i>{word.word}</i></div><p className="learned-check">□ 배웠어요</p></div>
    </article>)}</div>
    <footer>이름: ____________________　　날짜: ______년 ___월 ___일</footer>
  </section>;
}

function BankbookPrint({ student }: { student: StudentRecord }) {
  const entries = [...student.bankbookEntries].sort((a, b) => allWordContents.findIndex((word) => word.id === a.wordId) - allWordContents.findIndex((word) => word.id === b.wordId));
  const percent = Math.round(entries.length / TOTAL_WORDS * 100);
  return <section className="bankbook-print" aria-label="경제통장 인쇄물"><header><p>돈비경제 쉬운 경제 사전</p><h1>나의 돈비 경제통장</h1><span>{student.displayName} 님의 배움 기록</span></header><div className="bankbook-print-summary"><b>완료 단어 {entries.length} / {TOTAL_WORDS}</b><b>전체 진행률 {percent}%</b></div>{entries.length ? entries.map((entry) => <article key={entry.wordId}><span>{entry.topicId}주제</span><h2>{entry.word}</h2><p>{entry.definition}</p><dl><div><dt>수준</dt><dd>{entry.level === "sprout" ? "새싹" : "열매"}</dd></div><div><dt>완료 날짜</dt><dd>{new Date(entry.completedAt).toLocaleDateString("ko-KR")}</dd></div><div><dt>상태</dt><dd>배웠어요</dd></div></dl></article>) : <p className="empty">아직 통장에 저장된 단어가 없어요.</p>}<footer>제작: 강수향 · 김조은 · 조연희</footer></section>;
}

function PrintPreview({ target, topicId, student, close, print }: { target: "topic" | "bankbook"; topicId: number; student: StudentRecord; close: () => void; print: () => void }) {
  return <div className="print-preview-screen"><div className="print-preview-toolbar no-print"><div><strong>{target === "topic" ? `${topicId}주제 단어` : "경제통장"} 인쇄 미리보기</strong><small>A4 세로 인쇄에 맞춰 구성했어요.</small></div><button className="secondary" onClick={close}>← 미리보기 닫기</button><button className="primary" onClick={print}>🖨 인쇄하기</button></div>{target === "topic" ? <TopicPrint topicId={topicId} /> : <BankbookPrint student={student} />}</div>;
}

function Bankbook({ student, continueLearning, printBankbook, backup, restore }: { student: StudentRecord; continueLearning: () => void; printBankbook: () => void; backup: () => void; restore: () => void }) {
  const entries = [...student.bankbookEntries].sort((a, b) => allWordContents.findIndex((word) => word.id === a.wordId) - allWordContents.findIndex((word) => word.id === b.wordId));
  const completedIds = new Set(entries.map((entry) => entry.wordId));
  const latest = [...entries].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  const percent = Math.round(entries.length / TOTAL_WORDS * 100);
  return <div className="page bankbook">
    <section className="bank-cover"><div><span>배운 만큼 차곡차곡</span><h1>나의 돈비 경제통장</h1><p><strong>{student.displayName}</strong> 님의 소중한 배움 기록</p></div><Image src="/characters/donbi/donbi-header-face.png" alt="돈비경제 얼굴 캐릭터" width={150} height={150} /></section>
    <section className="stats"><div><span>전체 완료</span><strong>{entries.length}<small>/{TOTAL_WORDS}</small></strong></div><div><span>전체 진행률</span><strong>{percent}<small>%</small></strong></div><div><span>최근 학습</span><strong className="date">{latest ? new Date(latest.completedAt).toLocaleDateString("ko-KR") : "아직 없어요"}</strong></div></section>
    <section className="topic-progress"><h2>주제별 진행률</h2>{topics.map((topic) => { const done = completedInTopic(student, topic.id); return <div key={topic.id}><span><b>{topic.id}주제</b> {topic.title}</span><div className="progress"><i style={{ width: `${done / topic.words.length * 100}%` }} /></div><strong>{done}/{topic.words.length}</strong></div>; })}</section>
    <section className="learned"><span className="eyebrow">배운 단어</span><h2>통장에 모은 단어</h2>{entries.length ? entries.map((entry) => <article className="bank-entry" key={entry.wordId}><span className="stamp">✓</span><div><small>{entry.topicId}주제</small><h3>{entry.word}</h3><p>{entry.definition}</p></div><dl><div><dt>수준</dt><dd>{entry.level === "sprout" ? "🌱 새싹" : "🍎 열매"}</dd></div><div><dt>완료 날짜</dt><dd>{new Date(entry.completedAt).toLocaleDateString("ko-KR")}</dd></div><div><dt>상태</dt><dd>✓ 완료</dd></div><div><dt>다시 학습</dt><dd>{entry.relearnCount}회</dd></div></dl></article>) : <p className="empty">아직 저장된 단어가 없어요. 1주제부터 배워 볼까요?</p>}</section>
    <section className="not-learned"><h2>아직 배우지 않은 단어</h2><p>{allWordContents.filter((word) => !completedIds.has(word.id)).map((word) => word.word).join(" · ") || "20개 단어를 모두 배웠어요!"}</p></section>
    <div className="bank-actions no-print"><button className="primary" onClick={continueLearning}>▶ 이어서 학습하기</button><button className="secondary" onClick={printBankbook}>🖨 통장 인쇄·PDF 저장</button><button className="secondary" onClick={backup}>↓ 기록 파일 저장</button><button className="secondary" onClick={restore}>↑ 기록 파일 불러오기</button></div><footer className="print-footer"><b>돈비경제 쉬운 경제 사전 1단계</b><small>제작: 강수향 · 김조은 · 조연희</small></footer>
  </div>;
}

function Settings({ data, persist, backup, restore }: { data: AppData; persist: (data: AppData) => Promise<void>; backup: () => void; restore: () => void }) {
  const update = (key: keyof AppData["settings"], value: boolean | number) => void persist({ ...data, settings: { ...data.settings, [key]: value } });
  return <div className="page settings"><span className="eyebrow">나에게 편하게</span><h1>설정</h1><section className="settings-card"><h2>보기와 움직임</h2><Toggle label="큰 글자 모드" checked={data.settings.largeText} change={(value) => update("largeText", value)} /><Toggle label="높은 대비" checked={data.settings.highContrast} change={(value) => update("highContrast", value)} /><Toggle label="애니메이션 끄기" checked={data.settings.reducedMotion} change={(value) => update("reducedMotion", value)} /><Toggle label="효과음" checked={data.settings.effectsEnabled} change={(value) => update("effectsEnabled", value)} /></section><section className="settings-card"><h2>읽어주기</h2><Toggle label="소리 켜기" checked={data.settings.soundEnabled} change={(value) => update("soundEnabled", value)} /><label className="range">읽기 속도 <strong>{data.settings.speechRate.toFixed(1)}배</strong><input type="range" min="0.6" max="1.2" step="0.1" value={data.settings.speechRate} onChange={(event) => update("speechRate", Number(event.target.value))} /></label></section><section className="settings-card"><h2>기록 저장과 불러오기</h2><p>이 기기의 학습 기록을 파일로 보관하거나 다시 불러올 수 있어요.</p><div className="button-row"><button className="primary" onClick={backup}>↓ 기록 파일 저장</button><button className="secondary" onClick={restore}>↑ 기록 파일 불러오기</button></div></section></div>;
}
function Toggle({ label, checked, change }: { label: string; checked: boolean; change: (value: boolean) => void }) { return <label className="toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => change(event.target.checked)} /><i aria-hidden="true" /></label>; }
