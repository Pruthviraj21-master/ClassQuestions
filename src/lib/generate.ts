import { uid, type Difficulty, type Question } from "./exam";

type Settings = {
  notes: string;
  count: number;
  mix: "mcq" | "mixed" | "long";
  difficulty: Difficulty | "mixed";
};

export function generateQuestions({ notes, count, mix, difficulty }: Settings) {
  const fragments = [
    ...new Set(
      notes
        .trim()
        .split(/(?<=[.!?])\s+|\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
  const unclear: string[] = [];
  let topic = "";
  const candidates = fragments.flatMap((source) => {
    if (source.length <= 85 && source.endsWith(":")) {
      topic = source.slice(0, -1);
      return [];
    }
    const match = source.match(/^(.*\S)\s+([\p{L}\p{N}][\p{L}\p{N}-]*)[.!]$/u);
    if (
      !match ||
      source.length > 400 ||
      match[1].split(/\s+/).length < 4 ||
      match[2].length < 3 ||
      /\?|\b(?:tbd|unclear|maybe|todo|not sure)\b/i.test(source)
    ) {
      unclear.push(source);
      return [];
    }
    const stem = match[1];
    return [
      { source, stem, answer: match[2], topic: topic || stem.split(/\s+/).slice(0, 5).join(" ") },
    ];
  });
  const stemCounts = new Map<string, number>();
  for (const { stem } of candidates) {
    const key = stem.toLowerCase();
    stemCounts.set(key, (stemCounts.get(key) ?? 0) + 1);
  }
  const facts = candidates.filter(({ source, stem }) => {
    if (stemCounts.get(stem.toLowerCase()) === 1) return true;
    unclear.push(source);
    return false;
  });
  const answers = [...new Map(facts.map(({ answer }) => [answer.toLowerCase(), answer])).values()];
  const questions: Question[] = [];
  for (const { source, stem, answer, topic: label } of facts) {
    if (questions.length >= count) break;
    const level =
      difficulty === "mixed"
        ? (["easy", "medium", "hard"] as const)[questions.length % 3]
        : difficulty;
    const type =
      mix === "mcq" || (mix === "mixed" && questions.length % 2 === 0 && answers.length >= 4)
        ? "mcq"
        : level === "hard"
          ? "long"
          : "short";
    if (type === "mcq" && answers.length < 4) break;
    const options =
      type === "mcq"
        ? [
            answer,
            ...answers.filter((term) => term.toLowerCase() !== answer.toLowerCase()).slice(0, 3),
          ].sort((a, b) => a.localeCompare(b))
        : [];
    questions.push({
      id: uid(),
      type,
      difficulty: level,
      options,
      source,
      topic: label.slice(0, 100),
      prompt:
        type === "long"
          ? "Write the complete statement: " + stem + " _____."
          : "Complete the statement: " + stem + " _____.",
      answer: type === "long" ? source : answer,
      marks: type === "mcq" ? 1 : type === "short" ? 2 : 3,
    });
  }
  const warnings: string[] = [];
  if (questions.length < count)
    warnings.push(
      "There were too few complete, distinct facts for the requested paper. Add more notes or review the shorter draft.",
    );
  if (unclear.length) {
    warnings.push(
      `Skipped ${unclear.length} unclear or unsupported ${unclear.length === 1 ? "excerpt" : "excerpts"}. Use complete statements and resolve conflicting details.`,
    );
    warnings.push(
      ...unclear
        .slice(0, 5)
        .map((excerpt) => (excerpt.length > 100 ? excerpt.slice(0, 97) + "…" : excerpt)),
    );
  }
  return { questions, warnings };
}
