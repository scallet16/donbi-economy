import type { LearningLevel } from "@/data/content";
import { SCHEMA_VERSION, emptyAppData, emptyWordProgress, type AppData, type BankbookEntry, type CheckResult, type LearningStorage, type ScreenName, type Settings, type StudentRecord, type WordProgress } from "./types";
const DB_NAME = "donbi-economy"; const STORE = "learning-data"; const KEY = "app";

type LegacyStudent = {
  id?: string; displayName?: string; createdAt?: string; updatedAt?: string; currentScreen?: ScreenName;
  currentSection?: number; completedSections?: number[]; selectedLevel?: LearningLevel | null;
  writingCompleted?: boolean; checkResult?: CheckResult | null; bankbookEntry?: BankbookEntry | null;
  currentTopicId?: number; currentWordId?: string; wordProgress?: Record<string, WordProgress>; bankbookEntries?: BankbookEntry[];
};

export function normalizeAppData(value: unknown): AppData {
  if (!value || typeof value !== "object") return emptyAppData();
  const source = value as { activeStudentId?: string | null; students?: LegacyStudent[]; settings?: Partial<Settings> };
  if (!Array.isArray(source.students)) return emptyAppData();
  const defaults = emptyAppData();
  return {
    schemaVersion: SCHEMA_VERSION,
    activeStudentId: source.activeStudentId ?? null,
    settings: { ...defaults.settings, ...(source.settings ?? {}) },
    students: source.students.map((item, index): StudentRecord => {
      const legacyEntry = item.bankbookEntry ?? null;
      const legacyProgress = {
        ...emptyWordProgress(),
        currentSection: item.currentSection ?? 0,
        completedSections: item.completedSections ?? [],
        selectedLevel: item.selectedLevel ?? null,
        writingCompleted: item.writingCompleted ?? false,
        checkResult: item.checkResult ?? null,
      };
      return {
        id: item.id ?? `student-${index + 1}`,
        displayName: item.displayName ?? "학생",
        createdAt: item.createdAt ?? new Date().toISOString(),
        updatedAt: item.updatedAt ?? new Date().toISOString(),
        currentScreen: item.currentScreen ?? "home",
        currentTopicId: item.currentTopicId ?? 1,
        currentWordId: item.currentWordId ?? "money",
        wordProgress: item.wordProgress ?? (legacyEntry || legacyProgress.completedSections.length ? { money: legacyProgress } : {}),
        bankbookEntries: item.bankbookEntries ?? (legacyEntry ? [legacyEntry] : []),
      };
    }),
  };
}
export class IndexedDbLearningStorage implements LearningStorage {
  private open(): Promise<IDBDatabase> { if (typeof indexedDB === "undefined") return Promise.reject(new Error("이 브라우저에서는 학습 기록을 저장할 수 없어요.")); return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error("학습 기록 저장소를 열 수 없어요.")); }); }
  async load() { const db = await this.open(); return new Promise<AppData>((resolve, reject) => { const tx = db.transaction(STORE, "readonly"); const request = tx.objectStore(STORE).get(KEY); request.onsuccess = () => resolve(normalizeAppData(request.result)); request.onerror = () => reject(new Error("학습 기록을 불러오지 못했어요.")); tx.oncomplete = () => db.close(); }); }
  async save(data: AppData) { const db = await this.open(); return new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(data, KEY); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(new Error("학습 기록을 저장하지 못했어요.")); }); }
  async clear() { const db = await this.open(); return new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).clear(); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(new Error("학습 기록을 삭제하지 못했어요.")); }); }
}
export type RemoteLearningStorage = LearningStorage;
