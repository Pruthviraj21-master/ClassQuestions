import {
  listPapers,
  savePaper,
  SAMPLE_NOTES,
  type Paper,
  type Question,
} from "@/lib/exam";

/**
 * Demo sign-in for the local/offline build.
 *
 * Patra is a single-teacher, local-first app: everything lives in this device's
 * localStorage, so this gate is a friendly lock screen rather than a security
 * boundary. It exists so the dashboard can be opened with a known credential
 * instead of dropping straight into an empty page.
 *
 * The student quiz (`/exam/:paperId`) deliberately stays open — students reach
 * it from the QR code and never need the teacher login.
 */
export const DEMO_EMAIL = "teacher@patra.app";
export const DEMO_PASSWORD = "patra123";

const SESSION_KEY = "patra.session.v1";

export function isSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SESSION_KEY) === "teacher";
  } catch {
    return false;
  }
}

export function signIn(email: string, password: string): { ok: true } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  if (e !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    return { ok: false, error: "That email or password doesn't match. Use the demo details shown below." };
  }
  try {
    localStorage.setItem(SESSION_KEY, "teacher");
  } catch {
    return { ok: false, error: "This browser is blocking storage, so sign-in can't be remembered." };
  }
  seedDemoData();
  return { ok: true };
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Demo data                                                          */
/* ------------------------------------------------------------------ */

const SEED_KEY = "patra.seed.v1";

function q(
  id: string,
  type: Question["type"],
  difficulty: Question["difficulty"],
  prompt: string,
  answer: string,
  marks: number,
  options: string[] = [],
): Question {
  return { id, type, difficulty, prompt, options, answer, marks };
}

const DAY = 24 * 60 * 60 * 1000;

function demoPapers(): Paper[] {
  const now = Date.now();
  return [
    {
      id: "demo-paper-science",
      title: "Photosynthesis — Class Test",
      subject: "Science",
      className: "Class 8",
      tuition: "Sunrise Tuition",
      notes: SAMPLE_NOTES,
      minutes: 20,
      createdAt: now - 2 * DAY,
      questions: [
        q(
          "demo-sci-1",
          "mcq",
          "easy",
          "Which green pigment traps light energy during photosynthesis?",
          "Chlorophyll",
          1,
          ["Chlorophyll", "Glucose", "Starch", "Xylem"],
        ),
        q(
          "demo-sci-2",
          "mcq",
          "medium",
          "Carbon dioxide enters a leaf mainly through the:",
          "Stomata",
          1,
          ["Stomata", "Roots", "Xylem", "Chloroplasts"],
        ),
        q(
          "demo-sci-3",
          "short",
          "easy",
          "Write the word equation for photosynthesis.",
          "Carbon dioxide plus water gives glucose and oxygen in the presence of sunlight and chlorophyll",
          3,
        ),
        q(
          "demo-sci-4",
          "short",
          "medium",
          "Why does a leaf kept in the dark for two days not turn blue-black in the iodine test?",
          "Without light no starch is made, so iodine shows no blue-black colour",
          3,
        ),
        q(
          "demo-sci-5",
          "long",
          "hard",
          "Explain three factors that can slow down photosynthesis, using the examples discussed in class.",
          "Less light slows it down. Closed stomata on a hot afternoon reduce carbon dioxide entry. Lack of water and very low temperature also slow the process",
          5,
        ),
        q(
          "demo-sci-6",
          "mcq",
          "medium",
          "Photosynthesis differs from respiration because photosynthesis:",
          "Happens only in green parts and stores energy",
          1,
          [
            "Happens only in green parts and stores energy",
            "Happens day and night in all cells",
            "Releases energy from glucose",
            "Occurs only in the roots",
          ],
        ),
      ],
    },
    {
      id: "demo-paper-maths",
      title: "Fractions & Decimals — Practice Test",
      subject: "Maths",
      className: "Class 7",
      tuition: "Sunrise Tuition",
      notes:
        "Fractions, decimals, comparing and converting. A fraction has a numerator and a denominator. Equivalent fractions have the same value, e.g. 1/2 = 2/4 = 4/8. To add unlike fractions, find the LCM of the denominators. Decimal places tell us tenths, hundredths and thousandths. To convert a fraction to a decimal, divide the numerator by the denominator. 3/4 = 0.75, 1/5 = 0.2. Multiplying by 10 moves the decimal one place to the right.",
      minutes: 15,
      createdAt: now - 5 * DAY,
      questions: [
        q(
          "demo-math-1",
          "mcq",
          "easy",
          "Which fraction is equivalent to 3/4?",
          "6/8",
          1,
          ["6/8", "4/3", "3/8", "5/6"],
        ),
        q(
          "demo-math-2",
          "short",
          "easy",
          "Find 1/2 + 1/4.",
          "3/4",
          2,
        ),
        q(
          "demo-math-3",
          "short",
          "medium",
          "Convert 3/5 into a decimal.",
          "0.6",
          2,
        ),
        q(
          "demo-math-4",
          "mcq",
          "medium",
          "What is 0.7 written as a fraction in simplest form?",
          "7/10",
          1,
          ["7/10", "1/7", "70/100", "7/100"],
        ),
        q(
          "demo-math-5",
          "long",
          "hard",
          "A shopkeeper had 2 1/2 kg of sugar. He sold 3/4 kg. How much sugar is left? Show your steps.",
          "2 1/2 minus 3/4 equals 1 3/4 kg",
          5,
        ),
      ],
    },
    {
      id: "demo-paper-english",
      title: "Tenses & Active Voice — Class Test",
      subject: "English",
      className: "Class 9",
      tuition: "Sunrise Tuition",
      notes:
        "Tenses show time: present, past and future. Simple present is for habits and facts. Present continuous is for actions happening now, formed with am/is/are + ing. Simple past is for finished actions. Past continuous is for actions in progress in the past. Active voice: the subject does the action, e.g. 'The gardener waters the plants.' Passive voice: the plants are watered by the gardener. Change active to passive by making the object the subject and using the past participle after the correct form of be.",
      minutes: 15,
      createdAt: now - 8 * DAY,
      questions: [
        q(
          "demo-eng-1",
          "mcq",
          "easy",
          "Choose the correct simple present sentence.",
          "She walks to school every day",
          1,
          ["She walks to school every day", "She walk to school every day", "She is walk to school", "She walked tomorrow"],
        ),
        q(
          "demo-eng-2",
          "short",
          "easy",
          "Fill in the blank with the past continuous form: They ______ (play) cricket at 5 p.m. yesterday.",
          "were playing",
          2,
        ),
        q(
          "demo-eng-3",
          "short",
          "medium",
          "Change into passive voice: 'The gardener waters the plants.'",
          "The plants are watered by the gardener",
          3,
        ),
        q(
          "demo-eng-4",
          "mcq",
          "medium",
          "Which sentence is in the active voice?",
          "The students wrote the answers",
          1,
          ["The students wrote the answers", "The answers were written", "The answers were written by the students", "The answers had been written"],
        ),
        q(
          "demo-eng-5",
          "long",
          "hard",
          "Write four sentences about your school day using simple present, present continuous, simple past and future tense.",
          "Any four correct sentences, one per tense",
          5,
        ),
      ],
    },
  ];
}

export function seedDemoData() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(SEED_KEY)) return;
    const existing = new Set(listPapers().map((p) => p.id));
    const papers = demoPapers().filter((p) => !existing.has(p.id));
    if (papers.length) {
      for (const paper of papers) savePaper(paper);
    }
    localStorage.setItem(SEED_KEY, "1");
  } catch {
    /* storage unavailable — leave the app on its empty state */
  }
}
