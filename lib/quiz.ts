export type ArrangedQuiz = {
  options: string[];
  correct: number;
};

export function arrangeQuizOptions(options: readonly string[], wordOrder: number, questionOrder: number): ArrangedQuiz {
  if (options.length < 2) return { options: [...options], correct: 0 };

  const arranged = options.slice(1);
  const correct = (wordOrder + questionOrder) % options.length;
  arranged.splice(correct, 0, options[0]);
  return { options: arranged, correct };
}

export function quizSpeechText(title: string, options: readonly string[]) {
  const choices = options.map((option, index) => `${index + 1}번. ${option}`).join(". ");
  return `${title}. 보기를 들어보세요. ${choices}.`;
}
