/* 题库管理 - 编辑 / 增删 / 导入导出（纯前端，导出后替换 questions.json 重新部署） */
const TYPE_LABEL = { single: "单选题", multiple: "多选题", judge: "判断题", fill: "填空题" };
const OPT_RE = /^([A-Fa-f])[.、．]\s*(.*)$/;
let DATA = { title: "党校考试题库", questions: [] };
let visible = 100;

function init() {
  if (!window.QUESTIONS || !window.QUESTIONS.questions) {
    alert("题库未加载：请确认 questions.js 与本页在同一文件夹。");
    return;
  }
  DATA = window.QUESTIONS;
  bind();
  render();
}
function bind() {
  $("fType").onchange = () => { visible = 100; render(); };
  $("fReview").onchange = () => { visible = 100; render(); };
  $("fSearch").oninput = () => { visible = 100; render(); };
  $("addBtn").onclick = addQuestion;
  $("exportBtn").onclick = exportJSON;
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = importJSON;
}
const $ = (id) => document.getElementById(id);

function filtered() {
  const t = $("fType").value, rev = $("fReview").checked, kw = $("fSearch").value.trim();
  return DATA.questions.filter((q) => {
    if (t !== "all" && q.type !== t) return false;
    if (rev && !q.review) return false;
    if (kw && !q.stem.includes(kw)) return false;
    return true;
  });
}

function render() {
  const arr = filtered();
  $("cnt").textContent = "共 " + arr.length + " 题";
  const box = $("list"); box.innerHTML = "";
  arr.slice(0, visible).forEach((q) => box.appendChild(card(q)));
  if (arr.length > visible) {
    const b = document.createElement("button");
    b.className = "btn ghost"; b.textContent = "加载更多";
    b.onclick = () => { visible += 100; render(); };
    const p = document.createElement("div"); p.className = "panel"; p.style.textAlign = "center"; p.appendChild(b);
    box.appendChild(p);
  }
}

function card(q) {
  const p = document.createElement("div"); p.className = "panel";
  // 题型
  const typeSel = document.createElement("select");
  ["single", "multiple", "judge", "fill"].forEach((t) => {
    const o = document.createElement("option"); o.value = t; o.textContent = TYPE_LABEL[t];
    if (t === q.type) o.selected = true; typeSel.appendChild(o);
  });
  // 题干
  const stem = document.createElement("textarea"); stem.rows = 2; stem.style.width = "100%"; stem.value = q.stem;
  // 选项
  const opt = document.createElement("textarea"); opt.rows = Math.max(2, (q.options || []).length);
  opt.style.width = "100%"; opt.placeholder = "选择题每行一个选项";
  opt.value = (q.options || []).map((o) => o.key + "." + o.text).join("\n");
  // 答案
  const ans = document.createElement("input"); ans.type = "text"; ans.style.width = "100%";
  ans.value = q.answer || "";
  // 待核对标记
  const rev = document.createElement("input"); rev.type = "checkbox"; rev.checked = !!q.review;
  rev.title = "待核对";

  const head = document.createElement("div"); head.className = "row wrap"; head.style.justifyContent = "space-between";
  head.innerHTML = '<b style="font-size:13px">#' + (DATA.questions.indexOf(q) + 1) + "</b>";
  const right = document.createElement("div"); right.className = "row";
  const tl = document.createElement("span"); tl.className = "lab"; tl.textContent = "题型";
  right.appendChild(tl); right.appendChild(typeSel);
  const rl = document.createElement("label"); rl.className = "lab"; rl.style.display = "flex"; rl.style.alignItems = "center"; rl.style.gap = "4px";
  rl.appendChild(rev); rl.appendChild(document.createTextNode("待核对"));
  right.appendChild(rl); head.appendChild(right);

  const lab1 = document.createElement("div"); lab1.className = "lab"; lab1.textContent = "题干";
  const lab2 = document.createElement("div"); lab2.className = "lab"; lab2.textContent = "选项（选择题）";
  const lab3 = document.createElement("div"); lab3.className = "lab"; lab3.textContent = "答案";

  const save = document.createElement("button"); save.className = "btn sm"; save.textContent = "保存";
  const del = document.createElement("button"); del.className = "btn ghost sm"; del.textContent = "删除";
  const row = document.createElement("div"); row.className = "row wrap"; row.style.marginTop = "8px";
  row.appendChild(save); row.appendChild(del);

  p.appendChild(head); p.appendChild(lab1); p.appendChild(stem);
  p.appendChild(lab2); p.appendChild(opt); p.appendChild(lab3); p.appendChild(ans); p.appendChild(row);

  const apply = () => {
    q.type = typeSel.value;
    q.stem = stem.value.trim();
    q.review = rev.checked;
    if (q.type === "single" || q.type === "multiple") {
      const opts = []; let auto = 0;
      opt.value.split("\n").forEach((ln) => {
        ln = ln.trim(); if (!ln) return;
        const m = OPT_RE.exec(ln);
        if (m) opts.push({ key: m[1].toUpperCase(), text: m[2].trim() });
        else opts.push({ key: String.fromCharCode(65 + auto), text: ln });
        auto++;
      });
      q.options = opts; q.answer = ans.value.trim().toUpperCase();
    } else if (q.type === "judge") {
      q.answer = ans.value.trim(); q.options = [];
    } else {
      q.answer = ans.value.trim(); q.options = [];
    }
  };
  save.onclick = () => { apply(); alert("已保存到内存，记得点“导出题库 JSON”下载并重新部署。"); };
  del.onclick = () => { if (confirm("确定删除这题？")) { DATA.questions.splice(DATA.questions.indexOf(q), 1); render(); } };
  return p;
}

function addQuestion() {
  DATA.questions.unshift({ type: "single", stem: "", options: [{ key: "A", text: "" }, { key: "B", text: "" }], answer: "", review: true });
  visible = 100; render();
  window.scrollTo(0, 0);
}

function exportJSON() {
  // 导出为 questions.js（window.QUESTIONS = ...），直接覆盖文件夹里的同名文件即可生效
  const js = "window.QUESTIONS = " + JSON.stringify(DATA, null, 1) + ";\n";
  const blob = new Blob([js], { type: "application/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "questions.js"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importJSON(e) {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try { DATA = JSON.parse(rd.result); render(); alert("导入成功，可继续编辑后导出。"); }
    catch (err) { alert("JSON 解析失败：" + err.message); }
  };
  rd.readAsText(f);
}

init();
