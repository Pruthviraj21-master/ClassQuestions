import { jsPDF } from "jspdf";
import { totalMarks, type Paper } from "./exam";

export async function downloadPaper(paper: Paper, includeKey: boolean) {
  const pdf = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const width = 210;
  const margin = 16;
  const right = width - margin;
  const bodyWidth = right - margin;
  const bottom = 278;
  let y = margin;

  pdf.setProperties({ title: paper.title, author: paper.teacher || paper.tuition });

  function space(height: number) {
    if (y + height <= bottom) return;
    pdf.addPage();
    y = margin;
  }

  function text(value: string, size = 11, bold = false, indent = 0) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor("#1c1915");
    const lineHeight = size * 0.44;
    const actualWidth = bodyWidth - indent;
    const x = margin + indent;
    if (/[^\x20-\x7e\n\t]/.test(value)) {
      const canvas = document.createElement("canvas");
      const scale = 6;
      canvas.width = Math.ceil(actualWidth * scale);
      canvas.height = Math.ceil(lineHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.font = `${bold ? "bold" : "normal"} ${(size * scale) / 2.835}px sans-serif`;
      ctx.fillStyle = "#1c1915";
      ctx.textBaseline = "middle";
      for (const paragraph of value.split("\n")) {
        let line = "";
        const draw = () => {
          space(lineHeight);
          if (line.trim()) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillText(line.trimEnd(), 0, canvas.height / 2);
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, actualWidth, lineHeight);
          }
          y += lineHeight;
          line = "";
        };
        for (const word of paragraph.match(/\S+\s*|\s+/g) ?? []) {
          if (ctx.measureText((line + word).trimEnd()).width <= canvas.width) {
            line += word;
            continue;
          }
          if (line) draw();
          for (const character of word) {
            if (ctx.measureText((line + character).trimEnd()).width > canvas.width) draw();
            line += character;
          }
        }
        draw();
      }
      return;
    }
    const lines = pdf.splitTextToSize(value, actualWidth) as string[];
    for (const line of lines) {
      space(lineHeight);
      pdf.text(line, x, y + size * 0.35);
      y += lineHeight;
    }
  }

  function rule(color = "#e4d9c8") {
    space(1);
    pdf.setDrawColor(color);
    pdf.line(margin, y, right, y);
  }

  if (paper.logo) {
    const info = pdf.getImageProperties(paper.logo);
    const scale = Math.min(33 / info.width, 20 / info.height);
    pdf.addImage(paper.logo, "PNG", margin, y, info.width * scale, info.height * scale);
    y += info.height * scale + 4;
  }
  if (paper.tuition) text(paper.tuition, 12, true);
  text(paper.title, 23, true);
  y += 2;
  text(
    [
      paper.className,
      paper.subject,
      paper.minutes + " minutes",
      totalMarks(paper.questions) + " marks",
    ]
      .filter(Boolean)
      .join("  |  "),
  );
  if (paper.teacher) text("Teacher: " + paper.teacher);
  y += 4;
  rule("#2f6b4f");
  y += 5;
  text("Name: ____________________________   Roll no.: ____________   Date: ____________");
  y += 4;
  if (paper.instructions?.trim()) {
    text("Instructions", 12, true);
    text(paper.instructions.trim());
    y += 3;
  }
  text("Marks distribution", 12, true);
  const formats = { mcq: "Multiple choice", short: "Short answer", long: "Long answer" };
  for (const format of Object.keys(formats) as Array<keyof typeof formats>) {
    const items = paper.questions.filter((q) => q.type === format);
    if (items.length)
      text(
        formats[format] + "  |  " + items.length + " questions  |  " + totalMarks(items) + " marks",
        10,
      );
  }
  y += 5;

  for (const [i, q] of paper.questions.entries()) {
    space(q.type === "long" ? 62 : q.type === "short" ? 38 : 36);
    text(`${i + 1}. [${q.marks} ${q.marks === 1 ? "mark" : "marks"}] ${q.prompt}`, 11, true);
    if (q.type === "mcq") {
      q.options.forEach((option, index) =>
        text(`${String.fromCharCode(65 + index)}. ${option}`, 11, false, 5),
      );
      y += 2;
      text("Answer: ____________", 10, false, 5);
    } else {
      const lines = q.type === "long" ? 6 : 3;
      for (let line = 0; line < lines; line++) {
        space(8);
        y += 7;
        rule();
      }
    }
    y += 5;
  }

  if (includeKey) {
    pdf.addPage();
    y = margin;
    text("Teacher answer key", 22, true);
    text(paper.title);
    y += 5;
    rule("#2f6b4f");
    y += 4;
    for (const [i, q] of paper.questions.entries()) {
      space(18);
      const optionIndex = q.options.findIndex((option) => option.trim() === q.answer.trim());
      const option =
        q.type === "mcq" && optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) + ". " : "";
      text(`${i + 1}. [${q.marks}] ${option}${q.answer}`, 11, true);
      if (q.source) text("Source: " + q.source, 9, false, 4);
      y += 3;
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor("#6f675c");
    pdf.text(`Page ${page} of ${pages}`, right, 287, { align: "right" });
  }
  const filename = paper.title.replace(/[<>:"/\\|?*]/g, "-").trim() || "paper";
  pdf.save(filename + (includeKey ? "-teacher.pdf" : "-student.pdf"));
}
