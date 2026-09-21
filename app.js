/* 党校刷题 - 前端逻辑 v3（填空拆分：有空格=输入，无空格=阅读背诵） */
const TYPE_LABEL = { single: "单选题", multiple: "多选题", judge: "判断题", fill: "填空题", read: "阅读背诵" };
const WRONG_KEY = "dangxiao_wrong_v1";
const PROG_KEY = "dangxiao_prog_v1";

let ALL = [];
let list = [];
let pos = 0;
let mode = "seq";
let reviewMode = false;
let sel = [];
let sessionAnswered = new Set();
let correctCount = 0;
let wrong = new Set(JSON.parse(localStorage.getItem(WRONG_KEY) || "[]"));

function hashId(q) {
  const s = q.type + "|" + q.stem;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return "q" + h.toString(36);
}
const $ = (id) => document.getElementById(id);

function norm(s) {
  return (s || "").toString().replace(/[\s《》（）()""",，。、]/g, "").toLowerCase();
}
function fillCorrect(input, ans) {
  const a = norm(input);
  if (!a) return false;
  if (ans.includes("｜")) return ans.split("｜").some((p) => norm(p) === a);
  return norm(ans) === a;
}
// 判断是否是真正的填空题（有括号空格）
function isRealFill(q) {
  return q.type === "fill" && /[（(]\s*[)）]/.test(q.stem);
}

function init() {
  if (!window.QUESTIONS || !window.QUESTIONS.questions) {
    document.getElementById("ctrl").innerHTML = '<div class="empty">题库未加载。</div>';
    return;
  }
  ALL = window.QUESTIONS.questions || [];
  if (window.QUESTIONS.title) $("title").textContent = window.QUESTIONS.title + " · 刷题";
  refreshWrongCnt();
  bindEvents();
  showResume();
}

function bindEvents() {
  $("startBtn").onclick = () => startPractice(false);
  $("wrongBtn").onclick = () => startPractice(true);
  $("resetBtn").onclick = () => {
    if (confirm("确定清空本机刷题进度和错题本？")) {
      sessionAnswered.clear(); correctCount = 0; wrong.clear();
      localStorage.removeItem(WRONG_KEY); localStorage.removeItem(PROG_KEY);
      refreshWrongCnt(); updateStats(); showResume();
      $("quiz").style.display = "none"; $("statPanel").style.display = "none";
    }
  };
  $("resumeBtn").onclick = resumeProgress;
  $("clearProgBtn").onclick = () => { localStorage.removeItem(PROG_KEY); showResume(); };
  $("backBtn").onclick = () => {
    saveProgress();
    $("quiz").style.display = "none"; $("statPanel").style.display = "none";
    $("ctrl").style.display = "block"; showResume();
  };
  $("modeSeg").querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      mode = b.dataset.mode;
      $("modeSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    };
  });
  $("submitBtn").onclick = submit;
  $("nextBtn").onclick = () => { if (pos < list.length - 1) { pos++; render(); saveProgress(); } };
  $("prevBtn").onclick = () => { if (pos > 0) { pos--; render(); saveProgress(); } };
  $("typeSel").onchange = refreshWrongCnt;
}

function refreshWrongCnt() { $("wrongCnt").textContent = wrong.size; }

function saveProgress() {
  if (!list.length) { localStorage.removeItem(PROG_KEY); return; }
  const prog = {
    listIds: list.map(hashId),
    pos: pos,
    answered: [...sessionAnswered],
    correct: correctCount,
    type: $("typeSel").value,
    mode: mode,
    reviewMode: reviewMode
  };
  localStorage.setItem(PROG_KEY, JSON.stringify(prog));
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROG_KEY) || "null"); }
  catch (e) { return null; }
}
function showResume() {
  const p = loadProgress();
  const box = $("resumeBox");
  if (p && p.listIds && p.listIds.length) {
    $("resumeText").textContent =
      "上次做到第 " + (p.pos + 1) + " / " + p.listIds.length + " 题（已答 " + (p.answered ? p.answered.length : 0) + "）";
    box.style.display = "flex";
  } else {
    box.style.display = "none";
  }
}
function resumeProgress() {
  const p = loadProgress();
  if (!p || !p.listIds) return;
  list = p.listIds.map((id) => ALL.find((q) => hashId(q) === id)).filter(Boolean);
  if (!list.length) { startPractice(false); return; }
  pos = Math.min(p.pos || 0, list.length - 1);
  sessionAnswered = new Set(p.answered || []);
  correctCount = p.correct || 0;
  reviewMode = !!p.reviewMode;
  mode = p.mode || "seq";
  $("typeSel").value = p.type || "all";
  $("modeSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.mode === mode));
  $("emptyTip").style.display = "none";
  $("ctrl").style.display = "none";
  $("statPanel").style.display = "block"; $("quiz").style.display = "block";
  render(); updateStats();
}

function startPractice(asWrong) {
  reviewMode = asWrong;
  const t = $("typeSel").value;
  let pool = ALL.filter((q) => t === "all" || q.type === t || (t === "read" && q.type === "fill" && !isRealFill(q)) || (t === "fill" && q.type === "fill" && isRealFill(q)));
  if (asWrong) pool = pool.filter((q) => wrong.has(hashId(q)));
  if (!pool.length) {
    $("quiz").style.display = "none"; $("statPanel").style.display = "none";
    $("emptyTip").style.display = "block"; return;
  }
  $("emptyTip").style.display = "none";
  list = mode === "rand" ? pool.slice().sort(() => Math.random() - 0.5) : pool.slice();
  pos = 0; sessionAnswered.clear(); correctCount = 0;
  $("ctrl").style.display = "none";
  $("statPanel").style.display = "block"; $("quiz").style.display = "block";
  render(); updateStats(); saveProgress();
}

function render() {
  const q = list[pos];
  const id = hashId(q);
  sel = [];
  // 题型标签：填空题拆分
  let displayType = q.type;
  if (q.type === "fill") displayType = isRealFill(q) ? "fill" : "read";
  $("qType").className = "qtype qtype-" + displayType;
  $("qType").innerHTML = TYPE_LABEL[displayType] + (q.review ? '<span class="tag-review">待核对</span>' : "");
  $("qIdx").textContent = (reviewMode ? "错题 " : "") + "第 " + (pos + 1) + " / " + list.length + " 题";
  $("qStem").textContent = q.stem;
  const body = $("qBody"); body.innerHTML = "";
  const revealed = sessionAnswered.has(id);

  if (displayType === "fill") {
    // 真正的填空题：有输入框
    const inp = document.createElement("input");
    inp.type = "text"; inp.className = "fillinput"; inp.placeholder = "输入答案后点提交";
    inp.id = "fillInput"; body.appendChild(inp);
  } else if (displayType === "read") {
    // 阅读背诵：不需要输入，直接看句子
    const tip = document.createElement("div");
    tip.className = "read-tip";
    tip.textContent = "📖 阅读背诵题：读完后点下方【提交/看答案】标记已掌握";
    body.appendChild(tip);
  } else if (q.type === "judge") {
    ["对", "错"].forEach((k) => body.appendChild(optEl(q, k, k)));
  } else {
    q.options.forEach((o) => body.appendChild(optEl(q, o.key, o.text)));
  }
  if (revealed) reveal(q, id, false);
  else { $("feedback").className = "feedback"; $("submitBtn").disabled = false; $("nextBtn").disabled = true; }
  updateStats();
}

function optEl(q, key, text) {
  const div = document.createElement("div");
  div.className = "opt"; div.dataset.key = key;
  const k = document.createElement("div"); k.className = "k"; k.textContent = key;
  const t = document.createElement("div"); t.textContent = text;
  div.appendChild(k); div.appendChild(t);
  const multi = q.type === "multiple";
  div.onclick = () => {
    if (sessionAnswered.has(hashId(q))) return;
    if (multi) {
      const i = sel.indexOf(key);
      if (i >= 0) sel.splice(i, 1); else sel.push(key);
      div.classList.toggle("sel", i < 0);
    } else {
      sel = [key];
      document.querySelectorAll("#qBody .opt").forEach((o) => o.classList.toggle("sel", o.dataset.key === key));
    }
  };
  return div;
}

function submit() {
  const q = list[pos]; const id = hashId(q);
  if (sessionAnswered.has(id)) return;
  let userAns;
  let displayType = q.type;
  if (q.type === "fill") displayType = isRealFill(q) ? "fill" : "read";

  if (displayType === "read") {
    // 阅读题：直接算答对
    userAns = "read";
    sessionAnswered.add(id);
    correctCount++;
    wrong.delete(id);
    localStorage.setItem(WRONG_KEY, JSON.stringify([...wrong]));
    refreshWrongCnt();
    reveal(q, id, true, true);
    updateStats(); saveProgress();
    return;
  }

  if (displayType === "fill") userAns = $("fillInput").value;
  else userAns = sel.slice().sort().join("");

  let ok;
  if (displayType === "fill") ok = fillCorrect(userAns, q.answer || "");
  else if (q.type === "multiple") ok = userAns === (q.answer || "").split("").sort().join("");
  else ok = userAns === q.answer;

  sessionAnswered.add(id);
  if (ok) { correctCount++; wrong.delete(id); }
  else wrong.add(id);
  localStorage.setItem(WRONG_KEY, JSON.stringify([...wrong]));
  refreshWrongCnt();
  reveal(q, id, true, ok);
  updateStats(); saveProgress();
}

function reveal(q, id, justAnswered, ok) {
  const fb = $("feedback");
  let displayType = q.type;
  if (q.type === "fill") displayType = isRealFill(q) ? "fill" : "read";

  if (displayType === "multiple" || displayType === "single" || displayType === "judge") {
    const correctSet = (q.answer || "").split("");
    document.querySelectorAll("#qBody .opt").forEach((o) => {
      const k = o.dataset.key;
      const chosen = (displayType === "multiple" ? sel.includes(k) : sel[0] === k);
      if (correctSet.includes(k)) { o.classList.add("correct"); o.classList.remove("dim"); }
      else if (chosen) { o.classList.add("wrong"); }
      else o.classList.add("dim");
    });
  }
  if (justAnswered) {
    fb.className = "feedback show " + (ok ? "ok" : "no");
    fb.innerHTML = (ok ? "✅ 回答正确" : "❌ 回答错误") +
      '<div class="ans">正确答案：' + answerText(q) + "</div>";
  } else {
    const wasOk = !wrong.has(id);
    fb.className = "feedback show " + (wasOk ? "ok" : "no");
    fb.innerHTML = (wasOk ? "✅ 这题你答对了" : "❌ 这题曾答错") +
      '<div class="ans">正确答案：' + answerText(q) + "</div>";
  }
  $("submitBtn").disabled = true; $("nextBtn").disabled = false;
}

function answerText(q) {
  let displayType = q.type;
  if (q.type === "fill") displayType = isRealFill(q) ? "fill" : "read";
  if (displayType === "read") return "（阅读背诵题，无标准答案）";
  if (displayType === "fill") return q.answer || "（暂无标准答案）";
  if (q.type === "judge") return q.answer;
  if (q.type === "multiple") {
    return q.answer.split("").map((k) => {
      const o = q.options.find((x) => x.key === k); return k + "." + (o ? o.text : "");
    }).join("；");
  }
  const o = q.options.find((x) => x.key === q.answer);
  return q.answer + "." + (o ? o.text : "");
}

function updateStats() {
  $("sProg").textContent = list.length ? (pos + 1) + "/" + list.length : "0/0";
  $("sDone").textContent = sessionAnswered.size;
  $("sAcc").textContent = sessionAnswered.size ? Math.round((correctCount / sessionAnswered.size) * 100) + "%" : "—";
  $("sWrong").textContent = wrong.size;
}

init();
