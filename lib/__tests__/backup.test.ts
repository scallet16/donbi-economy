import { describe, expect, it } from "vitest";
import { isValidBackup } from "@/lib/backup";
import { emptyAppData, type BankbookEntry } from "@/lib/storage/types";

describe("백업과 통장 데이터", () => {
  it("현재 스키마 백업을 허용한다", () => expect(isValidBackup(emptyAppData())).toBe(true));
  it("스키마 버전이 다른 파일을 거부한다", () => expect(isValidBackup({ schemaVersion: 99, students: [] })).toBe(false));
  it("돈 통장 항목에 필요한 값을 기록한다", () => {
    const entry: BankbookEntry = { wordId: "money", word: "돈", definition: "물건을 살 때 쓰는 것", topicId: 1, level: "sprout", completedAt: "2026-07-23T00:00:00.000Z", status: "completed", relearnCount: 0 };
    expect(entry.status).toBe("completed"); expect(entry.definition).toContain("물건");
  });
});
