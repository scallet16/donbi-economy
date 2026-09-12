import { describe, expect, it } from "vitest";
import { allWordContents } from "@/data/content";
import { completedInTopic, topicUnlocked } from "@/lib/progress";
import { normalizeAppData } from "@/lib/storage/indexedDb";
import { emptyWordProgress, type BankbookEntry, type StudentRecord } from "@/lib/storage/types";

const student = (entries: BankbookEntry[]): StudentRecord => ({
  id: "student", displayName: "학생", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  currentScreen: "home", currentTopicId: 1, currentWordId: "money", wordProgress: {}, bankbookEntries: entries,
});
const entry = (wordId: string): BankbookEntry => {
  const word = allWordContents.find((item) => item.id === wordId)!;
  return { wordId, word: word.word, definition: word.easyDefinition, topicId: word.topicId, level: "sprout", completedAt: "2026-01-01", status: "completed", relearnCount: 0 };
};

describe("단어별 진행과 순차 주제 해제", () => {
  it("1주제의 세 단어를 모두 저장해야 2주제가 열린다", () => {
    expect(topicUnlocked(student([]), 1)).toBe(true);
    expect(topicUnlocked(student([entry("money"), entry("cash")]), 2)).toBe(false);
    const complete = student([entry("money"), entry("cash"), entry("card")]);
    expect(completedInTopic(complete, 1)).toBe(3);
    expect(topicUnlocked(complete, 2)).toBe(true);
  });

  it("기존 돈 단일 기록을 새 누적 통장과 단어 진행으로 옮긴다", () => {
    const migrated = normalizeAppData({
      schemaVersion: 1,
      activeStudentId: "old",
      settings: {},
      students: [{
        id: "old", displayName: "기존 학생", createdAt: "2026-01-01", updatedAt: "2026-01-01",
        currentScreen: "learn", currentSection: 4, completedSections: [0, 1, 2, 3, 4],
        selectedLevel: "sprout", writingCompleted: true, checkResult: { correct: 3, total: 3, attempts: 1 },
        bankbookEntry: entry("money"),
      }],
    });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.students[0].bankbookEntries.map((item) => item.wordId)).toEqual(["money"]);
    expect(migrated.students[0].wordProgress.money.completedSections).toEqual([0, 1, 2, 3, 4]);
  });

  it("모든 단어가 독립된 5단계 진행 기록을 가질 수 있다", () => {
    expect(allWordContents).toHaveLength(20);
    for (const word of allWordContents) {
      const progress = { ...emptyWordProgress(), completedSections: [0, 1, 2, 3, 4] };
      expect(progress.completedSections).toHaveLength(5);
      expect(word.easyDefinition.length).toBeGreaterThan(0);
    }
  });
});
