// ตัวนับสถิติผู้เข้าชม (GoatCounter) — ไม่ใช้ cookie และไม่เก็บข้อมูลส่วนตัว
// ดูสถิติได้ที่ https://<CODE>.goatcounter.com
(function () {
  "use strict";

  var CODE = ""; // ชื่อ code ที่สมัครไว้กับ GoatCounter (เว้นว่าง = ปิดตัวนับ)

  var queue = [];

  // นับหนึ่งครั้ง: track("ชื่อหน้า", "คำอธิบาย", true ถ้าเป็นการกดปุ่ม)
  window.track = function (path, title, isEvent) {
    if (!CODE) return;
    var hit = { path: path, title: title, event: !!isEvent };
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(hit);
    else queue.push(hit);
  };

  if (!CODE) return;

  var script = document.currentScript;
  window.goatcounter = {
    endpoint: "https://" + CODE + ".goatcounter.com/count",
    // หน้าเปิดอ่านชีตนับเองด้วยชื่อชีต แทนการนับจากที่อยู่หน้าเว็บ
    no_onload: !!(script && script.hasAttribute("data-manual")),
  };

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.onload = function () {
    queue.splice(0).forEach(function (hit) { window.goatcounter.count(hit); });
  };
  document.head.appendChild(s);
})();
