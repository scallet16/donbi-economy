import type { LearningLevel } from "@/data/content";
export const SCHEMA_VERSION = 2;
export type Settings = { soundEnabled: boolean; effectsEnabled: boolean; reducedMotion: boolean; largeText: boolean; highContrast: boolean; speechRate: number };
export type CheckResult = { correct: number; total: number; attempts: number };
export type BankbookEntry = { wordId: string; word: string; definition: string; topicId: number; level: LearningLevel; completedAt: string; status: "completed"; relearnCount: number };
export type WordProgress = { currentSection: number; completedSections: number[]; selectedLevel: LearningLevel | null; writingCompleted: boolean; checkResult: CheckResult | null };
export type ScreenName = "start" | "home" | "topic" | "learn" | "bankbook" | "settings";
export type StudentRecord = { id: string; displayName: string; createdAt: string; updatedAt: string; currentScreen: ScreenName; currentTopicId: number; currentWordId: string; wordProgress: Record<string, WordProgress>; bankbookEntries: BankbookEntry[] };
export type AppData = { schemaVersion: number; activeStudentId: string | null; students: StudentRecord[]; settings: Settings };
export interface LearningStorage { load(): Promise<AppData>; save(data: AppData): Promise<void>; clear(): Promise<void> }
export const defaultSettings: Settings = { soundEnabled: true, effectsEnabled: true, reducedMotion: false, largeText: false, highContrast: false, speechRate: 0.9 };
export const emptyAppData = (): AppData => ({ schemaVersion: SCHEMA_VERSION, activeStudentId: null, students: [], settings: { ...defaultSettings } });
export const emptyWordProgress = (): WordProgress => ({ currentSection: 0, completedSections: [], selectedLevel: null, writingCompleted: false, checkResult: null });
