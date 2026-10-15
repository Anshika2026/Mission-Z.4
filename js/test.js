/* =========================================================
   Mission Z.4 — Test module (js/test.js)
   Needs: api.js (api()), utils.js (getUserId, logout, toggleTheme)
   ========================================================= */

const MATCH_THRESHOLD = 90; // % at/above which an answer counts as "mastered"
const COLORS = {
  mastered: "#22c55e",
  partial: "#f59e0b",
  weak: "#ef4444",
  none: "#64748b",
};

const TZ = {
  overview: null,
  charts: [],
  session: null,
  timer: null,
  selMinutes: 10,
  reportChart: null,
  lastReport: null,
};

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

document.addEventListener("DOMContentLoaded", initTest);

/* ================= INIT ================= */
async function initTest() {
  if (!getUserId()) return logout();

  const name = localStorage.getItem("userName");
  const clean = name && name !== "undefined" ? name : "User";
  $("avatarBtn").innerText = clean.charAt(0).toUpperCase();
  $("ddName").innerText = clean;
  $("ddId").innerText = "ID: " + getUserId();

  bindUI();
  await loadOverview();
}

function bindUI() {
  // nav
  $("burgerBtn").onclick = () => toggleDrawer(true);
  $("drawerBg").onclick = () => toggleDrawer(false);
  $("avatarBtn").onclick = (e) => {
    e.stopPropagation();
    $("avatarMenu").classList.toggle("hidden");
  };
  document.addEventListener("click", () =>
    $("avatarMenu").classList.add("hidden"),
  );

  // modals
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => closeModal(b.dataset.close)));
  $("addTestBtn").onclick = openAddModal;
  $("giveTestBtn").onclick = openStartModal;

  // add modal
  $("addRowBtn").onclick = () => addQRow();
  $("saveAddBtn").onclick = saveAddTest;
  $("addSubject").addEventListener("input", fillChapterList);

  // start modal
  $("stSubject").onchange = fillStartChapters;
  $("stChapter").onchange = updateStartInfo;
  $("timeChips")
    .querySelectorAll("button")
    .forEach((b) => {
      b.onclick = () => {
        TZ.selMinutes = Number(b.dataset.min);
        $("timeChips")
          .querySelectorAll("button")
          .forEach((x) => x.classList.toggle("on", x === b));
      };
    });
  $("stStartBtn").onclick = startFromModal;

  // test screen
  $("viewAnsBtn").onclick = toggleViewAnswer;
  $("editQBtn").onclick = openEditModal;
  $("proceedBtn").onclick = onProceed;
  $("exitTestBtn").onclick = onExitTest;
  $("downloadBtn").onclick = downloadContent;
  $("edSave").onclick = saveEditQuestion;
  $("edDelete").onclick = deleteQuestion;

  // report
  $("rpClose").onclick = closeReport;
  $("rpDone").onclick = closeReport;
  $("rpRetake").onclick = retakeWeak;
}

function toggleDrawer(open) {
  $("drawer").classList.toggle("open", open);
  $("drawerBg").classList.toggle("hidden", !open);
}

function tzToggleTheme() {
  toggleTheme();
  if (TZ.overview) renderOverview();
  if (TZ.lastReport && !$("reportModal").classList.contains("hidden"))
    drawReportChart(TZ.lastReport);
}

/* ================= HELPERS ================= */
function openModal(id) {
  $(id).classList.remove("hidden");
}
function closeModal(id) {
  $(id).classList.add("hidden");
}

function toast(msg, type = "ok", ms = 3200) {
  const t = document.createElement("div");
  t.className = "tz-toast " + (type === "ok" ? "" : type);
  t.innerText = msg;
  $("toasts").appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function askConfirm(title, text, okLabel = "OK", danger = false) {
  return new Promise((resolve) => {
    $("cfTitle").innerText = title;
    $("cfText").innerText = text;
    const ok = $("cfOk");
    ok.innerText = okLabel;
    ok.className = "tz-btn " + (danger ? "tz-btn-danger" : "tz-btn-primary");
    openModal("confirmModal");
    $("confirmModal").style.zIndex = 3000;
    const done = (v) => {
      closeModal("confirmModal");
      ok.onclick = null;
      $("cfCancel").onclick = null;
      resolve(v);
    };
    ok.onclick = () => done(true);
    $("cfCancel").onclick = () => done(false);
  });
}

function setBtnLoading(btnId, textId, spinId, loading, label) {
  $(btnId).disabled = loading;
  $(textId).innerText = label;
  $(spinId).classList.toggle("hidden", !loading);
}

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function pctClass(p) {
  return p >= MATCH_THRESHOLD ? "good" : p >= 50 ? "mid" : "low";
}
function pctColor(p) {
  return p >= MATCH_THRESHOLD
    ? COLORS.mastered
    : p >= 50
      ? COLORS.partial
      : COLORS.weak;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  return (
    String(Math.floor(sec / 60)).padStart(2, "0") +
    ":" +
    String(sec % 60).padStart(2, "0")
  );
}

/* ================= MATCHING ENGINE ================= */
const STOP = new Set(
  "a an the of in on at to for and or is are was were be been by with as from that this it its into than then their there which who whom".split(
    " ",
  ),
);

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseKeywords(answer) {
  return String(answer || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function lev(a, b) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}
function ratio(a, b) {
  const L = Math.max(a.length, b.length);
  return L ? 1 - lev(a, b) / L : 1;
}

function tokenMatch(t, words) {
  for (const w of words) {
    if (w === t) return true;
    if (
      t.length >= 4 &&
      w.length >= 4 &&
      (w.startsWith(t) || t.startsWith(w)) &&
      ratio(w, t) >= 0.7
    )
      return true; // plural/stem
    if (t.length >= 5 && ratio(w, t) >= 0.84) return true; // typo tolerance
  }
  return false;
}

/** Returns {pct, hit[], missed[]} — pct = average keyword coverage (partial credit for multi-word keywords) */
function computeMatch(userText, answer) {
  const kws = parseKeywords(answer);
  if (!kws.length) return { pct: 0, hit: [], missed: [] };

  const textNorm = norm(userText);
  const words = textNorm.split(" ").filter(Boolean);
  const padded = " " + textNorm + " ";

  let total = 0;
  const hit = [],
    missed = [];

  kws.forEach((kw) => {
    const k = norm(kw);
    if (!k) return;
    let score = 0;
    if (padded.includes(" " + k + " ")) {
      score = 1;
    } else {
      let toks = k.split(" ");
      const filtered = toks.filter((t) => !STOP.has(t));
      if (filtered.length) toks = filtered;
      const ok = toks.filter((t) => tokenMatch(t, words)).length;
      score = ok / toks.length;
    }
    total += score;
    (score >= 0.85 ? hit : missed).push(kw);
  });

  return { pct: Math.round((total / kws.length) * 100), hit, missed };
}

/* ================= OVERVIEW / REPORT ================= */
async function loadOverview() {
  $("statsGrid").innerHTML = '<div class="tz-skel"></div>'.repeat(4);
  $("subjectsGrid").innerHTML =
    '<div class="tz-skel"></div><div class="tz-skel"></div>';
  try {
    const res = await api("getTestOverview", { userId: getUserId() });
    if (!res || res.success === false || res.error)
      throw new Error(res && (res.message || res.error));
    TZ.overview = res;
    renderOverview();
  } catch (err) {
    console.error(err);
    TZ.overview = { subjects: [], stats: {}, history: [] };
    renderOverview();
    toast(
      "Could not load tests. Is the backend deployed with the Test functions?",
      "error",
      5000,
    );
  }
}

function renderOverview() {
  const ov = TZ.overview || { subjects: [], stats: {}, history: [] };
  const st = ov.stats || {};

  const totalQ = ov.subjects.reduce((a, s) => a + s.total, 0);
  const totalMastered = ov.subjects.reduce((a, s) => a + s.mastered, 0);
  const totalChapters = ov.subjects.reduce((a, s) => a + s.chapters.length, 0);
  const masteryPct = totalQ ? Math.round((totalMastered / totalQ) * 100) : 0;

  $("statsGrid").innerHTML = [
    ["Subjects", ov.subjects.length, ""],
    ["Chapters", totalChapters, ""],
    ["Questions", totalQ, ""],
    ["Tests taken", st.testsTaken || 0, ""],
    ["Avg match", (st.avgMatch || 0) + "%", ""],
    ["Mastered", masteryPct + "%", "accent"],
  ]
    .map(
      ([l, v, c]) =>
        `<div class="tz-stat ${c}"><small>${l}</small><strong>${v}</strong></div>`,
    )
    .join("");

  // destroy old charts
  TZ.charts.forEach((c) => c.destroy());
  TZ.charts = [];

  const grid = $("subjectsGrid");
  if (!ov.subjects.length) {
    grid.innerHTML = `<div class="tz-empty"><h3>No test content yet</h3>
      <p>Tap <b>＋ Add Test</b> in the top bar to add your first subject, chapter and questions.</p></div>`;
  } else {
    grid.innerHTML = ov.subjects
      .map((s, i) => {
        const none = s.total - s.mastered - s.inProgress;
        return `
      <div class="tz-subject">
        <div class="tz-subject-head">
          <div><h3>${esc(s.subjectName)}</h3>
          <small>${s.chapters.length} chapter${s.chapters.length === 1 ? "" : "s"} · ${s.total} question${s.total === 1 ? "" : "s"}</small></div>
          <span class="tz-badge ${s.total && s.mastered / s.total >= 0.9 ? "good" : "mid"}">${s.total ? Math.round((s.mastered / s.total) * 100) : 0}%</span>
        </div>
        <div class="tz-donut-row">
          <div class="tz-donut"><canvas id="sd${i}"></canvas></div>
          <div class="tz-legend">
            <span><i class="tz-dot" style="background:${COLORS.mastered}"></i>Mastered<b>${s.mastered}</b></span>
            <span><i class="tz-dot" style="background:${COLORS.partial}"></i>In progress<b>${s.inProgress}</b></span>
            <span><i class="tz-dot" style="background:${COLORS.none}"></i>Not attempted<b>${none}</b></span>
          </div>
        </div>
        <div class="tz-chapters">
          ${s.chapters
            .map((c) => {
              const t = c.total || 1;
              return `<div class="tz-chapter-row">
              <div class="top"><span>${esc(c.chapterName)}</span><span>${c.mastered}/${c.total}</span></div>
              <div class="tz-bar"><i style="width:${(c.mastered / t) * 100}%;background:${COLORS.mastered}"></i><i style="width:${(c.inProgress / t) * 100}%;background:${COLORS.partial}"></i></div>
            </div>`;
            })
            .join("")}
        </div>
      </div>`;
      })
      .join("");

    ov.subjects.forEach((s, i) => {
      const none = s.total - s.mastered - s.inProgress;
      TZ.charts.push(
        makeDonut(
          $("sd" + i),
          [s.mastered, s.inProgress, none],
          [COLORS.mastered, COLORS.partial, COLORS.none],
          s.total ? Math.round((s.mastered / s.total) * 100) + "%" : "0%",
        ),
      );
    });
  }

  // history
  const h = ov.history || [];
  $("historyList").innerHTML = h.length
    ? h
        .map(
          (a) => `<div class="tz-hist-row">
        <div><strong>${esc(a.subjectName)} · ${esc(a.chapterName)}</strong>
        <small>${new Date(a.date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${a.answered}/${a.total} answered · ${fmtTime(a.timeTaken)} of ${a.timeTarget} min</small></div>
        <span class="tz-badge ${pctClass(a.avgMatch)}">${a.avgMatch}%</span>
      </div>`,
        )
        .join("")
    : `<div class="tz-empty"><p>No tests taken yet. Hit <b>Give a Test</b> to start.</p></div>`;
}

const centerTextPlugin = {
  id: "centerText",
  afterDraw(chart, args, opts) {
    if (!opts || !opts.text) return;
    const { ctx, chartArea: a } = chart;
    ctx.save();
    ctx.font = `700 ${opts.size || 22}px Segoe UI, sans-serif`;
    ctx.fillStyle = cssVar("--text");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.text, (a.left + a.right) / 2, (a.top + a.bottom) / 2);
    ctx.restore();
  },
};

function makeDonut(canvas, values, colors, centerText, size) {
  const empty = values.every((v) => !v);
  return new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Mastered", "In progress / partial", "Not attempted"],
      datasets: [
        {
          data: empty ? [1] : values,
          backgroundColor: empty ? [cssVar("--track")] : colors,
          borderWidth: 0,
        },
      ],
    },
    plugins: [centerTextPlugin],
    options: {
      cutout: "72%",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 900 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: !empty },
        centerText: { text: centerText, size: size || 22 },
      },
    },
  });
}

/* ================= ADD TEST ================= */
function openAddModal() {
  const ov = TZ.overview || { subjects: [] };
  $("subjectList").innerHTML = ov.subjects
    .map((s) => `<option value="${esc(s.subjectName)}">`)
    .join("");
  $("addSubject").value = "";
  $("addChapter").value = "";
  $("chapterList").innerHTML = "";
  $("qRows").innerHTML = "";
  addQRow();
  openModal("addModal");
}

function fillChapterList() {
  const name = $("addSubject").value.trim().toLowerCase();
  const sub = (TZ.overview?.subjects || []).find(
    (s) => s.subjectName.toLowerCase() === name,
  );
  $("chapterList").innerHTML = sub
    ? sub.chapters.map((c) => `<option value="${esc(c.chapterName)}">`).join("")
    : "";
}

function addQRow(q = "", a = "") {
  const wrap = $("qRows");
  const n = wrap.children.length + 1;
  const row = document.createElement("div");
  row.className = "tz-qrow";
  row.innerHTML = `
    <div class="tz-qrow-top"><span class="rn">Question ${n}</span><button type="button">Remove</button></div>
    <textarea class="tz-input q" rows="2" placeholder="Question"></textarea>
    <textarea class="tz-input a" rows="2" placeholder="Answer keywords, separated by commas (e.g. Article 21, Right to life, Maneka Gandhi)"></textarea>
    <div class="tz-kwcount">0 keywords</div>`;
  row.querySelector(".q").value = q;
  row.querySelector(".a").value = a;
  row.querySelector("button").onclick = () => {
    if (wrap.children.length === 1)
      return toast("Keep at least one question row.", "warn");
    row.remove();
    [...wrap.children].forEach(
      (r, i) => (r.querySelector(".rn").innerText = "Question " + (i + 1)),
    );
  };
  const upd = () => {
    const c = parseKeywords(row.querySelector(".a").value).length;
    row.querySelector(".tz-kwcount").innerText =
      c + " keyword" + (c === 1 ? "" : "s");
  };
  row.querySelector(".a").addEventListener("input", upd);
  wrap.appendChild(row);
  upd();
  if (n > 1) row.querySelector(".q").focus();
}

async function saveAddTest() {
  const subjectName = $("addSubject").value.trim();
  const chapterName = $("addChapter").value.trim();
  if (!subjectName || !chapterName)
    return toast("Enter both subject and chapter.", "warn");

  const items = [...$("qRows").children]
    .map((r) => ({
      q: r.querySelector(".q").value.trim(),
      a: r.querySelector(".a").value.trim(),
    }))
    .filter((x) => x.q || x.a);
  if (!items.length) return toast("Add at least one question.", "warn");
  if (items.some((x) => !x.q || !x.a))
    return toast(
      "Every question needs an answer (keywords) and vice-versa.",
      "warn",
    );

  // chunk so GET urls stay short
  const chunks = [];
  let cur = [];
  items.forEach((it) => {
    const test = cur.concat(it);
    if (cur.length && encodeURIComponent(JSON.stringify(test)).length > 1500) {
      chunks.push(cur);
      cur = [it];
    } else cur = test;
  });
  if (cur.length) chunks.push(cur);

  setBtnLoading("saveAddBtn", "saveAddText", "saveAddSpin", true, "Saving...");
  try {
    let added = 0;
    for (const ch of chunks) {
      const res = await api("addTestQuestions", {
        userId: getUserId(),
        subjectName,
        chapterName,
        items: JSON.stringify(ch),
      });
      if (!res || !res.success)
        throw new Error((res && res.message) || "Save failed");
      added += res.added;
    }
    toast(
      `${added} question${added === 1 ? "" : "s"} added to ${chapterName}.`,
    );
    closeModal("addModal");
    await loadOverview();
  } catch (err) {
    console.error(err);
    toast("Could not save: " + err.message, "error", 5000);
  }
  setBtnLoading(
    "saveAddBtn",
    "saveAddText",
    "saveAddSpin",
    false,
    "Save Questions",
  );
}

/* ================= GIVE A TEST (setup) ================= */
function openStartModal() {
  const subs = (TZ.overview?.subjects || []).filter((s) => s.total > 0);
  if (!subs.length)
    return toast("Add some test content first (＋ Add Test).", "warn");
  $("stSubject").innerHTML = subs
    .map(
      (s) =>
        `<option value="${esc(s.subjectId)}">${esc(s.subjectName)} (${s.total})</option>`,
    )
    .join("");
  fillStartChapters();
  openModal("startModal");
}

function fillStartChapters() {
  const sub = TZ.overview.subjects.find(
    (s) => String(s.subjectId) === $("stSubject").value,
  );
  const opts = [
    `<option value="all">All chapters (${sub.total})</option>`,
  ].concat(
    sub.chapters
      .filter((c) => c.total > 0)
      .map(
        (c) =>
          `<option value="${esc(c.chapterId)}">${esc(c.chapterName)} (${c.total})</option>`,
      ),
  );
  $("stChapter").innerHTML = opts.join("");
  updateStartInfo();
}

function updateStartInfo() {
  const sub = TZ.overview.subjects.find(
    (s) => String(s.subjectId) === $("stSubject").value,
  );
  const cid = $("stChapter").value;
  const n =
    cid === "all"
      ? sub.total
      : sub.chapters.find((c) => String(c.chapterId) === cid)?.total || 0;
  $("stInfo").innerText =
    `${n} question${n === 1 ? "" : "s"} will be shuffled. The test ends automatically when the timer runs out.`;
}

async function startFromModal() {
  const subjectId = $("stSubject").value;
  const chapterId = $("stChapter").value;
  setBtnLoading("stStartBtn", "stStartText", "stStartSpin", true, "Loading...");
  try {
    const res = await api("getTestQuestions", {
      userId: getUserId(),
      subjectId,
      chapterId,
    });
    if (!res || !res.success || !res.questions.length)
      throw new Error("No questions found");
    const sub = TZ.overview.subjects.find(
      (s) => String(s.subjectId) === String(subjectId),
    );
    const chap =
      chapterId === "all"
        ? "All chapters"
        : sub.chapters.find((c) => String(c.chapterId) === chapterId)
            ?.chapterName;
    closeModal("startModal");
    beginSession(res.questions, {
      subjectId,
      chapterId,
      subjectName: sub.subjectName,
      chapterName: chap,
      minutes: TZ.selMinutes,
    });
  } catch (err) {
    toast(err.message, "error");
  }
  setBtnLoading(
    "stStartBtn",
    "stStartText",
    "stStartSpin",
    false,
    "Start Test",
  );
}

/* ================= TEST SESSION ================= */
function beginSession(questions, meta) {
  TZ.session = {
    ...meta,
    all: questions.slice(), // full scope (for PDF)
    qs: shuffle(questions),
    idx: 0,
    results: {}, // questionId -> {pct, hit, missed, viewed, text}
    viewed: {},
    evaluated: false,
    startedAt: Date.now(),
    remaining: meta.minutes * 60,
    ended: false,
  };
  $("tsScope").innerText = `${meta.subjectName} · ${meta.chapterName}`;
  $("testScreen").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  renderQuestion();

  clearInterval(TZ.timer);
  updateTimer();
  TZ.timer = setInterval(() => {
    const s = TZ.session;
    if (!s || s.ended) return clearInterval(TZ.timer);
    s.remaining--;
    updateTimer();
    if (s.remaining <= 0) {
      toast("⏰ Time is up!", "warn");
      finishTest();
    }
  }, 1000);
}

function updateTimer() {
  const s = TZ.session;
  const el = $("tsTimer");
  el.innerText = fmtTime(s.remaining);
  el.classList.toggle("low", s.remaining <= 60);
}

function renderQuestion() {
  const s = TZ.session;
  const q = s.qs[s.idx];
  s.evaluated = false;

  $("tsCount").innerText = `Q ${s.idx + 1} / ${s.qs.length}`;
  $("tsBar").style.width = (s.idx / s.qs.length) * 100 + "%";
  $("tsChapter").innerText = q.chapterName || s.chapterName;
  $("tsQuestion").innerText = q.question;

  const inp = $("ansInput");
  inp.value = "";
  inp.readOnly = false;
  inp.classList.remove("shake");
  $("tsWarn").classList.add("hidden");
  $("tsReveal").classList.add("hidden");
  $("tsResult").classList.add("hidden");
  $("viewAnsBtn").innerText = "👁 View Answer";
  $("proceedBtn").innerText = "Proceed →";
  $("viewAnsBtn").disabled = false;
  document.querySelector(".tz-test-body").scrollTop = 0;
  setTimeout(() => inp.focus(), 50);
}

function chipsHtml(list, cls) {
  return list
    .map((k) => `<span class="${cls || ""}">${esc(k)}</span>`)
    .join("");
}

function toggleViewAnswer() {
  const s = TZ.session;
  const q = s.qs[s.idx];
  const box = $("tsReveal");
  if (box.classList.contains("hidden")) {
    s.viewed[q.questionId] = true;
    $("tsRevealChips").innerHTML = chipsHtml(parseKeywords(q.answer));
    box.classList.remove("hidden");
    $("viewAnsBtn").innerText = "🙈 Hide Answer";
  } else {
    box.classList.add("hidden");
    $("viewAnsBtn").innerText = "👁 View Answer";
  }
}

function onProceed() {
  const s = TZ.session;
  if (s.evaluated) return nextQuestion();

  const q = s.qs[s.idx];
  const text = $("ansInput").value.trim();

  // warning: nothing written
  if (!text) {
    $("tsWarn").classList.remove("hidden");
    const inp = $("ansInput");
    inp.classList.remove("shake");
    void inp.offsetWidth;
    inp.classList.add("shake");
    toast("Write your answer before proceeding.", "warn");
    return;
  }

  const m = computeMatch(text, q.answer);
  s.results[q.questionId] = { ...m, text, viewed: !!s.viewed[q.questionId] };
  s.evaluated = true;

  $("tsWarn").classList.add("hidden");
  $("ansInput").readOnly = true;
  $("tsReveal").classList.add("hidden");
  $("viewAnsBtn").innerText = "👁 View Answer";

  const color = pctColor(m.pct);
  $("tsPct").innerText = m.pct + "%";
  $("tsPct").style.color = color;
  $("tsMeter").style.background = color;
  $("tsMeter").style.width = "0%";
  requestAnimationFrame(() =>
    requestAnimationFrame(() => ($("tsMeter").style.width = m.pct + "%")),
  );

  if (m.pct >= MATCH_THRESHOLD) {
    $("tsResultTitle").innerText = "Excellent — you nailed it";
    $("tsResultSub").innerText =
      `Match is ${m.pct}% (≥ ${MATCH_THRESHOLD}% counts as mastered).`;
  } else {
    $("tsResultTitle").innerText =
      `${m.pct}% match — below ${MATCH_THRESHOLD}%`;
    $("tsResultSub").innerText =
      "Review the missed keywords below, then move on.";
  }
  $("tsHit").innerHTML = chipsHtml(m.hit, "hit");
  $("tsMiss").innerHTML = chipsHtml(m.missed, "miss");
  $("tsHitBlock").classList.toggle("hidden", !m.hit.length);
  $("tsMissBlock").classList.toggle("hidden", !m.missed.length);
  $("tsResult").classList.remove("hidden");
  $("tsResult").scrollIntoView({ behavior: "smooth", block: "nearest" });

  $("proceedBtn").innerText =
    s.idx >= s.qs.length - 1 ? "Finish Test ✓" : "Next Question →";
}

function nextQuestion() {
  const s = TZ.session;
  if (s.idx < s.qs.length - 1) {
    s.idx++;
    renderQuestion();
  } else finishTest();
}

async function onExitTest() {
  const s = TZ.session;
  const answered = Object.keys(s.results).length;
  if (answered) {
    const ok = await askConfirm(
      "End test?",
      `You answered ${answered} of ${s.qs.length}. End now and see your report?`,
      "End & view report",
    );
    if (ok) finishTest();
  } else {
    const ok = await askConfirm(
      "Leave test?",
      "You haven't answered anything yet. Leave without saving?",
      "Leave",
      true,
    );
    if (ok) leaveTest();
  }
}

function leaveTest() {
  clearInterval(TZ.timer);
  if (TZ.session) TZ.session.ended = true;
  $("testScreen").classList.add("hidden");
  document.body.style.overflow = "";
}

/* ---------- edit / delete during test ---------- */
function openEditModal() {
  const q = TZ.session.qs[TZ.session.idx];
  $("edQuestion").value = q.question;
  $("edAnswer").value = q.answer;
  openModal("editModal");
  $("editModal").style.zIndex = 2500;
}

async function saveEditQuestion() {
  const s = TZ.session;
  const q = s.qs[s.idx];
  const question = $("edQuestion").value.trim();
  const answer = $("edAnswer").value.trim();
  if (!question || !answer)
    return toast("Question and answer can't be empty.", "warn");
  $("edSave").disabled = true;
  try {
    const res = await api("updateTestQuestion", {
      userId: getUserId(),
      questionId: q.questionId,
      question,
      answer,
    });
    if (!res || !res.success)
      throw new Error((res && res.message) || "Update failed");
    q.question = question;
    q.answer = answer;
    const inAll = s.all.find((x) => x.questionId === q.questionId);
    if (inAll) Object.assign(inAll, { question, answer });
    $("tsQuestion").innerText = question;
    if (!$("tsReveal").classList.contains("hidden"))
      $("tsRevealChips").innerHTML = chipsHtml(parseKeywords(answer));
    closeModal("editModal");
    toast("Question updated.");
  } catch (err) {
    toast(err.message, "error");
  }
  $("edSave").disabled = false;
}

async function deleteQuestion() {
  const s = TZ.session;
  const q = s.qs[s.idx];
  const ok = await askConfirm(
    "Delete this question?",
    "It will be permanently removed from your chapter.",
    "Delete",
    true,
  );
  if (!ok) return;
  try {
    const res = await api("deleteTestQuestion", {
      userId: getUserId(),
      questionId: q.questionId,
    });
    if (!res || !res.success)
      throw new Error((res && res.message) || "Delete failed");
    delete s.results[q.questionId];
    s.qs.splice(s.idx, 1);
    s.all = s.all.filter((x) => x.questionId !== q.questionId);
    closeModal("editModal");
    toast("Question deleted.");
    if (!s.qs.length) {
      leaveTest();
      loadOverview();
      return toast("No questions left in this test.", "warn");
    }
    if (s.idx >= s.qs.length) {
      if (Object.keys(s.results).length) return finishTest();
      s.idx = s.qs.length - 1;
    }
    renderQuestion();
  } catch (err) {
    toast(err.message, "error");
  }
}

/* ================= FINISH + REPORT ================= */
async function finishTest() {
  const s = TZ.session;
  if (!s || s.ended) return;
  s.ended = true;
  clearInterval(TZ.timer);

  const taken = Math.min(
    s.minutes * 60,
    Math.round((Date.now() - s.startedAt) / 1000),
  );
  const entries = s.qs.map((q) => ({ q, r: s.results[q.questionId] || null }));
  const answered = entries.filter((e) => e.r);
  const avg = answered.length
    ? Math.round(answered.reduce((a, e) => a + e.r.pct, 0) / answered.length)
    : 0;
  const mastered = answered.filter((e) => e.r.pct >= MATCH_THRESHOLD).length;
  const weak = answered.filter((e) => e.r.pct < 50).length;
  const partial = answered.length - mastered - weak;
  const skipped = entries.length - answered.length;

  const report = {
    entries,
    avg,
    mastered,
    partial,
    weak,
    skipped,
    answered: answered.length,
    total: entries.length,
    taken,
    target: s.minutes,
    meta: s,
  };
  TZ.lastReport = report;

  $("testScreen").classList.add("hidden");
  document.body.style.overflow = "";
  showReport(report);

  // save to backend (only if something was answered)
  if (answered.length) {
    const results = answered
      .map((e) => `${e.q.questionId}:${e.r.pct}:${e.r.viewed ? 1 : 0}`)
      .join(";");
    try {
      const res = await api("submitTestAttempt", {
        userId: getUserId(),
        subjectId: s.subjectId,
        chapterId: s.chapterId,
        total: report.total,
        answered: report.answered,
        avgMatch: avg,
        mastered,
        timeTarget: s.minutes,
        timeTaken: taken,
        results,
      });
      if (!res || !res.success) throw new Error();
    } catch {
      toast(
        "Report shown, but saving the attempt failed. Check your backend.",
        "error",
        5000,
      );
    }
  }
}

function showReport(r) {
  $("rpSub").innerText =
    `${r.meta.subjectName} · ${r.meta.chapterName} · ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;

  $("rpStats").innerHTML = [
    ["Avg match", r.avg + "%"],
    ["Answered", `${r.answered} / ${r.total}`],
    ["Mastered (≥" + MATCH_THRESHOLD + "%)", r.mastered],
    ["Time", `${fmtTime(r.taken)} / ${r.target}:00`],
  ]
    .map(
      ([l, v]) =>
        `<div class="tz-rstat"><small>${l}</small><strong>${v}</strong></div>`,
    )
    .join("");

  let verdict;
  if (!r.answered)
    verdict =
      "You didn't answer any question this time. Try again when you're ready.";
  else if (r.avg >= MATCH_THRESHOLD)
    verdict =
      "Outstanding recall — this chapter is in great shape. Revisit it in a few days to keep it fresh.";
  else if (r.avg >= 70)
    verdict =
      "Good recall. A quick revision of the missed keywords below should push you past the mastery mark.";
  else if (r.avg >= 50)
    verdict =
      "Decent start, but several keywords slipped. Revise the weak questions and retake them.";
  else
    verdict =
      "This chapter needs more revision. Read the notes again, then use “Retake weak ones”.";
  if (r.skipped)
    verdict += ` ${r.skipped} question${r.skipped === 1 ? " was" : "s were"} not reached.`;
  $("rpVerdict").innerText = verdict;

  $("rpList").innerHTML = r.entries
    .map((e, i) => {
      if (!e.r)
        return `<div class="tz-rrow"><div class="tz-rrow-top"><div class="tz-rrow-q">${i + 1}. ${esc(e.q.question)}</div><span class="tz-badge low">—</span></div>
          <div class="tz-rrow-tags"><span>Not attempted</span></div></div>`;
      return `<div class="tz-rrow">
        <div class="tz-rrow-top"><div class="tz-rrow-q">${i + 1}. ${esc(e.q.question)}</div><span class="tz-badge ${pctClass(e.r.pct)}">${e.r.pct}%</span></div>
        ${e.r.viewed ? '<div class="tz-rrow-tags"><span>👁 Answer was viewed</span></div>' : ""}
        ${e.r.missed.length ? `<div class="tz-chips">${chipsHtml(e.r.missed, "miss")}</div>` : ""}
      </div>`;
    })
    .join("");

  const needRetake = r.entries.some((e) => !e.r || e.r.pct < MATCH_THRESHOLD);
  $("rpRetake").classList.toggle("hidden", !needRetake);
  openModal("reportModal");
  $("reportModal").style.zIndex = 1200;
  drawReportChart(r);
}

function drawReportChart(r) {
  if (TZ.reportChart) TZ.reportChart.destroy();
  TZ.reportChart = new Chart($("rpChart"), {
    type: "doughnut",
    data: {
      labels: ["Mastered", "Partial (50–89%)", "Weak (<50%)", "Not attempted"],
      datasets: [
        {
          data: [r.mastered, r.partial, r.weak, r.skipped],
          backgroundColor: [
            COLORS.mastered,
            COLORS.partial,
            COLORS.weak,
            COLORS.none,
          ],
          borderWidth: 0,
        },
      ],
    },
    plugins: [centerTextPlugin],
    options: {
      cutout: "70%",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 900 },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: cssVar("--muted"),
            boxWidth: 10,
            font: { size: 11 },
          },
        },
        centerText: { text: r.avg + "%", size: 26 },
      },
    },
  });
}

function closeReport() {
  closeModal("reportModal");
  if (TZ.reportChart) {
    TZ.reportChart.destroy();
    TZ.reportChart = null;
  }
  loadOverview();
}

function retakeWeak() {
  const r = TZ.lastReport;
  const weakQs = r.entries
    .filter((e) => !e.r || e.r.pct < MATCH_THRESHOLD)
    .map((e) => e.q);
  if (!weakQs.length) return;
  closeModal("reportModal");
  beginSession(weakQs, {
    ...r.meta,
    chapterName: r.meta.chapterName + " (weak ones)",
    minutes: r.meta.minutes,
  });
}

/* ================= DOWNLOAD CONTENT (PDF) ================= */
function downloadContent() {
  const s = TZ.session;
  const qs = s.all;
  if (!qs.length) return toast("Nothing to download.", "warn");

  const title = `${s.subjectName} — ${String(s.chapterName).replace(" (weak ones)", "")}`;
  const filename =
    title
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_") + ".pdf";

  // group by chapter
  const groups = {};
  qs.forEach((q) => {
    const k = q.chapterName || s.chapterName;
    (groups[k] = groups[k] || []).push(q);
  });

  const hasUnicode = /[^\u0000-ÿ]/.test(JSON.stringify(qs));
  if (!window.jspdf || hasUnicode) return printFallback(title, groups);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15,
    W = 210 - M * 2,
    H = 297;
  let y = M;

  const need = (h) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.splitTextToSize(title, W).forEach((l) => {
    doc.text(l, M, y);
    y += 8;
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Mission Z.4 · ${qs.length} questions · ${new Date().toLocaleDateString("en-IN")}`,
    M,
    y,
  );
  y += 4;
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.6);
  doc.line(M, y, M + W, y);
  y += 8;

  let n = 0;
  Object.keys(groups).forEach((ch) => {
    need(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(22, 163, 74);
    doc.text(ch, M, y);
    y += 7;

    groups[ch].forEach((q) => {
      n++;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const ql = doc.splitTextToSize(`Q${n}. ${q.question}`, W);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const al = doc.splitTextToSize(
        parseKeywords(q.answer).join("  •  "),
        W - 4,
      );
      need(ql.length * 5.5 + al.length * 5 + 10);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      ql.forEach((l) => {
        doc.text(l, M, y);
        y += 5.5;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      al.forEach((l) => {
        doc.text(l, M + 4, y);
        y += 5;
      });
      y += 4;
    });
    y += 3;
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} / ${pages}`, 105, H - 7, { align: "center" });
  }
  doc.save(filename);
  toast("PDF downloaded.");
}

/** Used when text has non-Latin characters (jsPDF's built-in fonts can't render them) */
function printFallback(title, groups) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to download the PDF.", "warn");
  let n = 0;
  const body = Object.keys(groups)
    .map(
      (ch) =>
        `<h2>${esc(ch)}</h2>` +
        groups[ch]
          .map(
            (q) =>
              `<div class="q"><b>Q${++n}. ${esc(q.question)}</b><p>${parseKeywords(q.answer).map(esc).join(" &nbsp;•&nbsp; ")}</p></div>`,
          )
          .join(""),
    )
    .join("");
  w.document
    .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#0f172a}h1{border-bottom:3px solid #22c55e;padding-bottom:8px}
    h2{color:#16a34a;margin-top:24px}.q{margin:12px 0;page-break-inside:avoid}p{margin:4px 0 0 14px;color:#334155}</style></head>
    <body><h1>${esc(title)}</h1>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
  toast("Choose “Save as PDF” in the print dialog.");
}
