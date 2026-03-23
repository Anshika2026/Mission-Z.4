let attemptChart;

document.addEventListener("DOMContentLoaded", initPractice);

async function initPractice() {
  const res = await api("getSubjects");
  fillSubjects(res.prelims);
}

function fillSubjects(subjects) {
  const dropdown = document.getElementById("subject-dropdown");

  subjects.forEach((sub) => {
    const opt = document.createElement("option");
    opt.value = sub.subjectId;
    opt.textContent = sub.subjectName;
    dropdown.appendChild(opt);
  });
}

async function loadChapters() {
  const subjectId = document.getElementById("subject-dropdown").value;
  const userId = getUserId();

  const res = await api("getChapters", { subjectId, userId });

  renderChapters(res.chapters);
  renderDonut(res.stats);
}

function renderChapters(chapters) {
  const container = document.getElementById("chapter-list");
  container.innerHTML = "";

  chapters.forEach((ch) => {
    const row = document.createElement("div");
    row.className = "chapter-row";

    if (ch.accuracy < 50) row.classList.add("weak");

    // row.innerHTML = `
    //   <div>${ch.chapterName}</div>
    //   <div class="chapter-actions">
    //     <button onclick="startQuiz('${ch.chapterId}')">PYQ</button>
    //     <button onclick="startQuiz('${ch.chapterId}')">Practice</button>
    //     <button>Notes</button>
    //     <button>Analysis</button>
    //   </div>
    //   <div class="score-box">${ch.lastScore || "-"}</div>
    // `;
    row.innerHTML = `
  <div>${ch.chapterName}</div>
  <div class="chapter-actions">
    <button onclick="startQuiz('${ch.chapterId}')">PYQ</button>
    <button onclick="startQuiz('${ch.chapterId}')">Practice</button>
    <button onclick="openNotes('${ch.notesLink}')">Notes</button>
    <button>Analysis</button>
  </div>
  <div class="score-box">${ch.lastScore || "-"}</div>
`;

    container.appendChild(row);
  });
}
function openNotes(link) {
  if (!link) {
    alert("Notes not available");
    return;
  }
  window.open(link, "_blank");
}
function renderDonut(stats) {
  const ctx = document.getElementById("attemptChart");

  if (attemptChart) attemptChart.destroy();

  attemptChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Attempted", "Not Attempted"],
      datasets: [
        {
          data: [stats.attempted, stats.total - stats.attempted],
        },
      ],
    },
  });
}

function startQuiz(chapterId) {
  localStorage.setItem("chapterId", chapterId);
  window.location.href = "quiz.html";
}
