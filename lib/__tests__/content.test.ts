import { describe, expect, it } from "vitest";
import {
  adjacentTopicWordIndex,
  dictionaryWords,
  FIXED_DEFINITIONS,
  FIXED_TOPICS,
  moneyWord,
  topicOneWords,
  topics,
} from "@/data/content";

const EXPECTED_TOPICS = [
  { id: 1, prompt: "💰 돈은 어떻게 생겼고, 어떻게 쓸까?", words: ["돈", "현금", "카드"] },
  { id: 2, prompt: "🛒 어디에서, 어떻게 물건을 살까?", words: ["장보기", "마트", "인터넷 쇼핑", "키오스크"] },
  { id: 3, prompt: "🔢 물건의 이름과 수, 값은 어떻게 알까?", words: ["상품", "가격", "수량", "총금액"] },
  { id: 4, prompt: "💳 물건을 사고 돈을 낼 때 생기는 일", words: ["지불", "영수증", "소비"] },
  { id: 5, prompt: "🧠 똑똑하게 아껴 쓰는 방법", words: ["할인", "1+1", "싸다", "아끼다"] },
  { id: 6, prompt: "🔄 물건을 바꾸거나 돈을 돌려받을 땐?", words: ["환불", "교환"] },
] as const;

const EXPECTED_DEFINITIONS = {
  "돈": "물건을 살 때 쓰는 것",
  "현금": "실제 돈 (동전, 지폐)",
  "카드": "돈을 대신해 물건을 살 때 쓰는 플라스틱 카드\n(예: 신용카드, 체크카드 등)",
  "장보기": "집에 필요한 물건이나 먹을 것을 사러 가는 일",
  "마트": "필요한 물건을 살 수 있는 가게",
  "인터넷 쇼핑": "마트에 가지 않고 컴퓨터나 휴대폰으로 물건을 사는 것",
  "키오스크": "손가락으로 눌러서 물건을 사거나 주문하는 기계",
  "상품": "사람들에게 팔기 위해 마트에 진열된 물건",
  "가격": "물건을 사기 위해 내야 하는 돈",
  "수량": "물건의 개수나 양",
  "총금액": "물건 가격을 모두 더한 돈",
  "지불": "돈이나 카드로 계산하는 것",
  "영수증": "물건을 사고 돈을 낸 증거 종이",
  "소비": "돈을 써서 물건을 사거나 쓰는 것",
  "할인": "원래 가격보다 싸게 파는 것",
  "1+1": "하나 사면 하나 더 주는 것",
  "아끼다": "돈이나 물건 등을 소중히 쓰고, 함부로 쓰기 않는 것",
  "싸다": "가격이 저렴한 것, 값이 적게 드는 것",
  "환불": "산 물건을 돌려주고 돈을 다시 받는 것",
  "교환": "산 물건을 다른 것으로 바꾸는 것",
} as const;

describe("변경 금지 경제사전 고정 콘텐츠", () => {
  it("주제 6개의 안내 문구와 단어 순서가 원문과 정확히 일치한다", () => {
    expect(FIXED_TOPICS).toEqual(EXPECTED_TOPICS);
    expect(FIXED_TOPICS).toHaveLength(6);
  });

  it("전체 단어가 정확히 20개이며 중복이 없다", () => {
    const words = FIXED_TOPICS.flatMap((topic) => topic.words);
    expect(words).toHaveLength(20);
    expect(new Set(words).size).toBe(20);
  });

  it("20개 쉬운 뜻이 줄바꿈을 포함해 원문과 정확히 일치한다", () => {
    expect(FIXED_DEFINITIONS).toEqual(EXPECTED_DEFINITIONS);
    expect(Object.keys(FIXED_DEFINITIONS)).toHaveLength(20);
  });

  it("화면용 주제 데이터가 고정 원본에서 같은 순서로 파생된다", () => {
    expect(topics.map(({ id, prompt, words }) => ({ id, prompt, words }))).toEqual(FIXED_TOPICS);
    expect(dictionaryWords.map((item) => item.word)).toEqual(FIXED_TOPICS.flatMap((topic) => topic.words));
    expect(dictionaryWords.every((item) => item.easyDefinition === FIXED_DEFINITIONS[item.word])).toBe(true);
  });

  it("1주제 화면·인쇄·음성 데이터가 같은 고정 원본을 참조한다", () => {
    expect(topicOneWords.map((item) => item.word)).toEqual(FIXED_TOPICS[0].words);
    for (const item of topicOneWords) {
      expect(item.easyDefinition).toBe(FIXED_DEFINITIONS[item.word]);
      expect(item.speech.word).toBe(item.word);
      expect(item.speech.definition).toBe(FIXED_DEFINITIONS[item.word]);
    }
    expect(moneyWord).toBe(topicOneWords[0]);
  });

  it("1주제만 활성화되어 있다", () => {
    expect(topics.filter((topic) => topic.available).map((topic) => topic.id)).toEqual([1]);
  });

  it("단어 이동은 고정 순서를 따르고 양 끝을 넘지 않는다", () => {
    expect(adjacentTopicWordIndex(0, -1)).toBe(0);
    expect(adjacentTopicWordIndex(0, 1)).toBe(1);
    expect(adjacentTopicWordIndex(1, 1)).toBe(2);
    expect(adjacentTopicWordIndex(2, 1)).toBe(2);
  });
});
