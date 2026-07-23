export type LearningLevel = "sprout" | "fruit";

export const FIXED_TOPICS = [
  { id: 1, prompt: "💰 돈은 어떻게 생겼고, 어떻게 쓸까?", words: ["돈", "현금", "카드"] },
  { id: 2, prompt: "🛒 어디에서, 어떻게 물건을 살까?", words: ["장보기", "마트", "인터넷 쇼핑", "키오스크"] },
  { id: 3, prompt: "🔢 물건의 이름과 수, 값은 어떻게 알까?", words: ["상품", "가격", "수량", "총금액"] },
  { id: 4, prompt: "💳 물건을 사고 돈을 낼 때 생기는 일", words: ["지불", "영수증", "소비"] },
  { id: 5, prompt: "🧠 똑똑하게 아껴 쓰는 방법", words: ["할인", "1+1", "싸다", "아끼다"] },
  { id: 6, prompt: "🔄 물건을 바꾸거나 돈을 돌려받을 땐?", words: ["환불", "교환"] },
] as const;

export const FIXED_DEFINITIONS = {
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

export type FixedWord = keyof typeof FIXED_DEFINITIONS;
export type WordContent = {
  id: string;
  topicId: number;
  word: FixedWord;
  easyDefinition: (typeof FIXED_DEFINITIONS)[FixedWord];
  examples: string[];
  speech: { word: FixedWord; definition: (typeof FIXED_DEFINITIONS)[FixedWord]; audioPath: string | null };
};

export const dictionaryWords = FIXED_TOPICS.flatMap((topic) =>
  topic.words.map((word) => ({
    topicId: topic.id,
    prompt: topic.prompt,
    word,
    easyDefinition: FIXED_DEFINITIONS[word],
  })),
);

export const topics = FIXED_TOPICS.map((topic) => ({
  ...topic,
  title: topic.prompt,
  available: topic.id === 1,
}));

const wordContent = (id: string, topicId: number, word: FixedWord, examples: string[]): WordContent => ({
  id,
  topicId,
  word,
  easyDefinition: FIXED_DEFINITIONS[word],
  examples,
  speech: { word, definition: FIXED_DEFINITIONS[word], audioPath: null },
});

export const moneyWord = wordContent("money", 1, "돈", [
  "돈을 내고 과자를 샀어요.",
  "사탕을 사기 위해 돈을 꺼냈어요.",
  "할머니께서 돈을 주셨어요.",
  "아빠가 일을 해서 돈을 벌어요.",
]);

export const topicOneWords: WordContent[] = [
  moneyWord,
  wordContent("cash", 1, "현금", ["가게에서 현금으로 계산했어요."]),
  wordContent("card", 1, "카드", ["카드를 단말기에 대고 계산했어요."]),
];

export function adjacentTopicWordIndex(current: number, direction: -1 | 1): number {
  return Math.max(0, Math.min(topicOneWords.length - 1, current + direction));
}

export const learningSections = ["만나기", "뜻 익히기", "활동하기", "써 보기", "확인·저장"] as const;
