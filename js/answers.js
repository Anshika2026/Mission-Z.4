let allCards = [];
let currentColor = "#22c55e";
let editingId = null;
let activeCardForView = null;
let revealAllState = false;

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
];

document.addEventListener("DOMContentLoaded", initAnswers);

function initAnswers() {
  buildColorPicker();
  loadCards();

  document.getElementById("cardContentInput").addEventListener("input", (e) => {
    document.getElementById("charCount").innerText =
      `${e.target.value.length} characters`;
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      document.getElementById("searchInput").focus();
    }
    if (e.key === "Escape") {
      closeCardModal();
      closeViewModal();
    }
  });
}

function buildColorPicker() {
  const picker = document.getElementById("colorPicker");
  picker.innerHTML = "";

  COLORS.forEach((c) => {
    const dot = document.createElement("div");
    dot.className = "color-dot";
    dot.style.background = c;
    if (c === currentColor) dot.classList.add("selected");
    dot.onclick = () => {
      currentColor = c;
      [...picker.children].forEach((d) => d.classList.remove("selected"));
      dot.classList.add("selected");
    };
    picker.appendChild(dot);
  });
}

async function loadCards() {
  const userId = getUserId();
  const res = await api("getAnswerCards", { userId });
  allCards = res.cards || [];
  renderCards();
}

/* ---------- PARSE "Q: ... / A: ..." BLOCKS ---------- */
function parseQA(content) {
  if (!content) return [];

  const lines = content.split("\n");
  let pairs = [];
  let current = null;

  lines.forEach((raw) => {
    const line = raw.trim();

    if (/^Q[:\-]/i.test(line)) {
      if (current) pairs.push(current);
      current = { question: line.replace(/^Q[:\-]\s*/i, ""), answer: "" };
    } else if (/^A[:\-]/i.test(line)) {
      if (!current) current = { question: "", answer: "" };
      current.answer = line.replace(/^A[:\-]\s*/i, "");
    } else if (current && line) {
      current.answer = current.answer ? current.answer + "\n" + line : line;
    }
  });

  if (current) pairs.push(current);

  return pairs.filter((p) => p.question || p.answer);
}

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

/* ---------- RENDER GRID ---------- */
function renderCards() {
  const grid = document.getElementById("ansGrid");
  const empty = document.getElementById("ansEmpty");
  const sortVal = document.getElementById("sortSelect").value;
  const query = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();

  let filtered = allCards.filter((c) => {
    if (!query) return true;
    return (
      c.title.toLowerCase().includes(query) ||
      (c.content || "").toLowerCase().includes(query)
    );
  });

  filtered.sort((a, b) => {
    if (sortVal === "az") return a.title.localeCompare(b.title);
    if (sortVal === "qcount")
      return parseQA(b.content).length - parseQA(a.content).length;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  grid.innerHTML = "";

  document.getElementById("cardCount").innerText =
    `${allCards.length} section${allCards.length !== 1 ? "s" : ""}`;
  document.getElementById("qCount").innerText =
    `${allCards.reduce((sum, c) => sum + parseQA(c.content).length, 0)} questions total`;

  if (filtered.length === 0) {
    empty.classList.remove("hidden");
    empty.querySelector("p").innerText = query
      ? "🔍 No matching sections"
      : "📭 No sections yet";
    empty.querySelector("span").innerText = query
      ? `Nothing found for "${query}"`
      : `Click "+ Add Section" to create your first Q&A section — e.g. "Polity Mains Answers".`;
    return;
  }
  empty.classList.add("hidden");

  filtered.forEach((card) => {
    const pairs = parseQA(card.content);
    const div = document.createElement("div");
    div.className = "ans-card";
    div.style.borderLeftColor = card.color;
    div.onclick = () => openViewModal(card);

    div.innerHTML = `
      <div class="ans-card-header">
        <div class="ans-card-title">${highlight(card.title, query)}</div>
        <div class="ans-card-actions">
          <span onclick="event.stopPropagation(); openCardModal('${card.id}')">✏</span>
          <span onclick="event.stopPropagation(); deleteCard('${card.id}')">🗑</span>
        </div>
      </div>
      <div class="ans-card-preview">${highlight((card.content || "").slice(0, 140), query)}${(card.content || "").length > 140 ? "..." : ""}</div>
      <div class="ans-card-footer">
        <span>${pairs.length} question${pairs.length !== 1 ? "s" : ""}</span>
        <span>Updated ${timeAgo(card.updatedAt)}</span>
      </div>
    `;

    grid.appendChild(div);
  });
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const re = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "ig",
  );
  return escaped.replace(re, "<mark>$1</mark>");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.innerText = str || "";
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

let searchDebounce;
function filterCards() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderCards, 150);
}

/* ---------- ADD / EDIT MODAL ---------- */
function openCardModal(id = null) {
  editingId = id;
  const modal = document.getElementById("cardModal");
  const titleInput = document.getElementById("cardTitleInput");
  const contentInput = document.getElementById("cardContentInput");

  if (id) {
    const card = allCards.find((c) => c.id == id);
    document.getElementById("modalTitle").innerText = "Edit Section";
    titleInput.value = card.title;
    contentInput.value = card.content;
    currentColor = card.color;
  } else {
    document.getElementById("modalTitle").innerText = "New Section";
    titleInput.value = "";
    contentInput.value = "";
    currentColor = COLORS[0];
  }

  document.getElementById("charCount").innerText =
    `${contentInput.value.length} characters`;
  buildColorPicker();
  closeViewModal();
  modal.classList.remove("hidden");
  titleInput.focus();
}

function closeCardModal() {
  document.getElementById("cardModal").classList.add("hidden");
  editingId = null;
}

async function saveCard() {
  const title = document.getElementById("cardTitleInput").value.trim();
  const content = document.getElementById("cardContentInput").value.trim();

  if (!title) return alert("Please enter a subject/section name");

  const userId = getUserId();
  const btn = document.querySelector(".save-card-btn");
  btn.innerText = "Saving...";
  btn.disabled = true;

  if (editingId) {
    await api("updateAnswerCard", {
      id: editingId,
      userId,
      title,
      content,
      color: currentColor,
    });
  } else {
    await api("createAnswerCard", {
      userId,
      title,
      content,
      color: currentColor,
    });
  }

  btn.innerText = "Save Section";
  btn.disabled = false;

  closeCardModal();
  loadCards();
}

async function deleteCard(id) {
  if (!confirm("Delete this section? This cannot be undone.")) return;
  const userId = getUserId();
  await api("deleteAnswerCard", { id, userId });
  loadCards();
}

/* ---------- VIEW MODAL ---------- */
function openViewModal(card) {
  activeCardForView = card;
  revealAllState = false;

  document.getElementById("viewTitle").innerText = card.title;
  document.getElementById("viewMeta").innerText =
    `${parseQA(card.content).length} questions • Last updated ${timeAgo(card.updatedAt)}`;

  const searchInput = document.getElementById("cardSearchInput");
  searchInput.value = "";
  document.getElementById("cardSearchClear").classList.add("hidden");
  document.getElementById("practiceModeToggle").checked = false;
  document.getElementById("revealAllBtn").innerText = "Show All Answers";

  renderCardQA("");

  document.getElementById("editFromViewBtn").onclick = () =>
    openCardModal(card.id);

  document.getElementById("viewModal").classList.remove("hidden");
  searchInput.focus();
}

function currentQAQuery() {
  return document.getElementById("cardSearchInput").value;
}

function renderCardQA(query) {
  const body = document.getElementById("viewBody");
  const pairs = parseQA(activeCardForView.content);
  const q = query.trim().toLowerCase();
  const practiceMode = document.getElementById("practiceModeToggle").checked;

  const matches = q
    ? pairs.filter(
        (p) =>
          p.question.toLowerCase().includes(q) ||
          p.answer.toLowerCase().includes(q),
      )
    : pairs;

  if (!pairs.length) {
    body.innerHTML = `<p style="color:#94a3b8;">No questions added yet.</p>`;
    return;
  }

  if (!matches.length) {
    body.innerHTML = `<div class="qa-no-match">🔍 No questions match "${escapeHtml(query)}"</div>`;
    return;
  }

  body.innerHTML = matches
    .map((p, i) => {
      const wc = wordCount(p.answer);
      const collapsedClass = practiceMode && !revealAllState ? "collapsed" : "";

      return `
      <div class="qa-item" style="border-left-color:${activeCardForView.color}">
        <div class="qa-question" onclick="toggleAnswer(this)">
          <span>${highlight(p.question, q)}</span>
          <span class="qmark">${practiceMode ? "tap to reveal" : ""}</span>
        </div>
        <div class="qa-answer ${collapsedClass}">${highlight(p.answer, q)}</div>
        <div class="qa-word-count">${wc} words</div>
      </div>
    `;
    })
    .join("");
}

function toggleAnswer(questionEl) {
  const answerEl = questionEl.nextElementSibling;
  if (!document.getElementById("practiceModeToggle").checked) return;
  answerEl.classList.toggle("collapsed");
}

function toggleRevealAll() {
  revealAllState = !revealAllState;
  document.getElementById("revealAllBtn").innerText = revealAllState
    ? "Hide All Answers"
    : "Show All Answers";
  renderCardQA(currentQAQuery());
}

let cardSearchDebounce;
function filterCardQA() {
  const val = document.getElementById("cardSearchInput").value;
  document.getElementById("cardSearchClear").classList.toggle("hidden", !val);

  clearTimeout(cardSearchDebounce);
  cardSearchDebounce = setTimeout(() => renderCardQA(val), 120);
}

function clearCardSearch() {
  const input = document.getElementById("cardSearchInput");
  input.value = "";
  document.getElementById("cardSearchClear").classList.add("hidden");
  renderCardQA("");
  input.focus();
}

function closeViewModal() {
  document.getElementById("viewModal").classList.add("hidden");
}

function printCard() {
  if (!activeCardForView) return;
  const pairs = parseQA(activeCardForView.content);

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>${activeCardForView.title}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 30px; color:#111; }
          h1 { margin-bottom: 20px; }
          .qa { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eee; }
          .q { font-weight: 700; font-size: 14px; margin-bottom: 6px; }
          .a { font-size: 13px; color: #333; line-height: 1.6; white-space: pre-line; }
        </style>
      </head>
      <body>
        <h1>${activeCardForView.title}</h1>
        ${pairs.map((p) => `<div class="qa"><div class="q">Q: ${p.question}</div><div class="a">A: ${p.answer}</div></div>`).join("")}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
