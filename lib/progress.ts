import { wordsForTopic } from "@/data/content";
import type { StudentRecord } from "@/lib/storage/types";

export function completedInTopic(student: StudentRecord, topicId: number): number {
  const completed = new Set(student.bankbookEntries.map((entry) => entry.wordId));
  return wordsForTopic(topicId).filter((word) => completed.has(word.id)).length;
}

export function topicUnlocked(student: StudentRecord, topicId: number): boolean {
  return topicId === 1 || completedInTopic(student, topicId - 1) === wordsForTopic(topicId - 1).length;
}
