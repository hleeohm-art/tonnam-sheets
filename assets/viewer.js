// หน้าเปิดดูชีต: ใช้ pdf.js แสดง PDF ให้อ่านได้ทุกเครื่อง (รวมมือถือ Android ที่ปกติจะบังคับดาวน์โหลด)
import * as pdfjsLib from "./pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./pdfjs/pdf.worker.min.mjs", import.meta.url).href;

const statusEl = document.getElementById("status");
const pagesEl = document.getElementById("pages");
const titleEl = document.getElementById("title");
const downloadEl = document.getElementById("download");
const backEl = document.getElementById("back");
const zoomEl = document.getElementById("zoom");
const zoomLevelEl = document.getElementById("zoom-level");

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
let zoomIndex = ZOOMS.indexOf(1);

function prettyTitle(fileName) {
  return fileName.normalize("NFC").replace(/\.pdf$/i, "").replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
}

function showError(message, directHref) {
  statusEl.hidden = false;
  statusEl.innerHTML = "";
  const p = document.createElement("div");
  p.textContent = message;
  statusEl.append(p);
  if (directHref) {
    const a = document.createElement("a");
    a.className = "btn";
    a.href = directHref;
    a.textContent = "เปิดไฟล์ PDF โดยตรง";
    statusEl.append(a);
  }
  const home = document.createElement("a");
  home.className = "btn";
  home.href = "./";
  home.textContent = "กลับหน้าแรก";
  home.style.marginLeft = "8px";
  statusEl.append(home);
}

// กดกลับแล้วให้กลับไปตำแหน่งเดิมในหน้าแรก (ถ้ามาจากหน้าแรก)
backEl.addEventListener("click", (e) => {
  if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

const file = new URLSearchParams(location.search).get("file") || "";

// อนุญาตเฉพาะไฟล์ PDF ในโฟลเดอร์ sheets/ เท่านั้น
if (!/^sheets\/.+\.pdf$/i.test(file) || file.split("/").includes("..")) {
  titleEl.textContent = "ไม่พบชีต";
  showError("ลิงก์นี้ไม่ถูกต้อง หรือชีตถูกย้ายไปแล้ว");
} else {
  const href = file.split("/").map(encodeURIComponent).join("/");
  const name = file.split("/").pop();
  const title = prettyTitle(name);
  titleEl.textContent = title;
  document.title = title + " · คลังชีตสรุป ต้นน้ำ";
  downloadEl.href = href;
  downloadEl.setAttribute("download", name);
  if (window.track) {
    window.track("เปิดดู: " + title, "เปิดดูชีต");
    downloadEl.addEventListener("click", () => window.track("ดาวน์โหลด: " + title, "ดาวน์โหลดชีต", true));
  }
  open(href).catch((err) => {
    console.error(err);
    showError("เปิดชีตในหน้านี้ไม่สำเร็จ ลองเปิดไฟล์โดยตรงแทนนะ", href);
  });
}

async function open(href) {
  const pdf = await pdfjsLib.getDocument({
    url: href,
    cMapUrl: "assets/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "assets/pdfjs/standard_fonts/",
  }).promise;

  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const el = document.createElement("div");
    el.className = "page";
    el.setAttribute("aria-label", `หน้า ${n} จาก ${pdf.numPages}`);
    pagesEl.append(el);
    pages.push({ page, el, base: page.getViewport({ scale: 1 }), rendered: 0, task: null });
  }
  statusEl.hidden = true;
  zoomEl.hidden = false;

  let layoutVersion = 0;

  function layout() {
    layoutVersion++;
    const fit = Math.min(document.documentElement.clientWidth - 24, 1000);
    const z = ZOOMS[zoomIndex];
    zoomLevelEl.textContent = Math.round(z * 100) + "%";
    for (const p of pages) {
      p.scale = (fit * z) / p.base.width;
      p.el.style.width = Math.round(p.base.width * p.scale) + "px";
      p.el.style.height = Math.round(p.base.height * p.scale) + "px";
    }
    for (const p of pages) if (p.visible) render(p);
  }

  async function render(p) {
    if (p.rendered === layoutVersion) return;
    p.rendered = layoutVersion;
    if (p.task) p.task.cancel();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let scale = p.scale * dpr;
    // จำกัดขนาดภาพไม่ให้ใหญ่เกินจนมือถือค้าง
    const maxPixels = 12e6;
    const area = p.base.width * p.base.height * scale * scale;
    if (area > maxPixels) scale *= Math.sqrt(maxPixels / area);

    const viewport = p.page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    p.task = p.page.render({ canvasContext: canvas.getContext("2d"), viewport });
    try {
      await p.task.promise;
      p.el.replaceChildren(canvas);
    } catch (err) {
      if (err && err.name !== "RenderingCancelledException") console.error(err);
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const p = pages.find((x) => x.el === entry.target);
        p.visible = entry.isIntersecting;
        if (p.visible) render(p);
      }
    },
    { rootMargin: "800px 0px" }
  );

  layout();
  pages.forEach((p) => io.observe(p.el));

  document.getElementById("zoom-in").addEventListener("click", () => {
    if (zoomIndex < ZOOMS.length - 1) { zoomIndex++; layout(); }
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    if (zoomIndex > 0) { zoomIndex--; layout(); }
  });

  // จอหมุน/เปลี่ยนความกว้าง -> จัดหน้าใหม่ (ไม่สนแค่ความสูงเปลี่ยนจากแถบที่อยู่เบราว์เซอร์)
  let lastWidth = document.documentElement.clientWidth;
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const w = document.documentElement.clientWidth;
      if (w !== lastWidth) { lastWidth = w; layout(); }
    }, 200);
  });
}
