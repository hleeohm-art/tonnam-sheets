// สร้างไฟล์ sheets.json จากไฟล์ PDF ทั้งหมดในโฟลเดอร์ sheets/
// GitHub Actions เรียกสคริปต์นี้อัตโนมัติทุกครั้งที่มีการอัปโหลดไฟล์ใหม่
// ถ้าอยากลองในเครื่อง: node scripts/build-index.mjs

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const SHEETS_DIR = join(ROOT, "sheets");

// ลำดับวิชาบนหน้าแรก — ชื่อโฟลเดอร์ (id) ต้องตรงกับโฟลเดอร์ใน sheets/
const SUBJECTS = [
  { id: "science", name: "วิทยาศาสตร์", icon: "🔬" },
  { id: "math", name: "คณิตศาสตร์", icon: "📐" },
  { id: "english", name: "ภาษาอังกฤษ", icon: "🔤" },
  { id: "social", name: "สังคมศึกษา", icon: "🌏" },
  { id: "thai", name: "ภาษาไทย", icon: "📖" },
  { id: "other", name: "อื่นๆ", icon: "📦" },
];
const FALLBACK = "other";

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(full));
    else if (entry.name.toLowerCase().endsWith(".pdf")) out.push(full);
  }
  return out;
}

// "ระบบร่างกาย_บทที่-1.pdf" -> "ระบบร่างกาย บทที่ 1"
function prettyTitle(fileName) {
  return fileName
    .normalize("NFC")
    .replace(/\.pdf$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// วันที่อัปโหลด/แก้ไขล่าสุดจากประวัติ git (ถ้าไม่มี git ใช้เวลาของไฟล์แทน)
function lastUpdated(file) {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    if (iso) return iso;
  } catch {}
  return statSync(file).mtime.toISOString();
}

const bySubject = Object.fromEntries(SUBJECTS.map((s) => [s.id, []]));

for (const file of walk(SHEETS_DIR)) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const parts = relative(SHEETS_DIR, file).split(sep);
  const folder = parts.length > 1 ? parts[0].toLowerCase() : FALLBACK;
  const subject = bySubject[folder] ? folder : FALLBACK;
  bySubject[subject].push({
    title: prettyTitle(parts[parts.length - 1]),
    path: rel,
    size: statSync(file).size,
    updated: lastUpdated(file),
  });
}

const collator = new Intl.Collator("th", { numeric: true });
const data = {
  generatedAt: new Date().toISOString(),
  subjects: SUBJECTS.map((s) => ({
    ...s,
    sheets: bySubject[s.id].sort((a, b) => collator.compare(a.title, b.title)),
  })),
};

writeFileSync(join(ROOT, "sheets.json"), JSON.stringify(data, null, 2) + "\n");
const total = data.subjects.reduce((n, s) => n + s.sheets.length, 0);
console.log(`สร้าง sheets.json แล้ว: ${total} ชีต`);
for (const s of data.subjects) console.log(`  ${s.name}: ${s.sheets.length}`);
