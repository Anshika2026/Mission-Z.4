let allCards = [];
let currentColor = "#22c55e";
let editingId = null;
let activeCardForView = null;

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
];

document.addEventListener("DOMContentLoaded", initKeywords);

function initKeywords() {
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
  const res = await api("getKeywordCards", { userId });
  allCards = res.cards || [];
  renderCards();
}

/* ---------- PARSE "Term: Definition" LINES ---------- */
function parseContent(content) {
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.search(/[:\-–]/);
      if (idx === -1) return { term: line, def: "" };
      return {
        term: line.slice(0, idx).trim(),
        def: line.slice(idx + 1).trim(),
      };
    });
}

/* ---------- RENDER GRID ---------- */
function renderCards() {
  const grid = document.getElementById("kwGrid");
  const empty = document.getElementById("kwEmpty");
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
    if (sortVal === "terms")
      return parseContent(b.content).length - parseContent(a.content).length;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  grid.innerHTML = "";

  document.getElementById("cardCount").innerText =
    `${allCards.length} card${allCards.length !== 1 ? "s" : ""}`;
  document.getElementById("termCount").innerText =
    `${allCards.reduce((sum, c) => sum + parseContent(c.content).length, 0)} terms total`;

  if (filtered.length === 0) {
    empty.classList.remove("hidden");
    empty.querySelector("p").innerText = query
      ? "🔍 No matching cards"
      : "📭 No cards yet";
    empty.querySelector("span").innerText = query
      ? `Nothing found for "${query}"`
      : `Click "+ Add Card" to create your first subject card — e.g. "Economic Reforms".`;
    return;
  }
  empty.classList.add("hidden");

  filtered.forEach((card) => {
    const terms = parseContent(card.content);
    const div = document.createElement("div");
    div.className = "kw-card";
    div.style.borderLeftColor = card.color;
    div.onclick = () => openViewModal(card);

    div.innerHTML = `
      <div class="kw-card-header">
        <div class="kw-card-title">${highlight(card.title, query)}</div>
        <div class="kw-card-actions">
          <span onclick="event.stopPropagation(); openCardModal('${card.id}')">✏</span>
          <span onclick="event.stopPropagation(); deleteCard('${card.id}')">🗑</span>
        </div>
      </div>
      <div class="kw-card-preview">${highlight((card.content || "").slice(0, 140), query)}${(card.content || "").length > 140 ? "..." : ""}</div>
      <div class="kw-card-footer">
        <span>${terms.length} term${terms.length !== 1 ? "s" : ""}</span>
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
    document.getElementById("modalTitle").innerText = "Edit Card";
    titleInput.value = card.title;
    contentInput.value = card.content;
    currentColor = card.color;
  } else {
    document.getElementById("modalTitle").innerText = "New Card";
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

  if (!title) return alert("Please enter a subject/topic name");

  const userId = getUserId();
  const btn = document.querySelector(".save-card-btn");
  btn.innerText = "Saving...";
  btn.disabled = true;

  if (editingId) {
    await api("updateKeywordCard", {
      id: editingId,
      userId,
      title,
      content,
      color: currentColor,
    });
  } else {
    await api("createKeywordCard", {
      userId,
      title,
      content,
      color: currentColor,
    });
  }

  btn.innerText = "Save Card";
  btn.disabled = false;

  closeCardModal();
  loadCards();
}

async function deleteCard(id) {
  if (!confirm("Delete this card? This cannot be undone.")) return;
  const userId = getUserId();
  await api("deleteKeywordCard", { id, userId });
  loadCards();
}

/* ---------- VIEW MODAL ---------- */
// function openViewModal(card) {
//   activeCardForView = card;
//   document.getElementById("viewTitle").innerText = card.title;
//   document.getElementById("viewMeta").innerText =
//     `${parseContent(card.content).length} terms • Last updated ${timeAgo(card.updatedAt)}`;

//   const body = document.getElementById("viewBody");
//   const terms = parseContent(card.content);

//   body.innerHTML = terms.length
//     ? terms
//         .map(
//           (t) => `
//         <div class="kw-term" style="border-left-color:${card.color}">
//           <div class="kw-term-word">${escapeHtml(t.term)}</div>
//           ${t.def ? `<div class="kw-term-def">${escapeHtml(t.def)}</div>` : ""}
//         </div>
//       `,
//         )
//         .join("")
//     : `<p style="color:#94a3b8;">No terms added yet.</p>`;

//   document.getElementById("editFromViewBtn").onclick = () =>
//     openCardModal(card.id);

//   document.getElementById("viewModal").classList.remove("hidden");
// }

function openViewModal(card) {
  activeCardForView = card;
  document.getElementById("viewTitle").innerText = card.title;
  document.getElementById("viewMeta").innerText =
    `${parseContent(card.content).length} terms • Last updated ${timeAgo(card.updatedAt)}`;

  const searchInput = document.getElementById("cardSearchInput");
  searchInput.value = "";
  document.getElementById("cardSearchClear").classList.add("hidden");

  renderCardTerms("");

  document.getElementById("editFromViewBtn").onclick = () =>
    openCardModal(card.id);

  document.getElementById("viewModal").classList.remove("hidden");
  searchInput.focus();
}

function renderCardTerms(query) {
  const body = document.getElementById("viewBody");
  const terms = parseContent(activeCardForView.content);
  const q = query.trim().toLowerCase();

  const matches = q
    ? terms.filter(
        (t) =>
          t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q),
      )
    : terms;

  if (!terms.length) {
    body.innerHTML = `<p style="color:#94a3b8;">No terms added yet.</p>`;
    return;
  }

  if (!matches.length) {
    body.innerHTML = `<div class="kw-term-no-match">🔍 No terms match "${escapeHtml(query)}"</div>`;
    return;
  }

  body.innerHTML = matches
    .map(
      (t) => `
    <div class="kw-term" style="border-left-color:${activeCardForView.color}">
      <div class="kw-term-word">${highlight(t.term, q)}</div>
      ${t.def ? `<div class="kw-term-def">${highlight(t.def, q)}</div>` : ""}
    </div>
  `,
    )
    .join("");
}

let cardSearchDebounce;
function filterCardTerms() {
  const val = document.getElementById("cardSearchInput").value;
  document.getElementById("cardSearchClear").classList.toggle("hidden", !val);

  clearTimeout(cardSearchDebounce);
  cardSearchDebounce = setTimeout(() => renderCardTerms(val), 120);
}

function clearCardSearch() {
  const input = document.getElementById("cardSearchInput");
  input.value = "";
  document.getElementById("cardSearchClear").classList.add("hidden");
  renderCardTerms("");
  input.focus();
}

function closeViewModal() {
  document.getElementById("viewModal").classList.add("hidden");
}

function printCard() {
  if (!activeCardForView) return;
  const terms = parseContent(activeCardForView.content);

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>${activeCardForView.title}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 30px; color:#111; }
          h1 { margin-bottom: 20px; }
          .term { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
          .word { font-weight: 700; font-size: 15px; }
          .def { font-size: 13px; color: #444; margin-top: 3px; }
        </style>
      </head>
      <body>
        <h1>${activeCardForView.title}</h1>
        ${terms.map((t) => `<div class="term"><div class="word">${t.term}</div>${t.def ? `<div class="def">${t.def}</div>` : ""}</div>`).join("")}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
