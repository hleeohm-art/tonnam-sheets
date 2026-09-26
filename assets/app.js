(function () {
  "use strict";

  var NEW_DAYS = 14; // ชีตที่อัปโหลดภายในกี่วันจะมีป้าย "ใหม่"
  var COLORS = {
    science: "var(--c-science)",
    math: "var(--c-math)",
    english: "var(--c-english)",
    social: "var(--c-social)",
    thai: "var(--c-thai)",
    other: "var(--c-other)",
  };

  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';

  var listEl = document.getElementById("list");
  var chipsEl = document.getElementById("chips");
  var qEl = document.getElementById("q");
  var clearEl = document.getElementById("clear");
  var footEl = document.getElementById("foot");
  var toolbarEl = document.getElementById("toolbar");

  var subjects = [];
  var active = "all";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ค้นหาแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ และไม่สนช่องว่าง
  function norm(s) {
    return String(s).normalize("NFC").toLowerCase().replace(/\s+/g, "");
  }

  function encPath(p) {
    return p.split("/").map(encodeURIComponent).join("/");
  }

  function fmtSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function isNew(iso) {
    return Date.now() - new Date(iso).getTime() < NEW_DAYS * 86400000;
  }

  function highlight(title, q) {
    if (!q) return esc(title);
    var i = title.toLowerCase().indexOf(q.trim().toLowerCase());
    if (i < 0 || !q.trim()) return esc(title);
    var n = q.trim().length;
    return esc(title.slice(0, i)) + "<mark>" + esc(title.slice(i, i + n)) + "</mark>" + esc(title.slice(i + n));
  }

  function sheetHtml(s, q) {
    var href = encPath(s.path);
    var view = "viewer.html?file=" + encodeURIComponent(s.path);
    var fileName = s.path.split("/").pop();
    return (
      '<li class="sheet">' +
        '<a class="sheet-main" href="' + view + '">' +
          '<span class="sheet-thumb" aria-hidden="true"><b>PDF</b></span>' +
          '<span class="sheet-info">' +
            '<span class="sheet-title">' + highlight(s.title, q) + "</span>" +
            '<span class="sheet-meta">' +
              "<span>" + fmtSize(s.size) + "</span><span>" + fmtDate(s.updated) + "</span>" +
              (isNew(s.updated) ? '<span class="badge-new">ใหม่</span>' : "") +
            "</span>" +
          "</span>" +
        "</a>" +
        '<div class="sheet-actions">' +
          '<a class="btn btn-primary" href="' + view + '">' + ICON_EYE + "เปิดดู</a>" +
          '<a class="btn" href="' + href + '" download="' + esc(fileName) + '">' + ICON_DOWN + "ดาวน์โหลด</a>" +
        "</div>" +
      "</li>"
    );
  }

  function render() {
    var q = qEl.value;
    var nq = norm(q);
    clearEl.hidden = !q;

    var total = 0;
    var counts = { all: 0 };
    var filtered = subjects.map(function (sub) {
      var sheets = sub.sheets.filter(function (s) {
        return !nq || norm(s.title).indexOf(nq) >= 0;
      });
      counts[sub.id] = sheets.length;
      counts.all += sheets.length;
      return { sub: sub, sheets: sheets };
    });

    // ปุ่มหมวดวิชา
    var chips = [{ id: "all", name: "ทั้งหมด", icon: "" }].concat(subjects);
    chipsEl.innerHTML = chips.map(function (c) {
      var style = COLORS[c.id] ? ' style="--c:' + COLORS[c.id] + '"' : "";
      return (
        '<button type="button" class="chip" data-id="' + c.id + '" aria-pressed="' + (active === c.id) + '"' + style + ">" +
          (c.icon ? "<span>" + c.icon + "</span>" : "") + esc(c.name) + '<span class="n">' + counts[c.id] + "</span>" +
        "</button>"
      );
    }).join("");
    var activeChip = chipsEl.querySelector('[aria-pressed="true"]');
    if (activeChip) chipsEl.scrollLeft = Math.max(0, activeChip.offsetLeft - chipsEl.offsetLeft - (chipsEl.clientWidth - activeChip.offsetWidth) / 2);

    // รายการชีต
    var html = filtered.map(function (f) {
      if (active !== "all" && active !== f.sub.id) return "";
      if (nq && !f.sheets.length) return ""; // ตอนค้นหา ซ่อนวิชาที่ไม่มีผลลัพธ์
      total += f.sheets.length;
      var color = COLORS[f.sub.id] || COLORS.other;
      return (
        '<section class="subject" id="' + f.sub.id + '" style="--c:' + color + '">' +
          '<div class="subject-head">' +
            '<div class="subject-icon" aria-hidden="true">' + f.sub.icon + "</div>" +
            "<h2>" + esc(f.sub.name) + '</h2><span class="count">' + f.sheets.length + " ชีต</span>" +
          "</div>" +
          (f.sheets.length
            ? '<ul class="sheet-list">' + f.sheets.map(function (s) { return sheetHtml(s, q); }).join("") + "</ul>"
            : '<div class="empty"><span class="e-icon" aria-hidden="true">🌱</span><span><b>ยังไม่มีชีตในวิชานี้</b>เดี๋ยวมีมาเพิ่มเร็วๆ นี้นะ</span></div>') +
        "</section>"
      );
    }).join("");

    if (nq && total === 0) {
      html = '<div class="notice"><span class="e-icon" aria-hidden="true">🔍</span><strong>ไม่พบชีตที่ชื่อมีคำว่า “' + esc(q.trim()) + '”</strong>ลองพิมพ์คำอื่น หรือเลือก “ทั้งหมด”</div>';
    }
    listEl.innerHTML = html;
  }

  function setActive(id) {
    active = id;
    var url = id === "all" ? location.pathname + location.search : "#" + id;
    try { history.replaceState(null, "", url); } catch (e) {}
    render();
    window.scrollTo({ top: Math.min(window.scrollY, listEl.offsetTop - toolbarEl.offsetHeight), behavior: "smooth" });
  }

  chipsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (btn) setActive(btn.getAttribute("data-id"));
  });

  // นับสถิติการดาวน์โหลดแต่ละชีต
  listEl.addEventListener("click", function (e) {
    var a = e.target.closest("a[download]");
    if (a && window.track) window.track("ดาวน์โหลด: " + a.closest(".sheet").querySelector(".sheet-title").textContent, "ดาวน์โหลดชีต", true);
  });

  qEl.addEventListener("input", render);
  clearEl.addEventListener("click", function () {
    qEl.value = "";
    render();
    qEl.focus();
  });

  // เส้นใต้แถบค้นหาเมื่อเลื่อนหน้าจอ
  window.addEventListener("scroll", function () {
    toolbarEl.classList.toggle("stuck", toolbarEl.getBoundingClientRect().top <= 0 && window.scrollY > 0);
  }, { passive: true });

  fetch("sheets.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (data) {
      subjects = data.subjects || [];
      var fromHash = location.hash.slice(1);
      if (subjects.some(function (s) { return s.id === fromHash; })) active = fromHash;
      render();
      var all = [].concat.apply([], subjects.map(function (s) { return s.sheets; }));
      var fresh = all.filter(function (s) { return isNew(s.updated); }).length;
      document.getElementById("stat-total").textContent = "📄 " + all.length + " ชีต";
      document.getElementById("stat-subjects").textContent = "🗂️ " + subjects.length + " หมวด";
      document.getElementById("stat-new").textContent = fresh ? "✨ ใหม่ " + fresh + " ชีต" : "";
      if (data.generatedAt) footEl.textContent = "อัปเดตรายการล่าสุด " + fmtDate(data.generatedAt);
    })
    .catch(function () {
      listEl.innerHTML =
        '<div class="notice"><strong>โหลดรายการชีตไม่สำเร็จ</strong>ลองรีเฟรชหน้านี้อีกครั้ง</div>';
    });
})();
