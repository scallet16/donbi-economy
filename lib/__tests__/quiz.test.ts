import { describe, expect, it } from "vitest";
import { arrangeQuizOptions, quizSpeechText } from "@/lib/quiz";

describe("활동 문제 보기와 읽어주기", () => {
  it("정답 위치가 문제마다 달라지고 정답 정보가 함께 이동한다", () => {
    const options = ["정답", "보기 둘", "보기 셋"];
    const first = arrangeQuizOptions(options, 0, 0);
    const second = arrangeQuizOptions(options, 0, 1);
    const third = arrangeQuizOptions(options, 0, 2);

    expect([first.correct, second.correct, third.correct]).toEqual([0, 1, 2]);
    for (const quiz of [first, second, third]) expect(quiz.options[quiz.correct]).toBe("정답");
  });

  it("문제와 모든 보기를 번호와 함께 읽는 문장을 만든다", () => {
    expect(quizSpeechText("맞는 단어를 골라보세요", ["돈", "현금"])).toBe(
      "맞는 단어를 골라보세요. 보기를 들어보세요. 1번. 돈. 2번. 현금.",
    );
  });
});
