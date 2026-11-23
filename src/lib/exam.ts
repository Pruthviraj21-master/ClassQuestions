export type QType = "mcq" | "short" | "long";
export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  type: QType;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  answer: string;
  marks: number;
  source?: string;
  topic?: string;
  reviewed?: boolean;
};

export type Paper = {
  id: string;
  title: string;
  subject: string;
  className: string;
  tuition: string;
  notes: string;
  minutes: number;
  questions: Question[];
  createdAt: number;
  teacher?: string;
  instructions?: string;
  logo?: string;
  warnings?: string[];
  publication?: { id: string; key: string; published?: boolean };
};

export type Attempt = {
  id: string;
  paperId: string;
  name: string;
  roll: string;
  phone: string;
  parentPhone: string;
  score: number;
  total: number;
  submittedAt: number;
};

const PAPERS = "patra.papers.v1";
const ATTEMPTS = "patra.attempts.v1";
const STUDIO = "patra.studio.v1";

export type Studio = { teacher: string; tuition: string };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadStudio(): Studio {
  return read<Studio>(STUDIO, { teacher: "", tuition: "Sunrise Tuition" });
}

export function saveStudio(s: Studio) {
  write(STUDIO, s);
}

export function listPapers(): Paper[] {
  return read<Paper[]>(PAPERS, []).sort((a, b) => b.createdAt - a.createdAt);
}

export function getPaper(id: string): Paper | undefined {
  return listPapers().find((p) => p.id === id);
}

export function savePaper(paper: Paper) {
  const all = listPapers().filter((p) => p.id !== paper.id);
  write(PAPERS, [paper, ...all]);
}

export function deletePaper(id: string) {
  write(
    PAPERS,
    listPapers().filter((p) => p.id !== id),
  );
}

export function listAttempts(paperId?: string): Attempt[] {
  const all = read<Attempt[]>(ATTEMPTS, []);
  return (paperId ? all.filter((a) => a.paperId === paperId) : all).sort(
    (a, b) => b.submittedAt - a.submittedAt,
  );
}

export function saveAttempt(a: Attempt) {
  write(ATTEMPTS, [a, ...listAttempts()]);
}

export const SAMPLE_NOTES = `Class 8 Science — Photosynthesis (as taught in class)

Plants make their own food. This process is called photosynthesis. It happens mainly in the leaves, inside chloroplasts, which contain the green pigment chlorophyll.

Raw materials: carbon dioxide from air (enters through stomata) and water from soil (absorbed by roots and carried by xylem). Sunlight is the energy source. Chlorophyll traps light energy.

Word equation:
Carbon dioxide + Water --(sunlight, chlorophyll)--> Glucose + Oxygen

Glucose is food. Some is used immediately for energy (respiration). Extra glucose is stored as starch. Oxygen is released into the air through stomata — this is why forests are called the lungs of the earth in our class discussion.

We tested a leaf for starch: boil the leaf, put it in alcohol (chlorophyll comes out, leaf turns pale), then add iodine. Blue-black colour means starch is present. A leaf kept in the dark for two days does not turn blue-black.

Factors that slow photosynthesis: less light, closed stomata on a very hot afternoon, lack of water, very low temperature.

Do not confuse photosynthesis with respiration. Respiration happens day and night in all living cells and releases energy from glucose. Photosynthesis happens only in green parts, only when light is available, and stores energy.`;

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function totalMarks(q: Question[]) {
  return q.reduce((s, x) => s + (Number(x.marks) || 0), 0);
}

export type PublishedPaper = Pick<Paper, "title" | "tuition" | "className" | "minutes"> & {
  instructions: string;
  questions: (Pick<
    Question,
    "id" | "type" | "difficulty" | "prompt" | "options" | "answer" | "marks"
  > & { topic: string })[];
};

export type QuizResult = {
  id: string;
  score: number;
  total: number;
  submittedAt: number;
  items: { topic: string; earned: number; total: number }[];
};

export function reviewProblem(question: Question, notes: string) {
  if (!question.source?.trim() || !notes.includes(question.source.trim())) {
    return "Paste an exact supporting excerpt from the notes.";
  }
  if (!question.prompt.trim() || !question.answer.trim())
    return "Enter a question and its correct answer.";
  if (!Number.isInteger(question.marks) || question.marks < 1 || question.marks > 20)
    return "Set marks between 1 and 20.";
  if (
    question.type === "mcq" &&
    (question.options.length !== 4 ||
      question.options.some((option) => !option.trim()) ||
      new Set(question.options.map((option) => option.trim().toLowerCase())).size !== 4 ||
      !question.options.some((option) => option.trim() === question.answer.trim()))
  ) {
    return "Enter four distinct options and make the answer match one.";
  }
  return "";
}
